

let currentUtterance = null;
let currentSpeakButton = null;
let scrollTimeout;
// Scrolling state flags used by touch and wheel handlers
let isScrolling = false;
let touchStartY = 0;
const CLUB_GROUP_LINK = 'https://chat.whatsapp.com/SEU_GRUPO';

// PWA install prompt handling
let __deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
    try {
        e.preventDefault();
        __deferredPrompt = e;
        if (!localStorage.getItem('__installDismissed') && !localStorage.getItem('__installInstalled')) {
            showInstallToast();
        }
    } catch (_) {}
});
window.addEventListener('appinstalled', () => {
    try {
        localStorage.setItem('__installInstalled', '1');
        hideInstallToast();
    } catch (_) {}
});

// VersÃƒÂ£o de depuraÃƒÂ§ÃƒÂ£o com logs detalhados



async function translateText(text, from, to) {
    const hlParam = (to && typeof to === 'string' && to.toLowerCase().startsWith('pt')) ? '&hl=pt-BR' : '';
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(text)}${hlParam}`;
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
    try {
        // Prefer Brazilian Portuguese
        const ptbr = await translateText(en, 'en', 'pt-BR');
        return ptbr;
    } catch (_) {
        // Fallback to generic Portuguese
        const pt = await translateText(en, 'en', 'pt');
        return pt;
    }
}

// --- i18n helpers (global) ---
const PT_FIXES = [
    ['CapÃ­tulo', 'Capítulo'],
    ['ClÃ¡ssico', 'Clássico'],
    ['EsaÃº', 'Esaú'],
    ['JacÃ³', 'Jacó'],
    ['PÃ´ster', 'Pôster'],
    ['Marcaâ€‘pÃ¡ginas', 'Marca-páginas'],
    ['Marca-pÃ¡ginas', 'Marca-páginas'],
    ['EspaÃ§o', 'Espaço'],
    ['mÃªs', 'mês'],
    ['Quase lÃ¡', 'Quase lá'],
    ['prÃ³ximos', 'próximos'],
    ['capÃ­tulos', 'capítulos'],
    ['NÃ£o', 'Não'],
    ['nÃºmero', 'número'],
    ['VocÃª', 'Você'],
    ['conexÃ£o', 'conexão'],
    ['configuraÃ§Ã£o', 'configuração'],
    ['RenderizaÃ§Ã£o', 'Renderização'],
    [' Ã  ', ' à '],
    ['rÃ¡pido', 'rápido'],
    ['Ã—', '×']
];

function normalizePortuguese(str) {
    let out = str;
    for (const [from, to] of PT_FIXES) out = out.replaceAll(from, to);
    return out;
}

function fixMojibake(rootEl) {
    try {
        const walker = document.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT, null);
        const nodes = [];
        while (walker.nextNode()) nodes.push(walker.currentNode);
        for (const n of nodes) {
            const fixed = normalizePortuguese(n.nodeValue);
            if (fixed !== n.nodeValue) n.nodeValue = fixed;
        }
    } catch (_) {}
}

async function init() {
    // Normalize common mojibake sequences to proper pt-BR accents
    const PT_FIXES = [
        ['CapÃ­tulo', 'Capítulo'],
        ['ClÃ¡ssico', 'Clássico'],
        ['EsaÃº', 'Esaú'],
        ['JacÃ³', 'Jacó'],
        ['Ãš', 'Ú'],
        ['PÃ´ster', 'Pôster'],
        ['Marcaâ€‘pÃ¡ginas', 'Marca-páginas'],
        ['Marca-pÃ¡ginas', 'Marca-páginas'],
        ['EspaÃ§o', 'Espaço'],
        ['mÃªs', 'mês'],
        ['Quase lÃ¡', 'Quase lá'],
        ['prÃ³ximos', 'próximos'],
        ['capÃ­tulos', 'capítulos'],
        ['NÃ£o', 'Não'],
        ['nÃºmero', 'número'],
        ['VocÃª', 'Você'],
        ['conexÃ£o', 'conexão'],
        ['configuraÃ§Ã£o', 'configuração'],
        ['RenderizaÃ§Ã£o', 'Renderização'],
        [' Ã  ', ' à '],
        ['rÃ¡pido', 'rápido']
    ];
    function normalizePortuguese(str) {
        let out = str;
        for (const [from, to] of PT_FIXES) out = out.replaceAll(from, to);
        return out;
    }
    function fixMojibake(rootEl) {
        try {
            const walker = document.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT, null);
            const nodes = [];
            while (walker.nextNode()) nodes.push(walker.currentNode);
            for (const n of nodes) {
                const fixed = normalizePortuguese(n.nodeValue);
                if (fixed !== n.nodeValue) n.nodeValue = fixed;
            }
        } catch (_) {}
    }
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

    // Maybe show install toast (iOS hint or Android prompt captured)
    try {
        const isiOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
        if (!localStorage.getItem('__installDismissed') && !localStorage.getItem('__installInstalled')) {
            if (isiOS && !isStandalone) {
                showInstallToast(true); // hint mode
            }
        }
    } catch (_) {}

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
        console.error("FALHA CRÃƒÂTICA: #reader-content nÃƒÂ£o encontrado.");
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


    // Theme picker: 4 circles (default, tema1, tema3, tema4)
    function applyPaperTheme(choice) {
        document.body.setAttribute('data-paper-theme', choice);
        localStorage.setItem('paperTheme', choice);
        // Update UI selection state
        document.querySelectorAll('.theme-circle').forEach(btn => {
            btn.classList.toggle('selected', btn.dataset.themeChoice === choice);
            btn.setAttribute('aria-pressed', btn.dataset.themeChoice === choice ? 'true' : 'false');
        });
    }

    // Restore saved paper theme (park removed; space migrated to tema3; fallback to default if unknown)
    const allowedPaperThemes = new Set(['default','tema1','tema3','tema4']);
    let savedPaperTheme = localStorage.getItem('paperTheme') || 'default';
    if (savedPaperTheme === 'space') {
        savedPaperTheme = 'tema3';
        try { localStorage.setItem('paperTheme', 'tema3'); } catch(_) {}
    }
    if (!allowedPaperThemes.has(savedPaperTheme)) {
        savedPaperTheme = 'default';
        try { localStorage.setItem('paperTheme', 'default'); } catch(_) {}
    }
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

    // FunÃƒÂ§ÃƒÂµes de UI (melhoradas)
    function openActionSheet() {
        actionSheetTrigger = document.activeElement;
        const actionSheet = document.getElementById('action-sheet');
        if (actionSheetOverlay && actionSheet) {
            // Populate chapter list on open
            if (typeof renderChapterList === 'function') {
                renderChapterList();
            }
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
        const chapterSheet = document.getElementById('chapter-sheet');
        if (actionSheetOverlay && actionSheet) {
            actionSheetOverlay.classList.remove('visible');
            actionSheet.classList.remove('open');
            actionSheet.classList.remove('peek');
            actionSheet.setAttribute('aria-hidden', 'true');
            document.body.classList.remove('body-no-scroll');

            if (chapterSheet) {
                chapterSheet.classList.remove('open');
                chapterSheet.classList.remove('peek');
                chapterSheet.setAttribute('aria-hidden', 'true');
            }

            // Return focus to the trigger element
            if (actionSheetTrigger) {
                actionSheetTrigger.focus();
            }
        }
    }

    // Listeners bÃƒÂ¡sicos
    if (infoPanel) infoPanel.addEventListener('click', openActionSheet);
    // Header "Temas" button opens action sheet and scrolls to theme section
    const headerThemesBtn = document.getElementById('header-themes-btn');
    if (headerThemesBtn) {
        headerThemesBtn.addEventListener('click', () => {
            try { openActionSheet(); } catch(_) {}
            setTimeout(() => {
                const as = document.getElementById('action-sheet');
                const inner = as?.querySelector('.action-sheet-inner');
                const target = as?.querySelector('.theme-options');
                if (inner && target) {
                    const top = target.getBoundingClientRect().top - inner.getBoundingClientRect().top;
                    inner.scrollTo({ top: Math.max(top - 12, 0), behavior: 'smooth' });
                }
            }, 60);
        });
    }
    if (actionSheetOverlay) actionSheetOverlay.addEventListener('click', closeActionSheet);

    // Open nested chapter sheet
    const actionChaptersBtn = document.getElementById('action-chapters');
    if (actionChaptersBtn) {
        actionChaptersBtn.addEventListener('click', () => {
            const chapterSheetEl = document.getElementById('chapter-sheet');
            const actionSheetEl = document.getElementById('action-sheet');
            if (!chapterSheetEl || !actionSheetEl) return;
            if (typeof renderChapterList === 'function') renderChapterList();
            actionSheetEl.classList.remove('open');
            chapterSheetEl.classList.add('open');
            chapterSheetEl.classList.add('peek');
            chapterSheetEl.setAttribute('aria-hidden', 'false');
        });
    }

    // Close chapter sheet and return to main sheet
    const chapterCloseBtn = document.querySelector('.chapter-sheet-close');
    if (chapterCloseBtn) {
        chapterCloseBtn.addEventListener('click', () => {
            const chapterSheetEl = document.getElementById('chapter-sheet');
            const actionSheetEl = document.getElementById('action-sheet');
            if (!chapterSheetEl || !actionSheetEl) return;
            chapterSheetEl.classList.remove('open');
            chapterSheetEl.classList.remove('peek');
            chapterSheetEl.setAttribute('aria-hidden', 'true');
            actionSheetEl.classList.add('open');
            actionSheetEl.classList.add('peek');
            actionSheetEl.setAttribute('aria-hidden', 'false');
        });
    }

    function scrollToPageIndex(pageIndex) {
        const readerContentDiv = document.getElementById('reader-content');
        const pages = document.querySelectorAll('.page');
        const idx = Math.max(0, Math.min(pages.length - 1, (pageIndex - 1)));
        const targetPage = pages[idx];
        if (!targetPage || !readerContentDiv) return;
        isScrolling = true;
        readerContentDiv.scrollTo({ top: targetPage.offsetTop, behavior: 'smooth' });
        setTimeout(() => { isScrolling = false; }, 1000);
        updatePageNumber(idx + 1, pages.length);
    }

    function renderChapterList() {
        const list = document.getElementById('chapter-list');
        if (!list) return;
        list.innerHTML = '';
        const chapters = (window.__chapters || []).slice();
        if (chapters.length === 0) return;
        for (const ch of chapters) {
            const btn = document.createElement('button');
            btn.className = 'chapter-item';
            btn.setAttribute('role', 'listitem');
            btn.setAttribute('data-page-index', String(ch.pageIndex));
            btn.innerHTML = `<span class=\"chapter-item-title\">Capítulo ${ch.number}</span><span class=\"chapter-item-sub\">${ch.title}</span>`;
            btn.addEventListener('click', () => {
                scrollToPageIndex(ch.pageIndex);
                closeActionSheet();
            });
            list.appendChild(btn);
        }
    }

    // LÃƒÂ³gica principal
    try {
        console.log("[2] Iniciando fetch do livro de texto...");
        // Prefer URL param ?book= when it's a .txt; otherwise fallback to default
        const params = new URLSearchParams(window.location.search);
        const requested = params.get('book');
        let bookPath = 'assets/memorias_postumas_final.txt';
        if (requested && /\.txt$/i.test(requested)) {
            bookPath = requested;
        }
        const response = await fetch(bookPath);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const text = await response.text();
        console.log("[3] Arquivo .txt carregado.");

        // Evita reprocessar o livro na mesma sessÃƒÂ£o
        if (!window.__bookCache) {
            await processAndDisplayBook(text, bookPath);
            window.__bookCache = true;
        }
        console.log("[4] Processamento do livro concluÃƒÂ­do.");

    } catch (error) {
        console.error("[ERRO] Falha no bloco de inicializaÃƒÂ§ÃƒÂ£o:", error);
        readerContent.innerHTML = '<p style="text-align: center; padding-top: 50%;">Ocorreu um erro ao carregar o livro.</p>';
    }
}

async function processAndDisplayBook(text, bookPath) {
    console.log("[5] Entrou em processAndDisplayBook com texto.");
    const readerContent = document.getElementById('reader-content');
    readerContent.innerHTML = '<div class="loading-container"><div class="loading-dot"></div><div class="loading-dot"></div><div class="loading-dot"></div></div>';

    // ForÃƒÂ§a uma reflow para garantir que a animaÃƒÂ§ÃƒÂ£o de carregamento seja renderizada.
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
    // Normalize line endings to improve cross-host consistency
    const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    // Split paragraphs on 1+ blank lines (robust)
    let paragraphs = normalized.split(/\n\s*\n+/);
    const chunks = [];
    let chapterCount = 0;

    // Fallback: if very few paragraphs detected, try splitting on single newlines too
    if (paragraphs.length < 20) {
        const alt = normalized.split(/\n{1,}/).map(p => p.trim()).filter(Boolean);
        if (alt.length > paragraphs.length) paragraphs = alt;
    }

    console.log(`[6a] ParÃ¡grafos detectados: ${paragraphs.length}`);

    for (const paragraph of paragraphs) {
        let rest = paragraph.trim();
        if (!rest) continue;

        // Handle inline chapter markers like: "... capitulo 1 ### O AVIADOR   texto ..."
        while (true) {
            const idx = rest.indexOf('### ');
            if (idx === -1) {
                // No chapter marker; push remaining text as normal chunks
                const clean = rest.trim();
                if (clean) {
                    const pageChunks = splitIntoSmartChunks(clean);
                    chunks.push(...pageChunks.map(ct => ({ type: 'text', content: ct })));
                }
                break;
            }

            const pre = rest.slice(0, idx).trim();
            if (pre) {
                const pageChunks = splitIntoSmartChunks(pre);
                chunks.push(...pageChunks.map(ct => ({ type: 'text', content: ct })));
            }

            let after = rest.slice(idx + 4); // skip '### '
            // Title ends at first run of 2+ spaces or end of string
            const m = after.match(/\s{2,}/);
            let title, post;
            if (m) {
                title = after.slice(0, m.index).trim();
                post = after.slice(m.index).trim();
            } else {
                title = after.trim();
                post = '';
            }
            if (title) {
                chapterCount += 1;
                chunks.push({ type: 'chapter', title, number: chapterCount });
            }
            rest = post;
            if (!rest) break; // nothing left to process
            // loop to handle multiple markers in the same paragraph
        }
    }
    
    const rawName = filePath.split('/').pop().replace(/\.txt$/i, '').replace(/_/g, ' ');
    const title = rawName.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    // Append final club CTA chunk (persistent)
    chunks.push({ type: 'club_cta' });
    console.log(`[7] Processamento de texto concluÃ­do. Total de chunks: ${chunks.length}`);
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
        [/\bvossa merc[ÃƒÂªe]\b/gi, 'vocÃƒÂª'],
        [/\bvossemec[ÃƒÂªe]\b/gi, 'vocÃƒÂª'],
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
    window.__chapters = [];
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
    let firstTextRenderedAsRemarkable = false;
    let currentChapter = null;

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
            fixMojibake(content);
            try { content.classList.add('preload-blur'); requestAnimationFrame(() => setTimeout(() => content.classList.remove('preload-blur'), 140)); } catch(_) {}
            screen.appendChild(content);
            readerContent.appendChild(screen);
            // Stagger reveal of chapter title
            try {
                const titleEl = content.querySelector('.chapter-title');
                if (titleEl) {
                    titleEl.classList.add('reveal');
                    requestAnimationFrame(() => {
                        setTimeout(() => titleEl.classList.add('in'), 80);
                    });
                }
            } catch(_) {}
            const number = (chunk && chunk.number) ? chunk.number : (window.__chapters ? window.__chapters.length + 1 : 1);
            const eyebrowEl = content.querySelector('.chapter-eyebrow');
            if (eyebrowEl) { eyebrowEl.textContent = `Capítulo ${number}`; }
            if (!window.__chapters) window.__chapters = [];
            window.__chapters.push({ number, title, pageIndex: pageCounter });
            currentChapter = { number, title };
            continue;
        }

        if (index === 0) {
            // Make the first page a full-bleed cover
            screen.classList.add('cover-page');
            content.classList.add('cover-card');
            content.innerHTML = '';
            content.style.backgroundImage = `url('${coverImage}')`;
            content.style.backgroundSize = 'cover';
            content.style.backgroundPosition = 'center';
            content.style.backgroundRepeat = 'no-repeat';
            // Cover reveal animation
            try {
                content.classList.add('cover-reveal');
                requestAnimationFrame(() => content.classList.add('in'));
            } catch(_) {}
        } else if (chunk && chunk.type === 'club_cta') {
            const percentage = Math.round((pageCounter / totalChunks) * 100);
            content.innerHTML = `
                <div class="share-card-body" style="text-align:left">
                    <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
                        <span style="font-size:12px; font-weight:800; padding:2px 8px; border-radius:999px; background:#f3f4f6; border:1px solid var(--border-color); color:var(--text-secondary);">Clube Rufus</span>
                        <small style="opacity:.7">R$15/mÃªs</small>
                    </div>
                    <div style="font-weight:800; font-size:20px; margin-bottom:4px;">Quase lÃ¡!</div>
                    <p style="margin:0 0 8px;">Estamos finalizando os prÃ³ximos capÃ­tulos. Quer ser avisado e participar da nossa comunidade?</p>
                    <ul style="margin:6px 0 12px 18px; line-height:1.6;">
                        <li>âœ“ Encontros semanais entre leitores</li>
                        <li>âœ“ Sorteios e novidades</li>
                        <li>âœ“ Novos livros toda semana</li>
                    </ul>
                    <div class="club-form" style="display:grid; gap:8px; margin-top:8px;">
                        <label style="font-size:12px">Nome
                            <input type="text" class="club-name" placeholder="Seu nome" style="width:100%; padding:10px; border:1px solid var(--border-color); border-radius:10px;">
                        </label>
                        <label style="font-size:12px">WhatsApp
                            <input type="tel" class="club-phone" placeholder="(DDD) 9XXXX-XXXX" style="width:100%; padding:10px; border:1px solid var(--border-color); border-radius:10px;">
                        </label>
                        <div class="cta-actions" style="display:flex; gap:10px; flex-wrap:wrap; margin-top:4px;">
                            <a class="club-join" href="${CLUB_GROUP_LINK}" target="_blank" rel="noopener" style="flex:1; text-align:center; padding:10px 12px; border-radius:10px; background: var(--primary-color); color:#fff; text-decoration:none; font-weight:800;">Entrar no grupo</a>
                            <button class="club-save" style="flex:1; padding:10px 12px; border-radius:10px; border:1px solid var(--border-color); background: var(--card-bg); font-weight:700;">Quero ser avisado</button>
                        </div>
                        <label style="display:flex; align-items:center; gap:6px; font-size:12px; opacity:.8">
                            <input type="checkbox" class="club-hide"> NÃ£o mostrar novamente
                        </label>
                        <small style="opacity:.7">Usaremos seu nÃºmero para avisos do Rufus Reader. VocÃª pode sair a qualquer momento.</small>
                    </div>
                </div>`;

            fixMojibake(content);
            try { content.classList.add('preload-blur'); requestAnimationFrame(() => setTimeout(() => content.classList.remove('preload-blur'), 140)); } catch(_) {}
            // Simple single-button override (no footer, no scroll)
            {
                content.innerHTML = `<div class="share-card-body" style="text-align:left; padding-bottom:12px;">
                    <div style="font-weight:800; font-size:20px; margin-bottom:6px;">Quase lÃ¡!</div>
                    <p style="margin:0 0 12px;">Estamos finalizando os prÃ³ximos capÃ­tulos. Toque abaixo e eu aviso vocÃª quando chegar.</p>
                    <div style="display:flex; justify-content:center;">
                        <button class="club-notify" style="padding:12px 16px; border-radius:10px; background: var(--primary-color); color:#fff; font-weight:800;">Me avise</button>
                    </div>
                    <div class="club-modal" style="display:none; position:fixed; inset:0; z-index:100; align-items:center; justify-content:center; background:rgba(0,0,0,0.45);">
                        <div class="club-modal-card" style="width:min(360px,92vw); background:var(--card-bg); border:1px solid var(--border-color); border-radius:12px; box-shadow:0 20px 60px rgba(0,0,0,0.35); padding:12px;">
                            <div style="font-weight:800; margin-bottom:6px;">Receber aviso</div>
                            <div style="display:grid; gap:8px; margin:8px 0;">
                                <input type="text" class="club-name" placeholder="Seu nome" style="width:100%; padding:10px; border:1px solid var(--border-color); border-radius:10px;">
                                <input type="tel" class="club-phone" placeholder="WhatsApp (DDD) 9XXXX-XXXX" style="width:100%; padding:10px; border:1px solid var(--border-color); border-radius:10px;">
                            </div>
                            <div style="display:flex; gap:8px; justify-content:flex-end;">
                                <button class="club-cancel" style="padding:8px 12px; border-radius:10px; border:1px solid var(--border-color); background: var(--card-bg);">Cancelar</button>
                                <button class="club-save" style="padding:8px 12px; border-radius:10px; background: var(--primary-color); color:#fff; font-weight:800;">Salvar</button>
                            </div>
                        </div>
                    </div>
                </div>`;
                const btn = content.querySelector('.club-notify');
                const modal = content.querySelector('.club-modal');
                const cancelBtn = content.querySelector('.club-cancel');
                const saveBtn = content.querySelector('.club-save');
                const nameEl = content.querySelector('.club-name');
                const phoneEl = content.querySelector('.club-phone');
                if (btn && modal) {
                    btn.addEventListener('click', () => { modal.style.display = 'flex'; });
                }
                if (cancelBtn && modal) {
                    cancelBtn.addEventListener('click', () => { modal.style.display = 'none'; });
                }
                if (saveBtn) {
                    saveBtn.addEventListener('click', () => {
                        const name = (nameEl?.value || '').trim();
                        const phone = (phoneEl?.value || '').trim();
                        if (!phone) { alert('Informe seu WhatsApp.'); return; }
                        try { localStorage.setItem('clubLead', JSON.stringify({ name, phone, ts: Date.now() })); } catch(_){}
                        if (modal) modal.style.display = 'none';
                        if (btn) { btn.textContent = 'Anotado!'; btn.disabled = true; }
                    });
                }
                fixMojibake(content);
                screen.appendChild(content);
                readerContent.appendChild(screen);
                continue;
            }
            // Hook up handlers
            (function setupClubForm(){
                const saveBtn = content.querySelector('.club-save');
                const nameEl = content.querySelector('.club-name');
                const phoneEl = content.querySelector('.club-phone');
                const hideCb = content.querySelector('.club-hide');
                const screenEl = content.closest('.page');
                if (hideCb) {
                    hideCb.addEventListener('change', (e) => {
                        try { localStorage.setItem('__clubHide', e.target.checked ? '1' : '0'); } catch(_){}
                        if (e.target.checked && screenEl) {
                            screenEl.remove();
                        }
                    });
                }
                if (saveBtn) {
                    saveBtn.addEventListener('click', () => {
                        const name = (nameEl?.value || '').trim();
                        const phone = (phoneEl?.value || '').trim();
                        if (!phone) { alert('Informe seu WhatsApp.'); return; }
                        try { localStorage.setItem('clubLead', JSON.stringify({ name, phone, ts: Date.now() })); } catch(_){}
                        saveBtn.textContent = 'Salvo!';
                        saveBtn.disabled = true;
                    });
                }
            })();
        } else if (!firstTextRenderedAsRemarkable && chunk && chunk.type === 'text') {
            content.innerHTML = `<p class="remarkable-sentence">${chunk.content}</p>`;
            firstTextRenderedAsRemarkable = true;
            try { content.classList.add('preload-blur'); requestAnimationFrame(() => setTimeout(() => content.classList.remove('preload-blur'), 140)); } catch(_) {}
        } else {
            const chunkText = chunk.content.trim();
            const percentage = Math.round((pageCounter / totalChunks) * 100);

            // Skeleton overlay before content (replaced on next frame)
            content.classList.add('skeleton');

            content.innerHTML = `
                <div class="share-card-body">${chunkText}</div>
                <div class="share-card-footer">
                    <span class="share-card-page">${percentage}%</span>
                    <button class="speak-button" aria-label="Read aloud">
                        <svg class="speak-icon play-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
                        <svg class="speak-icon pause-icon" style="display: none;" viewBox="0 0 24 24"><path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                    </button>
                </div>`;
            // Add gentle preload blur
            try { content.classList.add('preload-blur'); requestAnimationFrame(() => setTimeout(() => content.classList.remove('preload-blur'), 160)); } catch(_) {}

            // Replace percentage badge with chapter pill showing current chapter number
            {
                const footerEl = content.querySelector('.share-card-footer');
                const pageEl = content.querySelector('.share-card-page');
                if (footerEl && pageEl && currentChapter && currentChapter.number) {
                    const pill = document.createElement('span');
                    pill.className = 'chapter-pill';
                    pill.textContent = `Capítulo ${currentChapter.number}`;
                    // Non-interactive visual pill only
                    footerEl.replaceChild(pill, pageEl);
                }
            }

            // Footer reveal after body by 80ms
            try {
                const footerEl = content.querySelector('.share-card-footer');
                if (footerEl) {
                    footerEl.classList.add('reveal');
                    requestAnimationFrame(() => {
                        setTimeout(() => footerEl.classList.add('in'), 80);
                    });
                }
            } catch(_) {}

            // Remove skeleton overlay on next frame
            requestAnimationFrame(() => content.classList.remove('skeleton'));

            // Note: no extra pill above footer
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

            // No first-word decoration; keep text uniform

            async function applySimplify() {
                try {
                    simplifyBtn.classList.add('loading');
                    simplifyBtn.textContent = 'Aaâ€¦';
                    const cached = localStorage.getItem(cacheKey);
                    const simplifiedText = cached || await roundTripSimplify(originalText);
                    bodyEl.textContent = simplifiedText;
                    if (!cached) localStorage.setItem(cacheKey, simplifiedText);
                    isSimplified = true;
                    simplifyBtn.classList.add('active');
                    simplifyBtn.setAttribute('aria-pressed', 'true');
                    simplifyBtn.title = 'Mostrar original';
                } catch (e) {
                    console.error('Falha na simplificaÃ§Ã£o:', e);
                    alert('NÃ£o foi possÃ­vel simplificar agora. Verifique a conexÃ£o/configuraÃ§Ã£o de traduÃ§Ã£o.');
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

        fixMojibake(content);
        screen.appendChild(content);
        readerContent.appendChild(screen);
    }

    totalPages = document.querySelectorAll('.page').length;
    updatePageNumber(1, totalPages);

    console.log(`[10] RenderizaÃƒÂ§ÃƒÂ£o concluÃƒÂ­da. ${pageCounter} cards adicionados ao DOM.`);
    loadProgress();
}

// ---------- Install Toast (Add to Home) ----------
function showInstallToast(hintOnly = false) {
    let toast = document.getElementById('install-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'install-toast';
        toast.className = 'install-toast';
        toast.innerHTML = `
            <div class="toast-body">
                <div class="toast-title">Adicionar atalho</div>
                <div class="toast-text">Adicione o Rufus Reader Ã  tela inicial para acesso rÃ¡pido.</div>
                <div class="toast-actions">
                    <button class="btn-primary" id="install-accept">Adicionar</button>
                    <button class="btn-secondary" id="install-dismiss">Depois</button>
                </div>
            </div>
            <button class="toast-close" id="install-close" aria-label="Fechar">Ã—</button>
        `;
        document.body.appendChild(toast);

        const btnAccept = toast.querySelector('#install-accept');
        const btnDismiss = toast.querySelector('#install-dismiss');
        const btnClose = toast.querySelector('#install-close');

        const openChapterSheet = () => {
            const overlay = document.getElementById('action-sheet-overlay');
            const chapterSheetEl = document.getElementById('chapter-sheet');
            const actionSheetEl = document.getElementById('action-sheet');
            if (overlay) overlay.classList.add('visible');
            document.body.classList.add('body-no-scroll');
            if (actionSheetEl) actionSheetEl.classList.remove('open');
            if (chapterSheetEl) {
                if (typeof renderChapterList === 'function') renderChapterList();
                chapterSheetEl.classList.add('open');
                chapterSheetEl.classList.add('peek');
                chapterSheetEl.setAttribute('aria-hidden', 'false');
            }
        };

        btnAccept.addEventListener('click', async () => {
            try {
                if (__deferredPrompt && !hintOnly) {
                    __deferredPrompt.prompt();
                    const { outcome } = await __deferredPrompt.userChoice;
                    if (outcome === 'accepted') {
                        localStorage.setItem('__installInstalled', '1');
                    }
                    __deferredPrompt = null;
                    hideInstallToast();
                } else {
                    // Fallback hint: show quick instructions
                    alert("iOS: Toque em Compartilhar e 'Adicionar Ã  Tela de InÃ­cio'.\nAndroid: use o menu do navegador 'Adicionar Ã  tela inicial'.");
                    hideInstallToast();
                }
            } catch (_) {
                hideInstallToast();
            }
        });
        const doDismiss = () => { try { localStorage.setItem('__installDismissed', '1'); } catch(_){} hideInstallToast(); };
        btnDismiss.addEventListener('click', doDismiss);
        btnClose.addEventListener('click', doDismiss);
    }
    toast.classList.add('visible');
}
function hideInstallToast() {
    const toast = document.getElementById('install-toast');
    if (toast) toast.classList.remove('visible');
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

// Garante que o app sÃƒÂ³ rode depois que todos os recursos, incluindo pdf.js, forem carregrados.
window.onload = init;







// Ensure Home button navigates to index explicitly (GitHub Pages + localhost)
try {
  const homeBtn = document.querySelector('.home-button');
  if (homeBtn) {
    homeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const url = new URL('index.html', window.location.href);
      window.location.assign(url.href);
    });
  }
} catch (_) {}



    // Header three-dots quick menu for paper background
    (function(){
        const btn = document.getElementById('header-menu-btn');
        const menu = document.getElementById('header-menu');
        if (!btn || !menu) return;
        const close = () => { menu.classList.remove('open'); menu.setAttribute('aria-hidden','true'); btn.setAttribute('aria-expanded','false'); };
        const open = () => { menu.classList.add('open'); menu.setAttribute('aria-hidden','false'); btn.setAttribute('aria-expanded','true'); };
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            menu.classList.contains('open') ? close() : open();
        });
        document.addEventListener('click', (e) => {
            if (!menu.contains(e.target) && e.target !== btn) close();
        });
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
        const setSelected = () => {
            const current = document.body.getAttribute('data-paper-theme') || 'default';
            menu.querySelectorAll('.paper-option').forEach(b => b.classList.toggle('selected', (b.dataset.paper||'default')===current));
        };
        menu.querySelectorAll('.paper-option').forEach(b => {
            b.addEventListener('click', () => {
                const choice = b.dataset.paper || 'default';
                try { applyPaperTheme(choice); } catch(_) { document.body.setAttribute('data-paper-theme', choice); }
                setSelected();
                close();
            });
        });
        setSelected();
    })();



