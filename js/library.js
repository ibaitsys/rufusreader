// Biblioteca: renderização de livros e seção "Em breve" com metadados compactos e badges
document.addEventListener('DOMContentLoaded', () => {
  // Prevent duplicate rendering if this script runs twice for any reason
  if (window.__libraryInitDone) return;
  window.__libraryInitDone = true;
  // Flag de página e título
  document.body.setAttribute('data-page', 'library');
  document.title = 'Rufus Reader - Biblioteca';

  const bookList = document.getElementById('book-list');

  // Livros disponíveis
  if (bookList) {
    const books = [
      {
        title: 'Memórias Póstumas de Brás Cubas',
        author: 'Machado de Assis',
        year: '1881',
        format: 'Texto',
        cover: 'assets/brascubascover.webp',
        lang: 'pt-BR',
        path: 'assets/memorias_postumas_final.txt'
      },
      {
        title: 'Play Bigger',
        author: 'Al Ramadan',
        year: '2016',
        format: 'Texto',
        cover: 'assets/playbiggercover.jpg',
        lang: 'en-US',
        path: 'assets/Play Bigger - Al Ramadan.txt'
      }
    ];

    // Limpa e renderiza
    bookList.innerHTML = '';
    books.forEach(book => {
      const li = document.createElement('li');
      li.className = 'book-item';

      const a = document.createElement('a');
            a.href = `book-dashboard.html?book=${encodeURIComponent(book.path)}&title=${encodeURIComponent(book.title)}&author=${encodeURIComponent(book.author)}&cover=${encodeURIComponent(book.cover)}${book.lang ? `&lang=${encodeURIComponent(book.lang)}` : ''}`;

      const wrap = document.createElement('div');
      wrap.className = 'book-cover-wrap';

      const img = document.createElement('img');
      img.src = book.cover;
      img.alt = `Capa do livro ${book.title}`;

      const badge = document.createElement('div');
      badge.className = 'corner-badge';
      badge.textContent = 'Disponível';

      wrap.appendChild(img);
      wrap.appendChild(badge);

      const meta = document.createElement('div');
      meta.className = 'book-meta';
      const parts = [book.author].filter(Boolean);
      meta.textContent = parts.join(' • ');

      a.appendChild(wrap);
      a.appendChild(meta);
      li.appendChild(a);
      bookList.appendChild(li);
    });
  }

  // Seção Em breve (render only once)
  const container = document.querySelector('.library-container');
  if (container && !document.getElementById('coming-soon-list')) {
    const title = document.createElement('div');
    title.className = 'section-title';
    title.textContent = 'Em breve';

    const comingList = document.createElement('ul');
    comingList.id = 'coming-soon-list';
    comingList.className = 'book-list';

    // Use neutral covers to avoid showing "Memórias Póstumas" text in thumbnails
    const covers = ['assets/book1.svg', 'assets/book3.svg', 'assets/dom-casmurro.svg'];
    const comingSoon = [
      'Quincas Borba',
      'Esaú e Jacó',
      'Dom Casmurro'
    ];

    comingSoon.forEach((bookTitle, i) => {
      const li = document.createElement('li');
      li.className = 'book-item disabled';
      li.title = bookTitle;

      const wrap = document.createElement('div');
      wrap.className = 'book-cover-wrap';

      const img = document.createElement('img');
      img.src = covers[i % covers.length];
      img.alt = `Capa do livro ${bookTitle} (em breve)`;

      const soon = document.createElement('div');
      soon.className = 'corner-badge';
      soon.textContent = 'Em breve';

      wrap.appendChild(img);
      wrap.appendChild(soon);

      const meta = document.createElement('div');
      meta.className = 'book-meta';
      meta.textContent = 'Machado de Assis';

      const inner = document.createElement('div');
      inner.style.textAlign = 'center';
      inner.appendChild(wrap);
      inner.appendChild(meta);

      li.appendChild(inner);
      comingList.appendChild(li);
    });

    // Ensure we don't already have a coming soon section
    const existing = container.querySelectorAll('#coming-soon-list');
    if (existing.length > 1) {
      // Remove duplicates, keep the first
      existing.forEach((el, idx) => { if (idx > 0) el.remove(); });
    }

    if (bookList && bookList.parentElement === container) {
      // Insert right after the available list
      bookList.insertAdjacentElement('afterend', title);
      title.insertAdjacentElement('afterend', comingList);
    } else {
      container.appendChild(title);
      container.appendChild(comingList);
    }
  }
});
// Normaliza textos com acentos na UI
try {
  const sectionTitleEl = document.querySelector('.section-title');
  if (sectionTitleEl) sectionTitleEl.textContent = 'Disponíveis';
  const beta = document.querySelector('.beta-badge');
  if (beta) beta.setAttribute('aria-label', 'Versão beta');
} catch (e) {}


