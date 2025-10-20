

let currentUtterance = null;
let currentSpeakButton = null;
let scrollTimeout;
// Scrolling state flags used by touch and wheel handlers
let isScrolling = false;
let touchStartY = 0;

// VersÃ£o de depuraÃ§Ã£o com logs detalhados



async function translateText(text, from, to) {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Translation API error: ' + res.status);
    const data = await res.json();
    // The response is a nested array, the translated text is in the first element
    if (data && data[0] && data[0][0] && data[0][0][0]) {
        return data[0].map(segment => segment[0]).join('');
    }
    return '';
}

async function roundTripSimplify(text) {
    const en = await translateText(text, 'pt', 'en');
    const pt = await translateText(en, 'en', 'pt');
    return pt;
}

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
    // const themeToggleButton = document.getElementById('theme-toggle');
    const immersiveModeBtn = document.getElementById('immersive-mode-btn');
    const audioPlayer = document.getElementById('fullscreen-audio');
    const playPauseBtn = document.getElementById('play-pause-btn');
    const musicSelect = document.getElementById('music-select');
    const musicToggleBtn = document.getElementById('music-toggle-btn');
    const exitFullscreenBtn = document.getElementById('exit-fullscreen-btn');

    if (exitFullscreenBtn) {
        exitFullscreenBtn.addEventListener('click', toggleFullscreen);
    }

    // Deep reading helpers: rain visual and sound
    let rainAudioCtx = null;
    let rainGain = null;
    const RAIN_DROP_COUNT = 60;

    function ensureRainOverlay() {
        let overlay = document.getElementById('rain-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'rain-overlay';
            overlay.className = 'rain-overlay';
            const app = document.querySelector('.app-container');
            if (app) app.prepend(overlay);
        }
        return overlay;
    }

    function startRainEffect() {
        const overlay = ensureRainOverlay();
        overlay.innerHTML = '';
        for (let i = 0; i < RAIN_DROP_COUNT; i++) {
            const drop = document.createElement('span');
            drop.className = 'raindrop';
            const left = Math.random() * 100; // vw percentage
            const duration = 1.6 + Math.random() * 1.8; // 1.6s - 3.4s
            const delay = Math.random() * 3; // 0 - 3s
            const skew = (Math.random() * 6 - 3); // -3 to 3 deg
            drop.style.left = left + 'vw';
            drop.style.animationDuration = duration + 's';
            drop.style.animationDelay = delay + 's';
            drop.style.transform = `skewX(${skew}deg)`;
            overlay.appendChild(drop);
        }
        document.body.classList.add('deep-reading-active');
    }

    function stopRainEffect() {
        const overlay = document.getElementById('rain-overlay');
        if (overlay) overlay.innerHTML = '';
        document.body.classList.remove('deep-reading-active');
    }

    function startRainSound() {
        if (rainAudioCtx) return;
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;
            rainAudioCtx = new AudioCtx();
            const sampleRate = rainAudioCtx.sampleRate;
            const length = sampleRate * 2; // 2 seconds loop
            const buffer = rainAudioCtx.createBuffer(1, length, sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < length; i++) {
                // White noise, lightly filtered feel (simple high roll-off)
                data[i] = (Math.random() * 2 - 1) * 0.5;
            }
            const src = rainAudioCtx.createBufferSource();
            src.buffer = buffer;
            src.loop = true;

            const biquad = rainAudioCtx.createBiquadFilter();
            biquad.type = 'lowpass';
            biquad.frequency.value = 2200; // soften the hiss

            rainGain = rainAudioCtx.createGain();
            rainGain.gain.value = 0.18;

            src.connect(biquad).connect(rainGain).connect(rainAudioCtx.destination);
            src.start();
        } catch (e) {
            console.warn('Rain sound not available:', e);
        }
    }

    function stopRainSound() {
        if (rainAudioCtx) {
            try { rainAudioCtx.close(); } catch(_) {}
            rainAudioCtx = null;
            rainGain = null;
        }
    }
    // Space ambience (canvas starfield)
    let spaceCtx = null;
    let spaceCanvas = null;
    let spaceAnim = null;
    let stars = [];

    function ensureSpaceCanvas() {
        if (!spaceCanvas) spaceCanvas = document.getElementById('space-canvas');
        return spaceCanvas;
    }

    function startSpaceEffect() {
        const canvas = ensureSpaceCanvas();
        if (!canvas) return;
        spaceCanvas = canvas;
        spaceCtx = spaceCanvas.getContext('2d');
        resizeSpaceCanvas();
        createStars();
        cancelAnimationFrame(spaceAnim);
        animateStars();
        document.body.classList.add('deep-reading-active');
    }

    function stopSpaceEffect() {
        cancelAnimationFrame(spaceAnim);
        if (spaceCtx && spaceCanvas) {
            spaceCtx.clearRect(0, 0, spaceCanvas.width, spaceCanvas.height);
        }
    }

    function resizeSpaceCanvas() {
        const c = ensureSpaceCanvas();
        if (!c) return;
        c.width = window.innerWidth;
        c.height = window.innerHeight;
    }
    window.addEventListener('resize', resizeSpaceCanvas);

    function createStars() {
        const c = ensureSpaceCanvas(); if (!c) return;
        const count = Math.min(300, Math.floor((c.width * c.height) / 6000));
        stars = new Array(count).fill(0).map(() => ({
            x: Math.random() * c.width,
            y: Math.random() * c.height,
            r: Math.random() * 1.4 + 0.2,
            a: Math.random(),
            tw: Math.random() * 0.02 + 0.005,
            vx: (Math.random() - 0.5) * 0.05,
            vy: 0.08 + Math.random() * 0.08,
        }));
    }

    function animateStars() {
        const c = ensureSpaceCanvas(); if (!c || !spaceCtx) return;
        const w = c.width, h = c.height;
        spaceCtx.clearRect(0, 0, w, h);
        // subtle nebula glow
        const g = spaceCtx.createRadialGradient(w*0.7, h*0.3, 50, w*0.7, h*0.3, Math.max(w,h));
        g.addColorStop(0, 'rgba(60,90,160,0.25)');
        g.addColorStop(1, 'rgba(10,13,21,0)');
        spaceCtx.fillStyle = g;
        spaceCtx.fillRect(0,0,w,h);

        spaceCtx.fillStyle = '#fff';
        for (const s of stars) {
            s.x += s.vx; s.y += s.vy; s.a += s.tw;
            if (s.y > h + 10) { s.y = -10; s.x = Math.random() * w; }
            const alpha = 0.5 + 0.5 * Math.sin(s.a);
            spaceCtx.globalAlpha = alpha;
            spaceCtx.beginPath();
            spaceCtx.arc(s.x, s.y, s.r, 0, Math.PI*2);
            spaceCtx.fill();
        }
        spaceCtx.globalAlpha = 1;
        spaceAnim = requestAnimationFrame(animateStars);
    }

    if (!readerContent) {
        console.error("FALHA CRÃTICA: #reader-content nÃ£o encontrado.");
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





    // Fullscreen logic (neutral entry; ambience applied separately)
    function toggleFullscreen() {
        const musicToggleBtn = document.getElementById('music-toggle-btn');
        const fullscreenAudio = document.getElementById('fullscreen-audio');
        const exitFullscreenBtn = document.getElementById('exit-fullscreen-btn');

        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            document.body.classList.add('fullscreen-active');
            // Neutral: no ambiance, show music toggle (user can choose), pause any playing
            musicToggleBtn.style.display = 'flex';
            exitFullscreenBtn.style.display = 'flex';
            try { fullscreenAudio.pause(); } catch(_) {}
            document.body.classList.add('deep-reading-active');
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
                document.body.classList.remove('fullscreen-active');
                musicToggleBtn.style.display = 'none';
                exitFullscreenBtn.style.display = 'none';
                try { fullscreenAudio.pause(); } catch(_) {}
                stopRainSound();
                stopRainEffect();
                try { stopSpaceEffect(); } catch(_) {}
                document.body.classList.remove('deep-reading-active');
            }
        }
    }

    const actionFullscreen = document.getElementById('action-fullscreen');
    // Ambient selection modal wiring
    const ambientModal = document.getElementById('ambient-modal');
    const ambientOverlay = document.getElementById('ambient-modal-overlay');
    const ambientConfirm = document.getElementById('ambient-confirm');
    const ambientClose = document.getElementById('ambient-close');
    let selectedAmbient = 'neutral';

    function openAmbientModal() {
        document.body.classList.add('ambient-visible');
        ambientModal?.setAttribute('aria-hidden', 'false');
        ambientOverlay?.setAttribute('aria-hidden', 'false');
        // reset selection to neutral
        const radios = document.querySelectorAll('input[name="ambient"]');
        radios.forEach(r => { if (r instanceof HTMLInputElement) r.checked = (r.value === 'neutral'); });
        selectedAmbient = 'neutral';
    }
    function closeAmbientModal() {
        document.body.classList.remove('ambient-visible');
        ambientModal?.setAttribute('aria-hidden', 'true');
        ambientOverlay?.setAttribute('aria-hidden', 'true');
    }
    function applyAmbient(kind) {
        const musicToggleBtn = document.getElementById('music-toggle-btn');
        const fullscreenAudio = document.getElementById('fullscreen-audio');
        const playIcon = document.querySelector('.play-music-icon');
        const pauseIcon = document.querySelector('.pause-music-icon');
        stopRainSound();
        stopRainEffect();
        try { stopSpaceEffect(); } catch(_) {}
        document.body.classList.remove('ambient-rain', 'ambient-space');

        if (kind === 'rain') {
            startRainEffect();
            startRainSound();
            document.body.classList.add('ambient-rain');
            if (musicToggleBtn) musicToggleBtn.style.display = 'none';
            try { fullscreenAudio.pause(); } catch(_) {}
        } else if (kind === 'space') {
            startSpaceEffect();
            document.body.classList.add('ambient-space');
            if (musicToggleBtn) musicToggleBtn.style.display = 'flex';
            try {
                fullscreenAudio.play();
                if (playIcon && pauseIcon) { playIcon.style.display = 'none'; pauseIcon.style.display = 'block'; }
            } catch(_) {}
        } else {
            // neutral
            if (musicToggleBtn) musicToggleBtn.style.display = 'flex';
            try {
                fullscreenAudio.pause();
                if (playIcon && pauseIcon) { playIcon.style.display = 'block'; pauseIcon.style.display = 'none'; }
            } catch(_) {}
        }
    }
    if (ambientOverlay) ambientOverlay.addEventListener('click', closeAmbientModal);
    if (ambientClose) ambientClose.addEventListener('click', closeAmbientModal);
    if (ambientConfirm) ambientConfirm.addEventListener('click', () => {
        closeAmbientModal();
        if (!document.fullscreenElement) toggleFullscreen();
        applyAmbient(selectedAmbient);
    });
    document.addEventListener('change', (e) => {
        const t = e.target; if (t && t instanceof HTMLInputElement && t.name === 'ambient') selectedAmbient = t.value;
    });
    if (actionFullscreen) {
        actionFullscreen.addEventListener('click', () => {
            closeActionSheet();
            if (!document.fullscreenElement) toggleFullscreen();
            openAmbientModal();
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




    // Read Aloud menu item removed (available on card and header)

    // Theme switcher logic
    const currentTheme = localStorage.getItem('theme') || 'light';
    document.body.setAttribute('data-theme', currentTheme);

    // Header theme toggle
    // themeToggleButton.addEventListener('click', () => {
    //     let newTheme = document.body.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    //     document.body.setAttribute('data-theme', newTheme);
    //     localStorage.setItem('theme', newTheme);
    //     const menuDarkToggle = document.getElementById('menu-dark-toggle');
    //     if (menuDarkToggle) menuDarkToggle.checked = (newTheme === 'dark');
    // });

    // Menu dark mode toggle (in action sheet)
    const menuDarkToggle = document.getElementById('menu-dark-toggle');
    if (menuDarkToggle) {
        menuDarkToggle.checked = (currentTheme === 'dark');
        menuDarkToggle.addEventListener('change', (e) => {
            const newTheme = e.target.checked ? 'dark' : 'light';
            document.body.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
        });
    }

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


    // Theme picker: 3 circles (default, tema1, tema2)
    function applyPaperTheme(choice) {
        if (choice === 'tema1') {
            document.body.style.backgroundImage = "url('assets/tema1.png')";
            document.body.style.backgroundRepeat = 'repeat';
            document.body.style.backgroundSize = 'auto';
        } else if (choice === 'tema2') {
            document.body.style.backgroundImage = "url('assets/tema2.png')";
            document.body.style.backgroundRepeat = 'repeat';
            document.body.style.backgroundSize = 'auto';
        } else {
            document.body.style.backgroundImage = '';
            document.body.style.backgroundRepeat = '';
            document.body.style.backgroundSize = '';
        }
        localStorage.setItem('paperTheme', choice);
        // Update UI selection state
        document.querySelectorAll('.theme-circle').forEach(btn => {
            btn.classList.toggle('selected', btn.dataset.themeChoice === choice);
            btn.setAttribute('aria-pressed', btn.dataset.themeChoice === choice ? 'true' : 'false');
        });
    }

    // Restore saved paper theme
    const savedPaperTheme = localStorage.getItem('paperTheme') || 'default';
    applyPaperTheme(savedPaperTheme);

    // Wire up theme circle buttons
    const themeButtons = document.querySelectorAll('.theme-circle');
    themeButtons.forEach((btn, index) => {
        btn.style.setProperty('--stagger-index', index + 1);
        btn.addEventListener('click', () => {
            applyPaperTheme(btn.dataset.themeChoice || 'default');
            closeActionSheet();
        });
    });



    const actionSheetCloseBtn = document.querySelector('.action-sheet-close-btn');
    if (actionSheetCloseBtn) {
        actionSheetCloseBtn.addEventListener('click', closeActionSheet);
    }



    let totalPages = 0;

    

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

        const currentPageIndex = getCurrentPageIndex();

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

        const currentPageIndex = getCurrentPageIndex();

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

    // FunÃ§Ãµes de UI (melhoradas)
    function openActionSheet() {
        actionSheetTrigger = document.activeElement;
        const actionSheet = document.getElementById('action-sheet');
        if (actionSheetOverlay && actionSheet) {
            actionSheetOverlay.classList.add('visible');
            actionSheet.classList.add('open');
            actionSheet.classList.add('peek');
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
            actionSheet.classList.remove('peek');
            actionSheet.setAttribute('aria-hidden', 'true');
            document.body.classList.remove('body-no-scroll');

            // Return focus to the trigger element
            if (actionSheetTrigger) {
                actionSheetTrigger.focus();
            }
        }
    }

    // Listeners bÃ¡sicos
    if (infoPanel) infoPanel.addEventListener('click', openActionSheet);
    if (actionSheetOverlay) actionSheetOverlay.addEventListener('click', closeActionSheet);

    // LÃ³gica principal
    try {
        console.log("[2] Iniciando fetch do livro de texto...");
        const bookPath = 'assets/memorias_postumas_final.txt';
        const response = await fetch(bookPath);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const text = await response.text();
        console.log("[3] Arquivo .txt carregado.");

        // Evita reprocessar o livro na mesma sessÃ£o
        if (!window.__bookCache) {
            await processAndDisplayBook(text, bookPath);
            window.__bookCache = true;
        }
        console.log("[4] Processamento do livro concluÃ­do.");

    } catch (error) {
        console.error("[ERRO] Falha no bloco de inicializaÃ§Ã£o:", error);
        readerContent.innerHTML = '<p style="text-align: center; padding-top: 50%;">Ocorreu um erro ao carregar o livro.</p>';
    }
}

async function processAndDisplayBook(text, bookPath) {
    console.log("[5] Entrou em processAndDisplayBook com texto.");
    const readerContent = document.getElementById('reader-content');
    readerContent.innerHTML = '<div class="loading-container"><div class="loading-dot"></div><div class="loading-dot"></div><div class="loading-dot"></div></div>';

    // ForÃ§a uma reflow para garantir que a animaÃ§Ã£o de carregamento seja renderizada.
    await new Promise(resolve => requestAnimationFrame(resolve));
    await new Promise(resolve => setTimeout(resolve, 0)); // Cede ao loop de eventos

    try {
        const book = buildBookFromText(text, bookPath);
        console.log("[8] Livro processado a partir do texto. Chamando interleaveBooksIntoScreens.");
        interleaveBooksIntoScreens([book]); // interleave espera um array de livros
    } catch (error) {
        console.error("[ERRO] Falha em processAndDisplayBook:", error);
    }
}

function buildBookFromText(text, filePath) {
    console.log("[6] Entrou em buildBookFromText.");
    
    const paragraphs = text.split(/\n\s*\n/);
    const chunks = [];

    for (const paragraph of paragraphs) {
        const trimmedParagraph = paragraph.trim();
        if (!trimmedParagraph) continue;

        // Chapter marker: lines beginning with '### ' become a dedicated chapter chunk
        const chapterMatch = trimmedParagraph.match(/^###\s+(.+?)\s*$/);
        if (chapterMatch) {
            const chapterTitle = chapterMatch[1].trim();
            chunks.push({ type: 'chapter', title: chapterTitle });
            continue;
        }

        const pageChunks = splitIntoSmartChunks(trimmedParagraph);
        chunks.push(...pageChunks.map(ct => ({ type: 'text', content: ct })));
    }
    
    const rawName = filePath.split('/').pop().replace(/\.txt$/i, '').replace(/_/g, ' ');
    const title = rawName.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    console.log(`[7] Processamento de texto concluído. Total de chunks: ${chunks.length}`);
    return { name: title, chunks };
}

function splitIntoSmartChunks(text) {
    const clean = text.replace(/\s+/g, ' ').trim();
    const sentences = clean.match(/[^.!?]+[.!?]+/g) || [];

    // If no sentences with punctuation are found, treat the whole text as a chunk.
    if (sentences.length === 0 && clean.length > 0) {
        return [clean];
    }

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

// Simple, offline rules-based Portuguese simplifier
function simplifyTextRules(text) {
    let out = text;
    const rules = [
        [/\bvossa merc[Ãªe]\b/gi, 'vocÃª'],
        [/\bvossemec[Ãªe]\b/gi, 'vocÃª'],
        [/\bhei de\b/gi, 'vou'],
        [/\bcousa\b/gi, 'coisa'],
        [/\bdeveras\b/gi, 'realmente'],
        [/\bassaz\b/gi, 'bastante'],
        [/\bporventura\b/gi, 'talvez'],
        [/\bd'outra\b/gi, 'de outra'],
    ];
    for (const [re, rep] of rules) out = out.replace(re, rep);
    // Normalize spaces and spaces before punctuation
    out = out.replace(/\s+/g, ' ').replace(/\s([,.;:!?])/g, '$1').trim();
    return out;
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

    const infoTitle = document.getElementById('info-title');
    let coverImage = 'assets/book2.svg'; // Using the svg from the carousel
    let bookTitle = book.name;

    if (infoTitle) {
        infoTitle.textContent = bookTitle;
    }

    const totalChunks = book.chunks.length;

    for (const [index, chunk] of book.chunks.entries()) {
        pageCounter++;
        const screen = document.createElement('div');
        screen.className = 'page share-card';
        
        const content = document.createElement('div');
        content.className = 'page-content share-card-content';

        // Render chapter markers (### Title) as dedicated cover cards after the book cover
        if (index > 0 && chunk && chunk.type === 'chapter') {
            content.classList.add('cover-card', 'chapter-cover');
            const title = chunk.title || '';
            content.innerHTML = `
                <div class="chapter-cover-inner">
                    <div class="chapter-eyebrow">Capítulo</div>
                    <h2 class="chapter-title">${title}</h2>
                </div>`;
            screen.appendChild(content);
            readerContent.appendChild(screen);
            continue;
        }

        if (index === 0) {
            content.classList.add('cover-card');
            content.innerHTML = '';
            content.style.backgroundImage = `url('${coverImage}')`;
            content.style.backgroundSize = 'cover';
            content.style.backgroundPosition = 'center';
            content.style.backgroundRepeat = 'no-repeat';
        } else if (index === 1) {
            content.innerHTML = `<p class="remarkable-sentence">${chunk.content}</p>`;
        } else {
            const chunkText = chunk.content.trim();
            const match = chunkText.match(/^(\S+)(.*)$/s);
            const fw = match ? match[1] : chunkText;
            const rest = match ? match[2] : '';
            const percentage = Math.round((pageCounter / totalChunks) * 100);

            content.innerHTML = `
                <div class="share-card-body"><span class="first-word">${fw}</span>${rest}</div>
                <div class="share-card-footer">
                    <span class="share-card-page">${percentage}%</span>
                    <button class="speak-button" aria-label="Read aloud">
                        <svg class="speak-icon play-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
                        <svg class="speak-icon pause-icon" style="display: none;" viewBox="0 0 24 24"><path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                    </button>
                </div>`;
        }
        
        // Create a "Simplificar" button and group actions to the right
        (function setupSimplifyButton() {
            const footerEl = content.querySelector('.share-card-footer');
            const speakBtn = content.querySelector('.speak-button');
            const bodyEl = content.querySelector('.share-card-body');
            if (!footerEl || !speakBtn || !bodyEl) return;

            // Wrap actions
            const actions = document.createElement('div');
            actions.className = 'share-card-actions';
            footerEl.replaceChild(actions, speakBtn);

            // Create simplify button
            const simplifyBtn = document.createElement('button');
            simplifyBtn.className = 'simplify-button';
            simplifyBtn.setAttribute('aria-label', 'Simplificar texto');
            simplifyBtn.setAttribute('title', 'Simplificar');
            simplifyBtn.textContent = 'Aa';

            actions.appendChild(simplifyBtn);
            actions.appendChild(speakBtn);

            // Round-trip translation toggle with caching
            const originalHTML = bodyEl.innerHTML;
            const originalText = bodyEl.textContent.trim();
            const cacheKey = `rt-simple:${book.name || 'book'}:${index}`;
            let isSimplified = false;

            function decorateFirstWord(text) {
                const m = text.match(/^(\S+)(.*)$/s);
                const fw = m ? m[1] : text;
                const rest = m ? m[2] : '';
                return `<span class="first-word">${fw}</span>${rest}`;
            }

            async function applySimplify() {
                try {
                    simplifyBtn.classList.add('loading');
                    simplifyBtn.textContent = 'Aa…';
                    const cached = localStorage.getItem(cacheKey);
                    const simplifiedText = cached || await roundTripSimplify(originalText);
                    bodyEl.innerHTML = decorateFirstWord(simplifiedText);
                    if (!cached) localStorage.setItem(cacheKey, simplifiedText);
                    isSimplified = true;
                    simplifyBtn.classList.add('active');
                    simplifyBtn.setAttribute('aria-pressed', 'true');
                    simplifyBtn.title = 'Mostrar original';
                } catch (e) {
                    console.error('Falha na simplificação:', e);
                    alert('Não foi possível simplificar agora. Verifique a conexão/configuração de tradução.');
                } finally {
                    simplifyBtn.classList.remove('loading');
                    simplifyBtn.textContent = 'Aa';
                }
            }

            simplifyBtn.addEventListener('click', async () => {
                if (!isSimplified) {
                    await applySimplify();
                } else {
                    bodyEl.innerHTML = originalHTML;
                    isSimplified = false;
                    simplifyBtn.classList.remove('active');
                    simplifyBtn.setAttribute('aria-pressed', 'false');
                    simplifyBtn.title = 'Simplificar';
                }
            });
        })();

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

    console.log(`[10] RenderizaÃ§Ã£o concluÃ­da. ${pageCounter} cards adicionados ao DOM.`);
    loadProgress();
}


function getCurrentPageIndex() {
    const readerContentDiv = document.getElementById('reader-content');
    const pages = document.querySelectorAll('.page');
    if (pages.length === 0) return 0;

    // Use nearest offsetTop instead of dividing by height to avoid
    // drift from margins/gaps accumulating over many pages.
    const scrollTop = readerContentDiv.scrollTop;
    let closestIndex = 0;
    let closestDelta = Infinity;
    for (let i = 0; i < pages.length; i++) {
        const delta = Math.abs(pages[i].offsetTop - scrollTop);
        if (delta < closestDelta) {
            closestDelta = delta;
            closestIndex = i;
        }
    }
    return closestIndex;
}

function saveProgress() {
    const pageIndex = getCurrentPageIndex();
    localStorage.setItem('readingProgress', pageIndex);
}


function loadProgress() {
    const savedPageIndex = localStorage.getItem('readingProgress');
    if (savedPageIndex !== null) {
        const readerContentDiv = document.getElementById('reader-content');
        const pages = document.querySelectorAll('.page');
        const idx = Math.min(parseInt(savedPageIndex, 10) || 0, Math.max(0, pages.length - 1));
        if (pages.length > 0) {
            readerContentDiv.scrollTop = pages[idx].offsetTop;
            updatePageNumber(idx + 1, pages.length);
        }
    }
}

// Garante que o app sÃ³ rode depois que todos os recursos, incluindo pdf.js, forem carregrados.
window.onload = init;





