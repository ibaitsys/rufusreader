// Versão de depuração com logs detalhados

async function init() {
    console.log("[1] App iniciado.");

    const readerContent = document.getElementById('reader-content');
    const infoPanel = document.getElementById('info-panel');
    const actionSheetOverlay = document.getElementById('action-sheet-overlay');

    if (!readerContent) {
        console.error("FALHA CRÍTICA: #reader-content não encontrado.");
        return;
    }

    // Funções de UI (simplificadas para o teste)
    function openActionSheet() { if(actionSheetOverlay) actionSheetOverlay.style.display = 'block'; }
    function closeActionSheet() { if(actionSheetOverlay) actionSheetOverlay.style.display = 'none'; }

    // Listeners básicos
    if (infoPanel) infoPanel.addEventListener('click', openActionSheet);
    if (actionSheetOverlay) actionSheetOverlay.addEventListener('click', closeActionSheet);

    // Lógica principal
    try {
        console.log("[2] Iniciando fetch do PDF...");
        const response = await fetch('assets/Dom_Casmurro-Machado_de_Assis.pdf');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        console.log("[3] Fetch do PDF concluído com sucesso.");

        const blob = await response.blob();
        const file = new File([blob], 'Dom_Casmurro-Machado_de_Assis.pdf', { type: 'application/pdf' });
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

            if (textItems && textItems.length > 20) { // Apenas processa páginas com texto significativo
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
        if (currentChunk.length + sentence.length > 450 && currentChunk.length > 0) {
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

function interleaveBooksIntoScreens(books) {
    console.log("[9] Entrou em interleaveBooksIntoScreens para renderizar os cards.");
    const readerContent = document.getElementById('reader-content');
    readerContent.innerHTML = '';
    let totalPages = 0;

    const book = books[0];
    if (!book || !book.chunks) {
        console.error("Nenhum chunk encontrado para renderizar.");
        return;
    }

    for (const chunk of book.chunks) {
        totalPages++;
        const screen = document.createElement('div');
        screen.className = 'page share-card';
        
        const content = document.createElement('div');
        content.className = 'page-content share-card-content';

        const chunkText = chunk.content.trim();
        const match = chunkText.match(/^(\S+)(.*)$/s);
        const fw = match ? match[1] : chunkText;
        const rest = match ? match[2] : '';

        content.innerHTML = `
            <div class="share-card-body"><span class="first-word">${fw}</span>${rest}</div>
            <div class="share-card-footer">
                <span class="share-card-page">Pág. ${totalPages}</span>
                <button class="speak-button" aria-label="Read aloud">
                    <svg class="speak-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
                </button>
            </div>`;
        
        screen.appendChild(content);
        readerContent.appendChild(screen);
    }
    console.log(`[10] Renderização concluída. ${totalPages} cards adicionados ao DOM.`);
}

// Garante que o app só rode depois que todos os recursos, incluindo pdf.js, forem carregados.
window.onload = init;