// Update bottom info panel title and subtitle
function updateInfoPanel() {
    if (infoTitle) infoTitle.textContent = documentTitle ? documentTitle.textContent : '';
    if (infoSubtitle) infoSubtitle.textContent = `Page ${currentPageNum} of ${totalPages || 1}`;
}

// Slide-up action sheet helpers
function openActionSheet() {
    if (!actionSheet || !actionSheetOverlay) return;
    actionSheet.classList.add('open');
    actionSheet.setAttribute('aria-hidden', 'false');
    actionSheetOverlay.style.display = 'block';
}

function closeActionSheet() {
    if (!actionSheet || !actionSheetOverlay) return;
    actionSheet.classList.remove('open');
    actionSheet.setAttribute('aria-hidden', 'true');
    actionSheetOverlay.style.display = 'none';
}

// Initialize PDF.js
// Set the worker source
if (typeof pdfjsLib !== 'undefined') {
  try {
    // Try to use the worker for better performance
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  } catch (e) {
    console.warn('Failed to load PDF.js worker, falling back to main thread', e);
    // Fallback to main thread if worker fails to load
    pdfjsLib.GlobalWorkerOptions.workerSrc = null;
    pdfjsLib.disableWorker = true;
  }
}

// Heuristic: identify Table of Contents/summary-like pages
function isLikelyTOC(text) {
    if (!text) return false;
    const lower = text.toLowerCase();
    const keywords = [
        'table of contents', 'contents', 'summary', 'index',
        'sumário', 'sumario', 'índice', 'indice', 'conteúdo', 'conteudo'
    ];
    if (keywords.some(k => lower.includes(k))) return true;
    // Dot leaders and page-number heavy lines are typical in TOC
    const dotLeader = /\.{4,}/.test(text);
    const manyNumbers = (text.match(/\b\d{1,3}\b/g) || []).length >= 8;
    return dotLeader || manyNumbers;
}

// Detect the start index of the first chapter heading within text, or -1 if not found
function findChapterStartIndex(text, pageNumber = 1) {
    if (!text) return -1;
    // Ignore potential matches on early pages or TOC-like pages
    const minPage = getMinChapterPage();
    if (pageNumber < minPage) return -1;
    if (isLikelyTOC(text)) return -1;

    const patterns = [
        /\bchapter\s+(\d+|[ivxlcdm]+|one|two|three|four|five|six|seven|eight|nine|ten)\b/i,
        /\bcap[ií]tulo\s+(\d+|[ivxlcdm]+|um|dois|tr[eê]s|quatro|cinco|seis|sete|oito|nove|dez)\b/i
    ];
    for (const re of patterns) {
        const m = text.match(re);
        if (m && m.index !== undefined) return m.index;
    }
    return -1;
}

// Build a book object from a PDF File
async function buildBookFromFile(file) {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    // Extract cover from first page
    let coverDataUrl = '';
    try {
        const firstPage = await pdf.getPage(1);
        const v = firstPage.getViewport({ scale: 0.5 });
        const canvas = document.createElement('canvas');
        canvas.width = Math.floor(v.width);
        canvas.height = Math.floor(v.height);
        await firstPage.render({ canvasContext: canvas.getContext('2d'), viewport: v }).promise;
        coverDataUrl = canvas.toDataURL('image/jpeg', 0.8);
    } catch (e) {
        console.warn('Failed to extract cover:', e);
    }

    // Extract chunks per page
    const chunks = [];
    const numPages = pdf.numPages;
    let foundChapterStart = !shouldSkipFrontMatter();
    for (let p = 1; p <= numPages; p++) {
        try {
            const page = await pdf.getPage(p);
            let textItems = '';
            try {
                const textContent = await page.getTextContent({ normalizeWhitespace: true, disableCombineTextItems: false });
                textItems = textContent.items.map(it => it.str).join(' ').trim();
            } catch {}

            if (!foundChapterStart) {
                // Try to locate the first chapter heading in this page
                const cutIndex = findChapterStartIndex(textItems, p);
                if (cutIndex >= 0) {
                    foundChapterStart = true;
                    textItems = textItems.slice(cutIndex); // include from chapter heading onward
                } else {
                    // Still in front matter, skip this page entirely
                    continue;
                }
            }

            if (textItems && textItems.length > 0) {
                const pageChunks = splitIntoSmartChunks(textItems, { sentencesPerChunk: 2, minChars: 120, maxChars: 350 });
                for (const ct of pageChunks) {
                    chunks.push({ type: 'text', content: ct });
                }
            } else {
                // canvas chunk
                if (foundChapterStart) {
                    const scale = 1.25;
                    const v = page.getViewport({ scale });
                    const canvas = document.createElement('canvas');
                    canvas.width = Math.floor(v.width);
                    canvas.height = Math.floor(v.height);
                    await page.render({ canvasContext: canvas.getContext('2d'), viewport: v }).promise;
                    const imgUrl = canvas.toDataURL('image/jpeg', 0.85);
                    chunks.push({ type: 'image', content: imgUrl });
                } // else still front matter image, skip
            }
        } catch (err) {
            console.warn('Page parse failed:', err);
        }
    }

    return {
        name: file.name.replace(/\.pdf$/i, ''),
        cover: coverDataUrl,
        chunks
    };
}

// Append additional PDFs and re-interleave
async function processAdditionalFiles(files) {
    try {
        const capacity = Math.max(0, 4 - booksState.length);
        const intake = Array.from(files).slice(0, capacity);
        for (const file of intake) {
            const book = await buildBookFromFile(file);
            booksState.push(book);
        }
        interleaveBooksIntoScreens(booksState);
        documentTitle.textContent = booksState.map(b => b.name).join(' • ');
    } catch (e) {
        console.error('Error adding PDFs:', e);
        alert('Error adding PDFs. Please try again.');
    }
}

// New: Process multiple files (up to 4), build chunks per book, then interleave
async function processMultipleFiles(files) {
    try {
        console.log('[processMultipleFiles] starting with files:', files.map(f => f.name));
        if (typeof pdfjsLib === 'undefined') {
            throw new Error('PDF.js (pdfjsLib) is not loaded');
        }
        uploadScreen.classList.add('active');
        readerScreen.classList.remove('active');
        dropZone.innerHTML = '<div class="loading">Processing PDFs...</div>';

        // Prepare structures per book
        const books = [];
        for (const file of files) {
            console.log('[processMultipleFiles] building book for', file.name);
            const book = await buildBookFromFile(file);
            console.log('[processMultipleFiles] built book', book && book.name, 'chunks:', book && book.chunks && book.chunks.length);
            books.push(book);
        }

        // Interleave chunks round-robin across books
        booksState = books.slice(0, 4);
        interleaveBooksIntoScreens(booksState);

        // Switch to reader view
        uploadScreen.classList.remove('active');
        readerScreen.classList.add('active');

        // Update recent docs (store first only for now)
        if (books[0]) {
            currentDocument = {
                name: books.map(b => b.name).join(' + '),
                lastOpened: new Date().toISOString(),
                pages: [], currentPage: 1, progress: 0
            };
            saveToRecentDocuments(currentDocument);
        }
    } catch (error) {
        console.error('Error processing PDFs:', error && (error.stack || error.message || error));
        const msg = (error && (error.message || error.toString())) || 'Unknown error';
        alert('Error processing PDFs: ' + msg + '\nAttempting single-file mode with the first PDF...');
        try {
            if (files && files.length > 0) {
                await processFile(files[0]);
                return;
            }
        } catch (singleErr) {
            console.error('Single-file fallback failed:', singleErr && (singleErr.stack || singleErr.message || singleErr));
        }
        location.reload();
    }
}

function interleaveBooksIntoScreens(books) {
    // Reset content
    readerContent.innerHTML = '';
    pages = [];
    totalPages = 0;
    currentPageNum = 1;
    totalPagesEl.textContent = '0';
    documentTitle.textContent = books.length === 1 ? books[0].name : books.map(b => b.name).join(' • ');

    // Round-robin until all chunks exhausted
    const positions = books.map(() => 0);
    let remaining = books.reduce((sum, b) => sum + b.chunks.length, 0);
    while (remaining > 0) {
        for (let i = 0; i < books.length; i++) {
            const pos = positions[i];
            const book = books[i];
            if (pos >= book.chunks.length) continue;
            const chunk = book.chunks[pos];
            positions[i]++;
            remaining--;

            // Create screen
            const screen = document.createElement('div');
            screen.className = 'page';

            const content = document.createElement('div');

            if (chunk.type === 'text') {
                // Use share-card layout and first-word styling
                screen.className = 'page share-card';
                content.className = 'page-content share-card-content';
                const ct = String(chunk.content || '').trim();
                const match = ct.match(/^(\S+)([\s\S]*)$/);
                const fw = match ? match[1] : '';
                const rest = match ? match[2] : ct.slice(fw.length);
                const chunkIndex = pos;
                const chunks = book.chunks;
                const progressText = `Chunk ${chunkIndex + 1}/${chunks.length}`;
                const chunkText = ct.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
                content.innerHTML = `
                    <div class="share-card-body"><span class="first-word">${escapeHtml(fw)}</span>${escapeHtml(rest)}</div>
                    <div class="share-card-footer">
                        <span class="share-card-page">Pg. ${totalPages + 1}</span>
                        <button class="speak-button" aria-label="Read aloud" title="Read aloud">
                            <svg class="speak-icon" viewBox="0 0 24 24" width="20" height="20">
                                <path fill="currentColor" d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                            </svg>
                        </button>
                    </div>`;
                const speakButton = content.querySelector('.speak-button');
                if (speakButton) {
                    speakButton.addEventListener('click', (e) => {
                        e.stopPropagation();
                        toggleSpeech(chunkText, speakButton);
                    });
                }
            } else if (chunk.type === 'image') {
                content.className = 'page-content';
                const img = document.createElement('img');
                img.src = chunk.content;
                img.alt = 'Page';
                img.style.width = '100%';
                img.style.height = 'auto';
                content.appendChild(img);
            }

            // mark book name on screen for title updates
            screen.dataset.bookName = book.name;
            screen.appendChild(content);
            totalPages += 1;
            screen.dataset.pageNumber = String(totalPages);
            readerContent.appendChild(screen);
            pages[totalPages] = { element: screen, rendered: true };
        }
    }

    totalPagesEl.textContent = String(totalPages);
    pageIndicator.textContent = `Page ${currentPageNum} of ${totalPages}`;

    // Scroll to first
    setTimeout(() => {
        const first = document.querySelector('.page[data-page-number="1"]');
        if (first) {
            first.scrollIntoView({ behavior: 'auto', block: 'start' });
            updateProgress(1);
            updateNavigation();
            // set title to first screen's book
            const firstBook = first.dataset.bookName;
            if (firstBook) documentTitle.textContent = firstBook;
            updateInfoPanel();
        }
    }, 100);
}

// DOM Elements
const uploadScreen = document.getElementById('upload-screen');
const readerScreen = document.getElementById('reader-screen');
const fileInput = document.getElementById('file-input');
const browseBtn = document.getElementById('browse-btn');
const dropZone = document.getElementById('drop-zone');
const readerContent = document.getElementById('reader-content');
const progressBar = document.getElementById('progress-bar');
const progressText = document.getElementById('progress-text');
const documentTitle = document.getElementById('document-title');
const pageIndicator = document.getElementById('page-indicator');
const currentPageEl = document.getElementById('current-page');
const totalPagesEl = document.getElementById('total-pages');
const prevPageBtn = document.getElementById('prev-page');
const nextPageBtn = document.getElementById('next-page');
const settingsBtn = document.getElementById('settings-btn');
const settingsPanel = document.querySelector('.settings-panel');
const settingsMenu = document.getElementById('settings-menu');
const fontSizeInput = document.getElementById('font-size');
const lineHeightInput = document.getElementById('line-height');
const skipFrontMatterCheckbox = document.getElementById('skip-front-matter');
const minChapterPageInput = document.getElementById('min-chapter-page');
const minChapterPageDisplay = document.getElementById('min-chapter-page-display');
const recentDocsContainer = document.getElementById('recent-docs');
// Info panel elements (bottom polished panel)
const infoPanel = document.getElementById('info-panel');
const infoTitle = document.getElementById('info-title');
const infoSubtitle = document.getElementById('info-subtitle');
// Action sheet elements
const actionSheet = document.getElementById('action-sheet');
const actionSheetOverlay = document.getElementById('action-sheet-overlay');
// Header more menu elements
const moreMenuBtn = document.getElementById('more-menu-btn');
const moreMenu = document.getElementById('more-menu');
const actionAddPdfs = document.getElementById('action-add-pdfs');
const actionBgColor = document.getElementById('action-bg-color');
const actionBgImage = document.getElementById('action-bg-image');
const actionBgClear = document.getElementById('action-bg-clear');
const hiddenColorInput = document.getElementById('hidden-color-input');
const hiddenImageInput = document.getElementById('hidden-image-input');

// State
let currentPdf = null;
// We treat each text chunk (4 sentences) as a "page" (screen)
let currentPageNum = 1; // current screen number
let totalPages = 0;     // total screens (chunks), grows as we render
let pages = [];         // pages[screenNumber] = { element, rendered }
// Keep a global list of books for interleaving so we can append more later
let booksState = [];
let isScrolling = false;
let scrollTimeout = null;
let wheelCooldown = false;
let currentDocument = {
    name: '',
    lastOpened: null,
    pages: [],
    currentPage: 1,
    progress: 0
};

// Constants
const RECENT_DOCS_KEY = 'recentDocuments';
const MAX_RECENT_DOCS = 5;

// Touch swipe state
let touchStartX = 0;
let touchStartY = 0;
let touchActive = false;
const SWIPE_THRESHOLD_PX = 40; // min vertical movement to trigger
const SWIPE_HORIZONTAL_TOLERANCE_PX = 60; // ignore if too horizontal

// Initialize the app
function init() {
    console.log('Initializing app...');
    
    // Check if required elements exist
    if (!browseBtn) console.error('Browse button not found');
    if (!fileInput) console.error('File input not found');
    if (!dropZone) console.error('Drop zone not found');
    
    setupEventListeners();
    loadSettings();
    applyBackgroundFromSettings();
    loadRecentDocuments();
    // Initialize info panel with starting values
    updateInfoPanel();
    
    console.log('App initialized');
}

// Set up event listeners
function setupEventListeners() {
    // File input handling
    // Handle browse button click
    if (browseBtn && fileInput) {
        browseBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Create a new input element to ensure the change event fires every time
            const newInput = document.createElement('input');
            newInput.type = 'file';
            newInput.accept = '.pdf';
            newInput.style.display = 'none';
            
            newInput.addEventListener('change', (e) => {
                console.log('File input changed (dynamic)');
                if (newInput.files && newInput.files.length > 0) {
                    console.log('File selected (dynamic):', newInput.files[0].name);
                    // Transfer the file to the main file input
                    const dataTransfer = new DataTransfer();
                    dataTransfer.items.add(newInput.files[0]);
                    fileInput.files = dataTransfer.files;
                    
                    // Trigger the file processing
                    handleFileSelect(e).catch(error => {
                        console.error('Error handling file selection:', error);
                        alert('Error processing the file. Please try again.');
                    });
                }
                // Clean up
                document.body.removeChild(newInput);
            });
            
            // Add to body and trigger click
            document.body.appendChild(newInput);
            newInput.click();
        });
    }
    
    // Handle direct file input change (if user clicks the hidden input directly)
    if (fileInput) {
        fileInput.addEventListener('change', async (e) => {
            console.log('File input changed (direct)');
            const files = Array.from(e.target.files || []).slice(0, 4);
            if (files.length > 0) {
                console.log('Files selected (direct):', files.map(f => f.name));
                try {
                    await processMultipleFiles(files);
                } catch (error) {
                    console.error('Error handling file selection:', error);
                    alert('Error processing the file. Please try again.');
                }
            }
        });
    }
    
    // Drag and drop handling
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });
    
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, highlight, false);
    });
    
    // Allow clicking anywhere in the drop zone to open file picker
    if (dropZone && fileInput) {
        dropZone.addEventListener('click', (e) => {
            // Ignore clicks on actual controls that already handle file input
            const target = e.target;
            const isControl = target.id === 'browse-btn' || target.id === 'file-input' || target.closest('#browse-btn');
            if (isControl) return;
            fileInput.click();
        });
    }

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, unhighlight, false);
    });
    
    dropZone.addEventListener('drop', handleDrop, false);
    
    // Navigation
    prevPageBtn.addEventListener('click', goToPreviousPage);
    nextPageBtn.addEventListener('click', goToNextPage);
    
    // Settings
    settingsBtn.addEventListener('click', toggleSettings);
    fontSizeInput.addEventListener('input', updateFontSize);
    lineHeightInput.addEventListener('input', updateLineHeight);
    const darkModeToggle = document.getElementById('action-toggle-dark-mode');
    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', () => {
            const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
            document.documentElement.setAttribute('data-theme', isDarkMode ? 'light' : 'dark');
            saveSettings();
            closeActionSheet();
        });
    }
    if (minChapterPageInput && minChapterPageDisplay) {
        minChapterPageInput.addEventListener('input', () => {
            minChapterPageDisplay.textContent = String(minChapterPageInput.value);
        });
        minChapterPageInput.addEventListener('change', saveSettings);
    }
    
    // Handle scroll events for infinite scrolling
    readerContent.addEventListener('scroll', handleScroll);
    // Toggle more menu
    if (moreMenuBtn && moreMenu) {
        moreMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            moreMenu.style.display = moreMenu.style.display === 'none' || moreMenu.style.display === '' ? 'block' : 'none';
        });
        document.addEventListener('click', (e) => {
            if (moreMenu.style.display === 'block' && !moreMenu.contains(e.target) && e.target !== moreMenuBtn) {
                moreMenu.style.display = 'none';
            }
        });
    }
    // Open action sheet when tapping the info panel
    if (infoPanel) {
        infoPanel.addEventListener('click', () => {
            openActionSheet();
        });
    }
    // Close when overlay tapped
    if (actionSheetOverlay) {
        actionSheetOverlay.addEventListener('click', () => closeActionSheet());
    }
    // Close on Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && actionSheet && actionSheet.classList.contains('open')) {
            closeActionSheet();
        }
    });

    // Menu actions (now in action sheet)
    if (actionAddPdfs) {
        actionAddPdfs.addEventListener('click', (e) => {
            e.preventDefault();
            closeActionSheet();
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.pdf';
            input.multiple = true;
            input.style.display = 'none';
            input.addEventListener('change', async () => {
                const capacity = Math.max(0, 4 - booksState.length);
                const files = Array.from(input.files || []).slice(0, capacity);
                if (files.length > 0) {
                    await processAdditionalFiles(files);
                }
                document.body.removeChild(input);
            });
            document.body.appendChild(input);
            input.click();
        });
    }
    if (actionBgColor && hiddenColorInput) {
        actionBgColor.addEventListener('click', () => {
            moreMenu.style.display = 'none';
            hiddenColorInput.value = getBackgroundSettings().color || '#ffffff';
            hiddenColorInput.click();
        });
        hiddenColorInput.addEventListener('change', () => {
            const color = hiddenColorInput.value;
            const settings = getBackgroundSettings();
            settings.color = color;
            settings.image = '';
            setBackgroundSettings(settings);
            applyBackgroundFromSettings();
        });
    }
    if (actionBgImage && hiddenImageInput) {
        actionBgImage.addEventListener('click', () => {
            closeActionSheet();
            hiddenImageInput.click();
        });
        hiddenImageInput.addEventListener('change', () => {
            const file = (hiddenImageInput.files || [])[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
                const settings = getBackgroundSettings();
                settings.image = reader.result;
                setBackgroundSettings(settings);
                applyBackgroundFromSettings();
            };
            reader.readAsDataURL(file);
            hiddenImageInput.value = '';
        });
    }
    if (actionBgClear) {
        actionBgClear.addEventListener('click', () => {
            closeActionSheet();
            setBackgroundSettings({ color: '', image: '' });
            applyBackgroundFromSettings();
        });
    }
    // Debounced wheel-based paging (TikTok-like)
    readerContent.addEventListener('wheel', (e) => {
        if (wheelCooldown) return;
        if (Math.abs(e.deltaY) < 20) return; // ignore tiny scrolls
        wheelCooldown = true;
        if (e.deltaY > 0) {
            goToNextPage();
        } else {
            goToPreviousPage();
        }
        setTimeout(() => { wheelCooldown = false; }, 450);
    }, { passive: true });
    // Touch gestures for vertical swipe
    readerContent.addEventListener('touchstart', (e) => {
        if (!e.touches || e.touches.length === 0) return;
        const t = e.touches[0];
        touchStartX = t.clientX;
        touchStartY = t.clientY;
        touchActive = true;
    }, { passive: true });
    readerContent.addEventListener('touchmove', (e) => {
        // No-op: allow native scroll; we'll decide on end
    }, { passive: true });
    readerContent.addEventListener('touchend', (e) => {
        if (!touchActive) return;
        touchActive = false;
        const t = e.changedTouches && e.changedTouches[0];
        if (!t) return;
        const dx = t.clientX - touchStartX;
        const dy = t.clientY - touchStartY;
        // If gesture is too horizontal, ignore
        if (Math.abs(dx) > SWIPE_HORIZONTAL_TOLERANCE_PX) return;
        if (Math.abs(dy) < SWIPE_THRESHOLD_PX) return;
        if (dy < 0) {
            // swipe up -> next
            goToNextPage();
        } else {
            // swipe down -> prev
            goToPreviousPage();
        }
    }, { passive: true });
    
    // Handle keyboard navigation
    document.addEventListener('keydown', handleKeyDown);

    // Add more PDFs from reader screen
    if (addFilesBtn) {
        addFilesBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const newInput = document.createElement('input');
            newInput.type = 'file';
            newInput.accept = '.pdf';
            newInput.multiple = true;
            newInput.style.display = 'none';
            newInput.addEventListener('change', async () => {
                const capacity = Math.max(0, 4 - booksState.length);
                const files = Array.from(newInput.files || []).slice(0, capacity);
                if (files.length > 0) {
                    await processAdditionalFiles(files);
                }
                document.body.removeChild(newInput);
            });
            document.body.appendChild(newInput);
            newInput.click();
        });
    }
}

// Prevent default drag and drop behavior
function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

// Highlight drop zone when dragging over it
function highlight() {
    dropZone.style.borderColor = '#2563eb';
    dropZone.style.backgroundColor = 'rgba(37, 99, 235, 0.05)';
}

// Remove highlight from drop zone
function unhighlight() {
    dropZone.style.borderColor = '';
    dropZone.style.backgroundColor = '';
}

// Handle file selection via file input
async function handleFileSelect(e) {
    const files = Array.from(e.target.files || []).slice(0, 4);
    if (files.length) {
        try {
            await processMultipleFiles(files);
        } catch (error) {
            console.error('Error in handleFileSelect:', error);
            throw error; // Re-throw to be caught by the caller
        }
    }
}

// Handle file drop
async function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = Array.from(dt.files || [])
        .filter(f => f.type === 'application/pdf')
        .slice(0, 4);
    
    if (files.length > 0) {
        try {
            await processMultipleFiles(files);
        } catch (error) {
            console.error('Error processing dropped files:', error);
            alert('Error processing the dropped files. Please try again.');
        }
    }
}

// Process the uploaded PDF file
async function processFile(file) {
    try {
        // Show loading state
        dropZone.innerHTML = '<div class="loading">Processing PDF...</div>';
        
        // Read the file as ArrayBuffer
        const arrayBuffer = await file.arrayBuffer();
        
        // Load the PDF document
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        currentPdf = await loadingTask.promise;
        // We'll compute total screens dynamically while rendering
        totalPages = 0;
        
        // Update UI
        documentTitle.textContent = file.name.replace(/\.pdf$/i, '');
        totalPagesEl.textContent = '0';
        
        // Store document info
        currentDocument = {
            name: file.name,
            lastOpened: new Date().toISOString(),
            pages: [],
            currentPage: 1,
            progress: 0,
            fileSize: file.size,
            lastModified: file.lastModified
        };
        
        // Render the first few pages
        await renderPages();
        
        // Switch to reader view
        uploadScreen.classList.remove('active');
        readerScreen.classList.add('active');
        
        // Save to recent documents
        saveToRecentDocuments(currentDocument);
        
    } catch (error) {
        console.error('Error processing PDF:', error);
        alert('Error processing PDF. Please try another file.');
        location.reload();
    }
}

// Render all pages of the PDF into sentence-based chunks
async function renderPages() {
    if (!currentPdf) return;
    
    // Clear existing content
    readerContent.innerHTML = '';
    pages = [];
    totalPages = 0;
    currentPageNum = 1;
    totalPagesEl.textContent = '0';
    
    const numPages = currentPdf.numPages;
    let foundChapterStart = !shouldSkipFrontMatter();
    for (let i = 1; i <= numPages; i++) {
        await renderPage(i, { foundChapterStartRef: () => foundChapterStart, setFound: () => { foundChapterStart = true; } });
    }

    // After all cards are rendered, update each footer with accurate percentage
    const cards = readerContent.querySelectorAll('.share-card');
    cards.forEach(card => {
        const index = parseInt(card.dataset.pageNumber, 10);
        if (!isNaN(index) && totalPages > 0) {
            const perc = Math.round((index / totalPages) * 100);
            const footer = card.querySelector('.share-card-footer');
            if (footer) {
                footer.innerHTML = `<span class="share-card-page">Pg. ${index}</span><span class="share-card-progress">${perc}% read</span>`;
            }
        }
    });

    // Scroll to first screen
    setTimeout(() => {
        const pageElement = document.querySelector(`.page[data-page-number="1"]`);
        if (pageElement) {
            pageElement.scrollIntoView({ behavior: 'auto', block: 'start' });
            updateProgress(1);
            updateNavigation();
            if (pageElement.dataset.bookName) {
                documentTitle.textContent = pageElement.dataset.bookName;
            }
            // mark as current visually
            document.querySelectorAll('.page.current').forEach(el => el.classList.remove('current'));
            pageElement.classList.add('current');
            updateInfoPanel();
        }
    }, 100);
}

// Render a single page
async function renderPage(pageNumber, opts = {}) {
    try {
        const page = await currentPdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 1.5 });
        
        // Create page container
        const pageDiv = document.createElement('div');
        pageDiv.className = 'page';
        pageDiv.dataset.pageNumber = pageNumber;
        
        // Add book name attribute if available
        if (currentDocument && currentDocument.name) {
            pageDiv.dataset.bookName = currentDocument.name.replace(/\.pdf$/i, '');
        }
        
        // Extract text content with normalization
        let textItems = '';
        try {
            const textContent = await page.getTextContent({ normalizeWhitespace: true, disableCombineTextItems: false });
            textItems = textContent.items.map(item => item.str).join(' ').trim();
        } catch (err) {
            console.warn(`Text extraction failed for page ${pageNumber}:`, err);
        }

        // Handle front matter skipping (single-file flow)
        let foundChapterStart = opts.foundChapterStartRef ? opts.foundChapterStartRef() : true;
        if (!foundChapterStart) {
            const cutIndex = findChapterStartIndex(textItems, pageNumber);
            if (cutIndex >= 0) {
                if (opts.setFound) opts.setFound();
                foundChapterStart = true;
                textItems = textItems.slice(cutIndex);
            } else {
                // Skip entire page
                return null;
            }
        }

        if (textItems && textItems.length > 0) {
            // Split into coherent, shareable chunks (shorter)
            const chunks = splitIntoSmartChunks(textItems, { sentencesPerChunk: 2, minChars: 120, maxChars: 350 });
            for (const chunkText of chunks) {
                const chunkDiv = document.createElement('div');
                chunkDiv.className = 'page share-card';
                if (currentDocument && currentDocument.name) {
                    chunkDiv.dataset.bookName = currentDocument.name;
                }
                const contentDiv = document.createElement('div');
                contentDiv.className = 'share-card-content';
                
                // Create content wrapper
                const contentWrapper = document.createElement('div');
                contentWrapper.className = 'content-wrapper';
                
                // Split first word to style distinctly
                const match = String(chunkText).trim().match(/^(\S+)([\s\S]*)$/);
                const fw = match ? match[1] : '';
                const rest = match ? match[2] : String(chunkText).slice(fw.length);
                
                // Create card body with content
                const cardBody = document.createElement('div');
                cardBody.className = 'share-card-body';
                cardBody.innerHTML = `<span class="first-word">${escapeHtml(fw)}</span>${escapeHtml(rest)}`;
                
                // Calculate reading progress percentage
                const progressPercentage = Math.round(((totalPages + 1) / currentPdf.numPages) * 100);
                
                // Create footer with page number (percentage will be finalized after all cards render)
                const cardFooter = document.createElement('div');
                cardFooter.className = 'share-card-footer';
                cardFooter.innerHTML = `<span class="share-card-page">Pg. ${totalPages + 1}</span><span class="share-card-progress">0% read</span>`;
                
                // Create book name element
                const bookNameDiv = document.createElement('div');
                bookNameDiv.className = 'book-name';
                const bookName = currentDocument ? currentDocument.name.replace(/\.pdf$/i, '') : 'Untitled';
                bookNameDiv.textContent = `- ${bookName}`;
                console.log('Setting book name:', bookName); // Debug log
                
                // Assemble the card
                contentWrapper.appendChild(cardBody);
                contentWrapper.appendChild(cardFooter);
                contentDiv.appendChild(contentWrapper);
                contentDiv.appendChild(bookNameDiv);
                
                chunkDiv.appendChild(contentDiv);
                totalPages += 1;
                chunkDiv.dataset.pageNumber = String(totalPages);
                
                // Add the page to the reader
                readerContent.appendChild(chunkDiv);
                pages[totalPages] = { element: chunkDiv, rendered: true };
            }
        } else {
            // Fallback: render the whole PDF page to a canvas as a single share-card
            if (foundChapterStart) {
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                const scale = 1.25;
                const fallbackViewport = page.getViewport({ scale });
                canvas.width = Math.floor(fallbackViewport.width);
                canvas.height = Math.floor(fallbackViewport.height);
                const renderContext = { canvasContext: context, viewport: fallbackViewport };
                await page.render(renderContext).promise;

                const chunkDiv = document.createElement('div');
                chunkDiv.className = 'page share-card';
                if (currentDocument && currentDocument.name) {
                    chunkDiv.dataset.bookName = currentDocument.name;
                }

                const contentDiv = document.createElement('div');
                contentDiv.className = 'share-card-content';

                const contentWrapper = document.createElement('div');
                contentWrapper.className = 'content-wrapper';

                const cardBody = document.createElement('div');
                cardBody.className = 'share-card-body';
                cardBody.appendChild(canvas);

                const cardFooter = document.createElement('div');
                cardFooter.className = 'share-card-footer';
                // temporary percentage; accurate value set after full render
                cardFooter.innerHTML = `<span class="share-card-page">Pg. ${totalPages + 1}</span><span class="share-card-progress">0% read</span>`;

                const bookNameDiv = document.createElement('div');
                bookNameDiv.className = 'book-name';
                const bookName = currentDocument ? currentDocument.name.replace(/\.pdf$/i, '') : 'Untitled';
                bookNameDiv.textContent = `- ${bookName}`;

                contentWrapper.appendChild(cardBody);
                contentWrapper.appendChild(cardFooter);
                contentDiv.appendChild(contentWrapper);
                contentDiv.appendChild(bookNameDiv);

                chunkDiv.appendChild(contentDiv);

                totalPages += 1;
                chunkDiv.dataset.pageNumber = String(totalPages);
                readerContent.appendChild(chunkDiv);
                pages[totalPages] = { element: chunkDiv, rendered: true };
            } else {
                return null;
            }
        }
        
        // Update totals in UI
        totalPagesEl.textContent = String(totalPages);
        pageIndicator.textContent = `Page ${currentPageNum} of ${totalPages}`;
        
        return null;
    } catch (error) {
        console.error(`Error rendering page ${pageNumber}:`, error);
        return null;
    }
}

// Smart sentence segmentation and chunking for beautiful, shareable cards
function splitIntoSmartChunks(text, { sentencesPerChunk = 4, minChars = 200, maxChars = 800 } = {}) {
    if (!text) return [];
    // Normalize spaces
    const clean = text
        .replace(/\s+/g, ' ')
        .replace(/\s+([.,!?;:])/g, '$1')
        .trim();

    // Basic abbreviation list to avoid false splits (common EN + PT)
    const abbreviations = [
        'mr.', 'mrs.', 'ms.', 'dr.', 'prof.', 'sr.', 'sra.', 'srta.', 'vs.', 'etc.', 'e.g.', 'i.e.', 'p.ex.', 'ex.', 'no.', 'nº.', 'cap.', 'fig.'
    ];

    // Split by sentence end markers while keeping punctuation. Include !, ?, … and quotes
    let rawSentences = clean
        .split(/(?<=[.!?…])["')\]]*\s+/)
        .map(s => s.trim())
        .filter(Boolean);

    // Merge sentences that are actually abbreviations endings
    const sentences = [];
    for (let i = 0; i < rawSentences.length; i++) {
        const s = rawSentences[i];
        const prev = sentences[sentences.length - 1];
        const lowerPrev = prev ? prev.toLowerCase() : '';
        const endsWithAbbrev = abbreviations.some(ab => lowerPrev.endsWith(ab));
        if (prev && endsWithAbbrev) {
            sentences[sentences.length - 1] = prev + ' ' + s;
        } else {
            sentences.push(s);
        }
    }

    // Now build chunks respecting min/max chars and sentence counts
    const chunks = [];
    let buffer = '';
    let count = 0;
    for (let i = 0; i < sentences.length; i++) {
        const sentence = sentences[i];
        if (buffer.length === 0) {
            buffer = sentence;
            count = 1;
            continue;
        }

        // If adding the next sentence stays within maxChars or we haven't reached minChars/sentences yet, append it
        const wouldBe = buffer + ' ' + sentence;
        const needMoreForMin = buffer.length < minChars || count < Math.max(2, Math.floor(sentencesPerChunk / 2));
        if (wouldBe.length <= maxChars || needMoreForMin) {
            buffer = wouldBe;
            count += 1;
        } else {
            chunks.push(buffer.trim());
            buffer = sentence;
            count = 1;
        }
    }
    if (buffer) chunks.push(buffer.trim());

    return chunks;
}

// Simple HTML escaper for safe innerHTML injection of text content
function escapeHtml(str) {
    return String(str)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

// Update progress bar, text, and percentage
function updateProgress(currentPage) {
    const progress = Math.round((currentPage / totalPages) * 100);
    progressBar.style.width = `${progress}%`;
    progressText.textContent = `${progress}%`;
    currentPageEl.textContent = currentPage;
    pageIndicator.textContent = `Page ${currentPage} of ${totalPages}`;
    
    // Update progress percentage in page info
    const progressPercentage = document.querySelector('.progress-percentage');
    if (progressPercentage) {
        progressPercentage.textContent = `(${progress}%)`;
    }
    
    // Update current document progress
    if (currentDocument) {
        currentDocument.currentPage = currentPage;
        currentDocument.progress = progress;
        saveToRecentDocuments(currentDocument);
    }
}

// Handle scroll events for vertical navigation
function handleScroll() {
    if (isScrolling) return;
    
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
        const scrollPosition = readerContent.scrollTop + (readerContent.clientHeight / 2);
        const pageElements = document.querySelectorAll('.page');
        for (let i = 0; i < pageElements.length; i++) {
            const element = pageElements[i];
            const rect = element.getBoundingClientRect();
            const containerRect = readerContent.getBoundingClientRect();
            const elementMiddle = rect.top - containerRect.top + (rect.height / 2);
            if (elementMiddle >= 0 && elementMiddle <= readerContent.clientHeight) {
                const pageNumber = parseInt(element.dataset.pageNumber);
                if (pageNumber !== currentPageNum) {
                    currentPageNum = pageNumber;
                    updateProgress(currentPageNum);
                    updateNavigation();
                    loadAdjacentPages();
                    if (element.dataset.bookName) {
                        documentTitle.textContent = element.dataset.bookName;
                    }
                    updateInfoPanel();
                    // update visual current state
                    const prevCurrent = document.querySelector('.page.current');
                    if (prevCurrent) prevCurrent.classList.remove('current');
                    element.classList.add('current');
                }
                break;
            }
        }
    }, 100);
}

// Load adjacent pages as needed
function loadAdjacentPages() {
    if (!currentPdf) return;
    
    const startPage = Math.max(1, currentPageNum - 1);
    const endPage = Math.min(totalPages, currentPageNum + 3);
    
    for (let i = startPage; i <= endPage; i++) {
        if (!pages[i] || !pages[i].rendered) {
            renderPage(i);
        }
    }
}

// Update navigation buttons state
function updateNavigation() {
    prevPageBtn.disabled = currentPageNum <= 1;
    nextPageBtn.disabled = currentPageNum >= totalPages;
}

// Go to previous page
function goToPreviousPage() {
    if (currentPageNum > 1) {
        currentPageNum--;
        scrollToPage(currentPageNum);
    }
}

// Go to next page
function goToNextPage() {
    if (currentPageNum < totalPages) {
        currentPageNum++;
        scrollToPage(currentPageNum);
    }
}

// Scroll to specific page (vertical)
function scrollToPage(pageNumber) {
    const pageElement = document.querySelector(`.page[data-page-number="${pageNumber}"]`);
    if (pageElement) {
        isScrolling = true;
        pageElement.scrollIntoView({ behavior: 'auto', block: 'start' });
        updateProgress(pageNumber);
        updateNavigation();
        if (pageElement.dataset.bookName) {
            documentTitle.textContent = pageElement.dataset.bookName;
        }
        updateInfoPanel();
        const currentPageElement = document.querySelector(`.page[data-page-number="${currentPageNum}"]`);
        if (currentPageElement) {
            currentPageElement.classList.remove('current');
        }
        pageElement.classList.add('current');
        
        // Play page turn sound if it's a page change (not initial load)
        if (currentPageNum !== pageNumber) {
            const pageTurnSound = document.getElementById('pageTurnSound');
            if (pageTurnSound) {
                // Reset the audio to the beginning in case it's still playing
                pageTurnSound.currentTime = 0;
                // Play the sound
                pageTurnSound.play().catch(error => {
                    console.log('Autoplay prevented:', error);
                    // If autoplay was prevented, we'll try to play after a user interaction
                    const playAfterInteraction = () => {
                        pageTurnSound.play().catch(console.error);
                        document.removeEventListener('click', playAfterInteraction);
                    };
                    document.addEventListener('click', playAfterInteraction, { once: true });
                });
            }
        }
        
        // Update current page number
        currentPageNum = pageNumber;
        
        // Reset scrolling flag after animation
        setTimeout(() => {
            isScrolling = false;
        }, 500);
    }
}

// Handle keyboard navigation
function handleKeyDown(e) {
    if (!readerScreen.classList.contains('active')) return;
    
    switch (e.key) {
        case 'ArrowUp':
        case 'ArrowLeft':
        case 'PageUp':
        case 'k':
            e.preventDefault();
            goToPreviousPage();
            break;
            
        case 'ArrowDown':
        case 'ArrowRight':
        case 'PageDown':
        case 'j':
        case ' ':
            e.preventDefault();
            goToNextPage();
            break;
            
        case 'Home':
            e.preventDefault();
            currentPageNum = 1;
            scrollToPage(currentPageNum);
            break;
            
        case 'End':
            e.preventDefault();
            currentPageNum = totalPages;
            scrollToPage(currentPageNum);
            break;
    }
}

// Toggle settings panel
function toggleSettings() {
    settingsPanel.classList.toggle('active');
}

// Update font size
function updateFontSize() {
    const size = `${fontSizeInput.value}px`;
    document.documentElement.style.setProperty('--font-size', size);
    document.querySelectorAll('.page-content').forEach(el => {
        el.style.fontSize = size;
    });
    saveSettings();
}

// Update line height
function updateLineHeight() {
    const height = lineHeightInput.value;
    document.documentElement.style.setProperty('--line-height', height);
    document.querySelectorAll('.page-content').forEach(el => {
        el.style.lineHeight = height;
    });
    saveSettings();
}

// Save settings to localStorage
function saveSettings() {
    const settings = {
        fontSize: fontSizeInput.value,
        lineHeight: lineHeightInput.value,
        darkMode: document.documentElement.getAttribute('data-theme') === 'dark',
        skipFrontMatter: !!(skipFrontMatterCheckbox && skipFrontMatterCheckbox.checked),
        minChapterPage: minChapterPageInput ? parseInt(minChapterPageInput.value, 10) : 5
    };
    localStorage.setItem('pdfReaderSettings', JSON.stringify(settings));
}

// Load settings from localStorage
function loadSettings() {
    const savedSettings = localStorage.getItem('pdfReaderSettings');
    if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        
        if (settings.fontSize) {
            fontSizeInput.value = settings.fontSize;
            document.documentElement.style.setProperty('--font-size', `${settings.fontSize}px`);
        }
        
        if (settings.lineHeight) {
            lineHeightInput.value = settings.lineHeight;
            document.documentElement.style.setProperty('--line-height', settings.lineHeight);
        }
        
        if (settings.darkMode) {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.setAttribute('data-theme', 'light');
        }
        
        if (typeof settings.skipFrontMatter === 'boolean' && skipFrontMatterCheckbox) {
            skipFrontMatterCheckbox.checked = settings.skipFrontMatter;
        }
        if (typeof settings.minChapterPage === 'number' && minChapterPageInput && minChapterPageDisplay) {
            minChapterPageInput.value = String(settings.minChapterPage);
            minChapterPageDisplay.textContent = String(settings.minChapterPage);
        } else if (minChapterPageInput && minChapterPageDisplay) {
            // initialize display
            minChapterPageDisplay.textContent = String(minChapterPageInput.value);
        }
    }
}

function shouldSkipFrontMatter() {
    return !!(skipFrontMatterCheckbox && skipFrontMatterCheckbox.checked);
}

function getMinChapterPage() {
    if (minChapterPageInput) {
        const n = parseInt(minChapterPageInput.value, 10);
        return Number.isFinite(n) ? n : 5;
    }
    return 5;
}

// Save document to recent documents
function saveToRecentDocuments(doc) {
    if (!doc || !doc.name) return;
    
    let recentDocs = JSON.parse(localStorage.getItem(RECENT_DOCS_KEY) || '[]');
    
    // Check if document already exists in recent
    const existingDocIndex = recentDocs.findIndex(d => 
        d.name === doc.name && d.fileSize === doc.fileSize && d.lastModified === doc.lastModified
    );
    
    // Update existing or add new
    if (existingDocIndex >= 0) {
        recentDocs[existingDocIndex] = { ...recentDocs[existingDocIndex], ...doc };
    } else {
        recentDocs.unshift(doc);
    }
    
    // Limit to max recent documents
    recentDocs = recentDocs.slice(0, MAX_RECENT_DOCS);
    
    // Save to localStorage
    localStorage.setItem(RECENT_DOCS_KEY, JSON.stringify(recentDocs));
    
    // Update UI
    loadRecentDocuments();
}

// Load and display recent documents
function loadRecentDocuments() {
    const recentDocs = JSON.parse(localStorage.getItem(RECENT_DOCS_KEY) || '[]');
    
    if (recentDocs.length === 0) {
        recentDocsContainer.style.display = 'none';
        return;
    }
    
    recentDocsContainer.style.display = 'block';
    recentDocsContainer.innerHTML = '<h3>Recent Documents</h3>';
    
    recentDocs.forEach(doc => {
        const docElement = document.createElement('div');
        docElement.className = 'recent-doc';
        docElement.innerHTML = `
            <svg class="recent-doc-icon" viewBox="0 0 24 24" width="24" height="24">
                <path fill="currentColor" d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
            </svg>
            <div class="recent-doc-info">
                <div class="recent-doc-name">${doc.name}</div>
                <div class="recent-doc-date">${formatDate(doc.lastOpened)} • ${formatFileSize(doc.fileSize)}</div>
            </div>
        `;
        
        docElement.addEventListener('click', () => {
            // For demo purposes, we'll just show the document name
            // In a real app, you would load the document from storage
            alert(`Loading document: ${doc.name}\n\nIn a real implementation, this would load the document from storage.`);
        });
        
        recentDocsContainer.appendChild(docElement);
    });
}

// Format date for display
function formatDate(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

// Format file size for display
function formatFileSize(bytes) {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Text-to-speech functionality
let currentSpeech = null;

function stopSpeech() {
    if (currentSpeech) {
        window.speechSynthesis.cancel();
        currentSpeech = null;
    }
}

function toggleSpeech(text, button) {
    // If already speaking, stop
    if (currentSpeech) {
        stopSpeech();
        button.classList.remove('speaking');
        return;
    }

    // Create a new speech synthesis utterance
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Set default language to English
    utterance.lang = 'en-US';
    
    // Set voice properties
    const voices = window.speechSynthesis.getVoices();
    
    // First try to find a high-quality English voice
    let voice = voices.find(v => 
        v.lang.startsWith('en-') && 
        (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha'))
    );
    
    // If no high-quality English voice, find any English voice
    if (!voice) {
        voice = voices.find(v => v.lang.startsWith('en-'));
    }
    
    // If still no English voice, use the default system voice
    if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang; // Use the voice's language
    }
    
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Handle events
    utterance.onstart = () => {
        currentSpeech = utterance;
        button.classList.add('speaking');
    };

    utterance.onend = () => {
        if (currentSpeech === utterance) {
            currentSpeech = null;
            button.classList.remove('speaking');
        }
    };

    utterance.onerror = (event) => {
        console.error('SpeechSynthesis error:', event);
        button.classList.remove('speaking');
        currentSpeech = null;
    };

    // Stop any current speech and start the new one
    stopSpeech();
    window.speechSynthesis.speak(utterance);
}

// Initialize speech synthesis voices when they become available
let voices = [];
function loadVoices() {
    voices = window.speechSynthesis.getVoices();
    
    // Log available voices for debugging
    if (voices.length > 0) {
        console.log('Available voices:');
        voices.forEach(voice => {
            console.log(`${voice.name} (${voice.lang}) - ${voice.default ? 'Default' : ''}`);
        });
    }
}

// Color options for the shuffle feature
const colorPalette = [
    '#e6f2ff', // Light blue
    '#fff9e6', // Light yellow
    '#ffebf3', // Light pink
    '#f0f9eb', // Light green
    '#f3e6ff', // Light purple
    '#ffe6e6', // Light red
    '#e6ffe6', // Mint green
    '#fff2e6', // Peach
    '#e6f7ff', // Ice blue
    '#f9f2ff'  // Lavender
];

// Simple color change functionality
function initColorPicker() {
    // List of nice light colors
    const colors = [
        '#f8f9fa', // Light gray
        '#e9ecef', // Lighter gray
        '#e6f2ff', // Light blue
        '#e6ffe6', // Mint green
        '#fff2e6', // Light peach
        '#fff0f6', // Light pink
        '#f8f0ff', // Light purple
        '#e6f7ff', // Ice blue
        '#f0fff4', // Light mint
        '#feffea'  // Light yellow
    ];
    
    // Get a random color
    function getRandomColor() {
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    // Apply color to cards
    function applyColorToCards(color) {
        const cards = document.querySelectorAll('.share-card-content, .card, [class*="card-"], [class*="Card"]');
        console.log(`Found ${cards.length} card elements to update with color: ${color}`);
        
        cards.forEach(card => {
            card.style.backgroundColor = color;
            card.style.setProperty('background-color', color, 'important');
        });
        
        document.documentElement.style.setProperty('--card-bg', color);
        localStorage.setItem('cardColor', color);
    }
    
    // Initialize color shuffle button
    function initColorShuffle() {
        const shuffleButtons = document.querySelectorAll('.color-shuffle');
        console.log('Initializing color shuffle buttons:', shuffleButtons.length);
        
        shuffleButtons.forEach(button => {
            // Remove any existing event listeners
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
            
            // Add click handler
            newButton.addEventListener('click', function(e) {
                e.stopPropagation();
                const newColor = getRandomColor();
                console.log('Shuffling to color:', newColor);
                applyColorToCards(newColor);
                
                // Add a quick animation on click
                const circle = this.querySelector('.color-circle');
                if (circle) {
                    circle.style.transform = 'scale(0.8)';
                    setTimeout(() => {
                        circle.style.transform = 'scale(1.1)';
                        setTimeout(() => {
                            circle.style.transform = 'scale(1)';
                        }, 100);
                    }, 100);
                }
            });
            
            // Initial color if none is set
            if (!localStorage.getItem('cardColor')) {
                applyColorToCards(getRandomColor());
            } else {
                // Apply saved color
                const savedColor = localStorage.getItem('cardColor');
                if (savedColor) {
                    applyColorToCards(savedColor);
                }
            }
        });
    }
    
    // Initialize color change buttons
    function initColorChangeButtons() {
        const buttons = document.querySelectorAll('.color-change-btn');
        buttons.forEach(button => {
            button.addEventListener('click', function(e) {
                e.stopPropagation();
                const newColor = getRandomColor();
                const card = this.closest('.share-card-content');
                if (card) {
                    card.style.backgroundColor = newColor;
                    // Also update the CSS variable
                    document.documentElement.style.setProperty('--card-bg', newColor);
                    // Save the color
                    localStorage.setItem('cardColor', newColor);
                }
            });
        });
        
        // Apply saved color if exists
        const savedColor = localStorage.getItem('cardColor');
        if (savedColor) {
            document.documentElement.style.setProperty('--card-bg', savedColor);
            const cards = document.querySelectorAll('.share-card-content');
            cards.forEach(card => {
                card.style.backgroundColor = savedColor;
            });
        }
    }
    
    // Run initialization
    initColorChangeButtons();
    
    function setupColorPicker() {
        const colorOptions = document.querySelectorAll('.color-option');
        console.log('Found color options:', colorOptions.length);
        
        if (colorOptions.length === 0) {
            console.log('No color options found in the DOM yet');
            return false;
        }
        
        // Load saved color preference
        const savedColor = localStorage.getItem('cardColor') || '#ffffff';
        console.log('Loading saved color:', savedColor);
        
        // Apply the saved color immediately
        applyColorToCards(savedColor);
        
        // Set up event listeners for each color option
        colorOptions.forEach(option => {
            // Remove any existing event listeners by cloning the element
            const newOption = option.cloneNode(true);
            option.parentNode.replaceChild(newOption, option);
            
            // Set active state
            if (newOption.dataset.color === savedColor) {
                newOption.classList.add('active');
            } else {
                newOption.classList.remove('active');
            }
            
            // Add click handler
            newOption.addEventListener('click', function(e) {
                e.stopPropagation();
                const color = this.dataset.color;
                console.log('Color selected:', color);
                
                // Update active state
                colorOptions.forEach(opt => opt.classList.remove('active'));
                this.classList.add('active');
                
                // Apply the color
                applyColorToCards(color);
            });
        });
        
        return true;
    }
    
    // Try to set up immediately
    if (!setupColorPicker()) {
        console.log('Color picker not ready, setting up observer...');
        
        // If color options aren't in the DOM yet, set up a mutation observer
        const observer = new MutationObserver((mutations, obs) => {
            console.log('DOM mutation observed, checking for color picker...');
            if (setupColorPicker()) {
                console.log('Color picker initialized successfully');
                obs.disconnect();
            }
        });
        
        // Start observing the settings panel for changes
        const settingsPanel = document.getElementById('settings-menu') || document.body;
        observer.observe(settingsPanel, {
            childList: true,
            subtree: true
        });
        
        // Set a timeout to stop observing after 10 seconds
        setTimeout(() => {
            observer.disconnect();
            console.log('Observer disconnected after timeout');
        }, 10000);
    }
    
    // Also set up when settings panel is opened
    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            console.log('Settings button clicked, initializing color picker...');
            setTimeout(() => {
                setupColorPicker();
            }, 100);
        });
    }
}

// Function to initialize the app
function initializeApp() {
    init();
    
    // Initialize color picker when settings panel is opened
    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            // Small delay to ensure the panel is visible
            setTimeout(initColorPicker, 50);
        });
    }
    
    // Also try to initialize immediately
    initColorPicker();
    
    // Load voices when they change (some browsers load them asynchronously)
    if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
        loadVoices();
    }
}

// Initialize the app when the DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

// Expose key functions globally (some environments/cache can cause scope issues)
window.buildBookFromFile = buildBookFromFile;
window.processMultipleFiles = processMultipleFiles;
window.processAdditionalFiles = processAdditionalFiles;
