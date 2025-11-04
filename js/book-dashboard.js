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

  if (bookTitle && bookTitleElement) bookTitleElement.textContent = bookTitle;
  if (bookAuthor && bookAuthorElement) bookAuthorElement.textContent = bookAuthor;

  if (bookCover && bookCoverContainer) {
    const coverImage = document.createElement('img');
    coverImage.src = bookCover;
    coverImage.alt = `Capa do livro ${bookTitle || ''}`;
    bookCoverContainer.appendChild(coverImage);
  }

  if (lerAgoraBtn) {
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
  }

  // Progresso de leitura (exemplo)
  const progresso = 30; // %
  if (progressBar) progressBar.style.width = `${progresso}%`;
  if (progressPercentage) progressPercentage.textContent = String(progresso);
});

