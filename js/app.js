

let currentUtterance = null;
let currentSpeakButton = null;
let isScrolling = false;
let scrollTimeout;

// Versão de depuração com logs detalhados

async function init() {
    if ('speechSynthesis' in window) {
        speechSynthesis.onvoiceschanged = () => {
            const voices = speechSynthesis.getVoices();
            console.log("Available voices:", voices);
        };
    } else {
        console.log("Speech Synthesis not supported");
    }
    console.log("[1] App iniciado.");

    const readerContent = document.getElementById('reader-content');
    const infoPanel = document.getElementById('info-panel');
    const actionSheetOverlay = document.getElementById('action-sheet-overlay');
    const themeToggleButton = document.getElementById('theme-toggle');
    const immersiveModeBtn = document.getElementById('immersive-mode-btn');
    const audioPlayer = document.getElementById('fullscreen-audio');
    const playPauseBtn = document.getElementById('play-pause-btn');
    const musicSelect = document.getElementById('music-select');
    const musicToggleBtn = document.getElementById('music-toggle-btn');
    const exitFullscreenBtn = document.getElementById('exit-fullscreen-btn');

    if (exitFullscreenBtn) {
        exitFullscreenBtn.addEventListener('click', toggleFullscreen);
    }

    if (!readerContent) {
        console.error("FALHA CRÍTICA: #reader-content não encontrado.");
        return;
    }

    // Music toggle logic
    musicToggleBtn.addEventListener('click', () => {
        const playIcon = document.querySelector('.play-music-icon');
        const pauseIcon = document.querySelector('.pause-music-icon');

        if (audioPlayer.paused) {
            audioPlayer.play();
            playIcon.style.display = 'none';
            pauseIcon.style.display = 'block';
        } else {
            audioPlayer.pause();
            playIcon.style.display = 'block';
            pauseIcon.style.display = 'none';
        }
    });





    // Fullscreen logic
    function toggleFullscreen() {
        const musicToggleBtn = document.getElementById('music-toggle-btn');
        const fullscreenAudio = document.getElementById('fullscreen-audio');
        const exitFullscreenBtn = document.getElementById('exit-fullscreen-btn');

        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            document.body.classList.add('fullscreen-active');
            musicToggleBtn.style.display = 'flex';
            exitFullscreenBtn.style.display = 'flex';
            fullscreenAudio.play();
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
                document.body.classList.remove('fullscreen-active');
                musicToggleBtn.style.display = 'none';
                exitFullscreenBtn.style.display = 'none';
                fullscreenAudio.pause();
            }
        }
    }

    const actionFullscreen = document.getElementById('action-fullscreen');

    if (actionFullscreen) {
        actionFullscreen.addEventListener('click', () => {
            toggleFullscreen();
            closeActionSheet(); // Close the sheet after activating
        });
    }

    const actionRestart = document.getElementById('action-restart');
    if (actionRestart) {
        actionRestart.addEventListener('click', () => {
            const readerContentDiv = document.getElementById('reader-content');
            readerContentDiv.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
            closeActionSheet();
        });
    }




    const actionReadAloud = document.getElementById('action-read-aloud');
    if (actionReadAloud) {
        actionReadAloud.addEventListener('click', () => {
            if (speechSynthesis.speaking) {
                speechSynthesis.cancel();
            } else {
                const pageIndex = getCurrentPageIndex();
                const pages = document.querySelectorAll('.page');
                if (pages.length > 0 && pageIndex < pages.length) {
                    const currentPage = pages[pageIndex];
                    const textToSpeak = currentPage.querySelector('.share-card-body').textContent;
                    currentUtterance = new SpeechSynthesisUtterance(textToSpeak);
                    currentUtterance.lang = 'pt-BR';
                    speechSynthesis.speak(currentUtterance);
                }
            }
            closeActionSheet();
        });
    }

    // Theme switcher logic
    const currentTheme = localStorage.getItem('theme') || 'light';
    document.body.setAttribute('data-theme', currentTheme);

    themeToggleButton.addEventListener('click', () => {
        let newTheme = document.body.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
        document.body.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    });

    // Navigation buttons logic
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            navButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
        });
    });

    // Scroll logic
    const readerContentDiv = document.getElementById('reader-content');


    const actionThemeDark = document.getElementById('action-theme-dark');
    if (actionThemeDark) {
        actionThemeDark.addEventListener('click', () => {
            document.body.classList.add('dark-theme');
            document.body.classList.remove('light-theme');
            closeActionSheet();
        });
    }

    const actionThemeLight = document.getElementById('action-theme-light');
    if (actionThemeLight) {
        actionThemeLight.addEventListener('click', () => {
            document.body.classList.add('light-theme');
            document.body.classList.remove('dark-theme');
            closeActionSheet();
        });
    }

    const actionThemeDefault = document.getElementById('action-theme-default');
    if (actionThemeDefault) {
        actionThemeDefault.addEventListener('click', () => {
            document.body.classList.remove('dark-theme', 'light-theme');
            closeActionSheet();
        });
    }

    const actionSheetCloseBtn = document.querySelector('.action-sheet-close-btn');
    if (actionSheetCloseBtn) {
        actionSheetCloseBtn.addEventListener('click', closeActionSheet);
    }



    let totalPages = 0;

    readerContentDiv.addEventListener('click', (event) => {
        if (event.target.classList.contains('share-card-page')) {
            const totalPages = document.querySelectorAll('.page').length;
            const pageIndicator = event.target;
            const displayMode = pageIndicator.dataset.displayMode || 'page';
            const currentPageText = pageIndicator.textContent;
            const currentPageMatch = currentPageText.match(/\d+/);
            if (!currentPageMatch) return;

            const currentPage = parseInt(currentPageMatch[0], 10);

            if (displayMode === 'page') {
                const percentage = Math.round((currentPage / totalPages) * 100);
                pageIndicator.textContent = `${percentage}%`;
                pageIndicator.dataset.displayMode = 'percentage';
            } else {
                pageIndicator.textContent = `Pág. ${currentPage}`;
                pageIndicator.dataset.displayMode = 'page';
            }
        }
    });

    readerContentDiv.addEventListener('touchstart', (event) => {
        touchStartY = event.touches[0].clientY;
    });

    readerContentDiv.addEventListener('touchmove', (event) => {
        event.preventDefault();
    }, { passive: false });

    readerContentDiv.addEventListener('touchend', (event) => {
        if (isScrolling) return;

        const touchEndY = event.changedTouches[0].clientY;
        const swipeDistance = touchEndY - touchStartY;

        if (Math.abs(swipeDistance) < 50) return; // Ignore small swipes

        const pages = document.querySelectorAll('.page');
        if (pages.length === 0) return;

        const pageHeight = pages[0].offsetHeight;
        const currentPageIndex = Math.floor(readerContentDiv.scrollTop / pageHeight);

        let targetPage;
        if (swipeDistance < 0) {
            // Swiping up (scrolling down)
            targetPage = pages[Math.min(currentPageIndex + 1, pages.length - 1)];
        } else {
            // Swiping down (scrolling up)
            targetPage = pages[Math.max(currentPageIndex - 1, 0)];
        }

        if (targetPage) {
            isScrolling = true;
            readerContentDiv.scrollTo({
                top: targetPage.offsetTop,
                behavior: 'smooth'
            });
            saveProgress();

            const pages = document.querySelectorAll('.page');
            const newIndex = Array.from(pages).indexOf(targetPage);
            updatePageNumber(newIndex + 1, pages.length);

            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                isScrolling = false;
            }, 1000); // Adjust timeout to match scroll behavior
        }
    });

    readerContentDiv.addEventListener('wheel', (event) => {
        event.preventDefault();
        if (isScrolling) return;

        const pages = document.querySelectorAll('.page');
        if (pages.length === 0) return;

        const pageHeight = pages[0].offsetHeight;
        const currentPageIndex = Math.floor(readerContentDiv.scrollTop / pageHeight);

        let targetPage;
        if (event.deltaY > 0) {
            // Scrolling down
            targetPage = pages[Math.min(currentPageIndex + 1, pages.length - 1)];
        } else {
            // Scrolling up
            targetPage = pages[Math.max(currentPageIndex - 1, 0)];
        }

        if (targetPage) {
            isScrolling = true;
            readerContentDiv.scrollTo({
                top: targetPage.offsetTop,
                behavior: 'smooth'
            });
            saveProgress();

            const pages = document.querySelectorAll('.page');
            const newIndex = Array.from(pages).indexOf(targetPage);
            updatePageNumber(newIndex + 1, pages.length);

            scrollTimeout = setTimeout(() => {
                isScrolling = false;
            }, 1000); // Adjust timeout to match scroll behavior
        }
    });

    // Set stagger index for action sheet items
    const actionSheetItems = document.querySelectorAll('.action-sheet-item');
    actionSheetItems.forEach((item, index) => {
        item.style.setProperty('--stagger-index', index);
    });

    // Swipe to close action sheet
    let actionSheetTouchStartY = 0;
    let actionSheetTouchMoveY = 0;
    const actionSheet = document.getElementById('action-sheet');

    if(actionSheet) {
        actionSheet.addEventListener('touchstart', (e) => {
            actionSheetTouchStartY = e.touches[0].clientY;
        });

        actionSheet.addEventListener('touchmove', (e) => {
            actionSheetTouchMoveY = e.touches[0].clientY;
        });

        actionSheet.addEventListener('touchend', () => {
            if (actionSheetTouchMoveY > actionSheetTouchStartY + 50) { // Swipe down by 50px
                closeActionSheet();
            }
            // Reset values
            actionSheetTouchStartY = 0;
            actionSheetTouchMoveY = 0;
        });
    }

    let actionSheetTrigger = null;

    // Funções de UI (melhoradas)
    function openActionSheet() {
        actionSheetTrigger = document.activeElement;
        const actionSheet = document.getElementById('action-sheet');
        if (actionSheetOverlay && actionSheet) {
            actionSheetOverlay.classList.add('visible');
            actionSheet.classList.add('open');
            actionSheet.setAttribute('aria-hidden', 'false');
            document.body.classList.add('body-no-scroll');

            // Focus on the first focusable element in the action sheet
            const firstFocusable = actionSheet.querySelector('button');
            if (firstFocusable) {
                firstFocusable.focus();
            }
        }
    }

    function closeActionSheet() {
        document.activeElement.blur();
        const actionSheet = document.getElementById('action-sheet');
        if (actionSheetOverlay && actionSheet) {
            actionSheetOverlay.classList.remove('visible');
            actionSheet.classList.remove('open');
            actionSheet.setAttribute('aria-hidden', 'true');
            document.body.classList.remove('body-no-scroll');

            // Return focus to the trigger element
            if (actionSheetTrigger) {
                actionSheetTrigger.focus();
            }
        }
    }

    // Listeners básicos
    if (infoPanel) infoPanel.addEventListener('click', openActionSheet);
    if (actionSheetOverlay) actionSheetOverlay.addEventListener('click', closeActionSheet);

    // Lógica principal
    try {
        console.log("[2] Iniciando fetch do PDF...");
        const response = await fetch('assets/Memórias Postumas de Brás Cubas - PDF_removed.pdf');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        console.log("[3] Fetch do PDF concluído com sucesso.");

        const blob = await response.blob();
        const file = new File([blob], 'Memórias Postumas de Brás Cubas - PDF_removed.pdf', { type: 'application/pdf' });
        console.log("[4] Objeto File criado a partir do blob.");

        await processAndDisplayBook([file]);

    } catch (error) {
        console.error("[ERRO] Falha no bloco de inicialização:", error);
        readerContent.innerHTML = '<p style="text-align: center; padding-top: 50%;">Ocorreu um erro ao carregar o livro.</p>';
    }
}

async function processAndDisplayBook(files) {
    console.log("[5] Entrou em processAndDisplayBook.");
    const readerContent = document.getElementById('reader-content');
    readerContent.innerHTML = '<p style="text-align: center; padding-top: 50%;">Processando PDF...</p>';
    
    try {
        const books = [];
        for (const file of files) {
            const book = await buildBookFromFile(file);
            books.push(book);
        }
        console.log("[8] Todos os livros processados. Chamando interleaveBooksIntoScreens.");
        interleaveBooksIntoScreens(books);
    } catch (error) {
        console.error("[ERRO] Falha em processAndDisplayBook:", error);
    }
}

async function buildBookFromFile(file) {
    console.log("[6] Entrou em buildBookFromFile.");
    const arrayBuffer = await file.arrayBuffer();
    
    // Configuração do worker do PDF.js
    if (typeof pdfjsLib !== 'undefined') {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }

    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    console.log(`[7] PDF carregado pela pdfjsLib. Total de páginas: ${pdf.numPages}`);

    const chunks = [];
    for (let p = 1; p <= pdf.numPages; p++) {
        try {
            const page = await pdf.getPage(p);
            const textContent = await page.getTextContent({ normalizeWhitespace: true });
            const textItems = textContent.items.map(it => it.str).join(' ').trim();

            if (p === 1) {
                chunks.push({ type: 'text', content: textItems });
            } else if (p === 2) {
                chunks.push({ type: 'text', content: textItems });
            } else if (textItems) {
                const pageChunks = splitIntoSmartChunks(textItems);
                chunks.push(...pageChunks.map(ct => ({ type: 'text', content: ct })));
            }
        } catch (err) {
            console.warn(`Falha ao processar página ${p}:`, err);
        }
    }
    console.log(`[7.1] Processamento de páginas concluído. Total de chunks: ${chunks.length}`);
    return { name: file.name.replace(/\.pdf$/i, ''), chunks };
}

function splitIntoSmartChunks(text) {
    const clean = text.replace(/\s+/g, ' ').trim();
    const sentences = clean.match(/[^.!?]+[.!?]+/g) || [];
    const chunks = [];
    let currentChunk = '';

    for (const sentence of sentences) {
        if (currentChunk.length + sentence.length > 250 && currentChunk.length > 0) {
            chunks.push(currentChunk.trim());
            currentChunk = '';
        }
        currentChunk += sentence + ' ';
    }
    if (currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
    }
    return chunks;
}

function updatePageNumber(currentPage, totalPages) {
    const infoSubtitle = document.getElementById('info-subtitle');
    if (infoSubtitle) {
        infoSubtitle.textContent = `Page ${currentPage} of ${totalPages}`;
    }
}

function interleaveBooksIntoScreens(books) {
    console.log("[9] Entrou em interleaveBooksIntoScreens para renderizar os cards.");
    const readerContent = document.getElementById('reader-content');
    readerContent.innerHTML = '';
    let pageCounter = 0;

    const book = books[0];
    if (!book || !book.chunks) {
        console.error("Nenhum chunk encontrado para renderizar.");
        return;
    }

    for (const [index, chunk] of book.chunks.entries()) {
        pageCounter++;
        const screen = document.createElement('div');
        screen.className = 'page share-card';
        
        const content = document.createElement('div');
        content.className = 'page-content share-card-content';

        if (index === 0) {
            content.innerHTML = `<h1 class="book-title">${chunk.content}</h1>`;
        } else if (index === 1) {
            content.innerHTML = `<p class="remarkable-sentence">${chunk.content}</p>`;
        } else {
            const chunkText = chunk.content.trim();
            const match = chunkText.match(/^(\S+)(.*)$/s);
            const fw = match ? match[1] : chunkText;
            const rest = match ? match[2] : '';

            content.innerHTML = `
                <div class="share-card-body"><span class="first-word">${fw}</span>${rest}</div>
                <div class="share-card-footer">
                    <span class="share-card-page">Pág. ${pageCounter}</span>
                    <button class="speak-button" aria-label="Read aloud">
                        <svg class="speak-icon play-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
                        <svg class="speak-icon pause-icon" style="display: none;" viewBox="0 0 24 24"><path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                    </button>
                </div>`;
        }
        
        const speakButton = content.querySelector('.speak-button');

        if (speakButton) {
            speakButton.addEventListener('click', () => {
                const textToSpeak = content.textContent;
                const playIcon = speakButton.querySelector('.play-icon');
                const pauseIcon = speakButton.querySelector('.pause-icon');

                if (speechSynthesis.speaking && currentUtterance && currentUtterance.text === textToSpeak) {
                    // Currently speaking the same text, so stop it
                    speechSynthesis.cancel();
                    playIcon.style.display = 'block';
                    pauseIcon.style.display = 'none';
                } else {
                    speechSynthesis.cancel(); // Cancel any previous speech
                    // Not speaking, or speaking different text, or paused on different text

                    // Reset icon of previously speaking button, if any
                    if (currentSpeakButton && currentSpeakButton !== speakButton) {
                        currentSpeakButton.querySelector('.play-icon').style.display = 'block';
                        currentSpeakButton.querySelector('.pause-icon').style.display = 'none';
                    }

                    currentUtterance = new SpeechSynthesisUtterance(textToSpeak);
                    currentUtterance.lang = 'pt-BR';

                    currentUtterance.onend = () => {
                        playIcon.style.display = 'block';
                        pauseIcon.style.display = 'none';
                        currentUtterance = null;
                        currentSpeakButton = null;
                        isPaused = false;
                        console.log('Speech ended, isPaused set to false');
                    };

                    currentUtterance.onpause = () => {
                        playIcon.style.display = 'block';
                        pauseIcon.style.display = 'none';
                    };

                    currentUtterance.onresume = () => {
                        playIcon.style.display = 'none';
                        pauseIcon.style.display = 'block';
                    };

                    speechSynthesis.speak(currentUtterance);
                    currentSpeakButton = speakButton;
                    playIcon.style.display = 'none';
                    pauseIcon.style.display = 'block';
                }
            });
        }

        screen.appendChild(content);
        readerContent.appendChild(screen);
    }

    totalPages = document.querySelectorAll('.page').length;
    updatePageNumber(1, totalPages);

    console.log(`[10] Renderização concluída. ${pageCounter} cards adicionados ao DOM.`);
    loadProgress();
}


function getCurrentPageIndex() {
    const readerContentDiv = document.getElementById('reader-content');
    const pages = document.querySelectorAll('.page');
    if (pages.length === 0) return 0;
    const pageHeight = pages[0].offsetHeight;
    return Math.floor(readerContentDiv.scrollTop / pageHeight);
}

function saveProgress() {
    const pageIndex = getCurrentPageIndex();
    localStorage.setItem('readingProgress', pageIndex);
}


function loadProgress() {
    const savedPageIndex = localStorage.getItem('readingProgress');
    if (savedPageIndex) {
        const readerContentDiv = document.getElementById('reader-content');
        const pages = document.querySelectorAll('.page');
        if (pages.length > 0) {
            const pageHeight = pages[0].offsetHeight;
            const scrollTop = parseInt(savedPageIndex, 10) * pageHeight;
            readerContentDiv.scrollTop = scrollTop;
        }
    }
}

// Garante que o app só rode depois que todos os recursos, incluindo pdf.js, forem carregrados.
window.onload = init;