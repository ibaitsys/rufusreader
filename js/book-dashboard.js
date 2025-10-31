document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const bookPath = params.get('book');
    const bookTitle = params.get('title');
    const bookAuthor = params.get('author');
    const bookCover = params.get('cover');
    const bookLang = params.get('lang');

    const bookTitleElement = document.getElementById('book-title');
    const bookAuthorElement = document.getElementById('book-author');
    const bookCoverContainer = document.getElementById('book-cover-container');
    const lerAgoraBtn = document.getElementById('ler-agora-btn');
    const progressBar = document.getElementById('progress-bar');
    const progressPercentage = document.getElementById('progress-percentage');
    const commentList = document.getElementById('comment-list');
    const commentInput = document.getElementById('comment-input');
    const submitComment = document.getElementById('submit-comment');

    if (bookTitle) {
        bookTitleElement.textContent = bookTitle;
    }

    if (bookAuthor) {
        bookAuthorElement.textContent = bookAuthor;
    }

    if (bookCover) {
        const coverImage = document.createElement('img');
        coverImage.src = bookCover;
        coverImage.alt = `Capa do livro ${bookTitle}`;
        bookCoverContainer.appendChild(coverImage);
    }

    lerAgoraBtn.addEventListener('click', () => {
        if (bookPath) {
            const qp = new URLSearchParams({
                book: bookPath || '',
                title: bookTitle || '',
                author: bookAuthor || '',
                cover: bookCover || '',
                lang: bookLang || ''
            }).toString();
            window.location.href = `reader.html?${qp}`;
        }
    });

    // Simulação de progresso de leitura
    const progresso = 30; // Exemplo: 30%
    progressBar.style.width = `${progresso}%`;
    progressPercentage.textContent = progresso;

    // Carregar comentários
    const carregarComentarios = () => {
        const comentarios = JSON.parse(localStorage.getItem('comentarios')) || [];
        commentList.innerHTML = '';
        comentarios.forEach(comentario => {
            const commentElement = document.createElement('div');
            commentElement.classList.add('comment');
            commentElement.textContent = comentario;
            commentList.appendChild(commentElement);
        });
    };

    // Adicionar comentário
    submitComment.addEventListener('click', () => {
        const novoComentario = commentInput.value.trim();
        if (novoComentario) {
            const comentarios = JSON.parse(localStorage.getItem('comentarios')) || [];
            comentarios.push(novoComentario);
            localStorage.setItem('comentarios', JSON.stringify(comentarios));
            commentInput.value = '';
            carregarComentarios();
        }
    });

    carregarComentarios();
});
