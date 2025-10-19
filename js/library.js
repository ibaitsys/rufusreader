
document.addEventListener('DOMContentLoaded', () => {
    const books = [
        {
            title: 'Memórias Póstumas de Brás Cubas',
            author: 'Machado de Assis',
            cover: 'assets/Cover.png',
            path: 'assets/Memórias Postumas de Brás Cubas - PDF_removed.pdf'
        }
    ];

    const bookList = document.getElementById('book-list');

    books.forEach(book => {
        const bookItem = document.createElement('li');
        bookItem.className = 'book-item';

        const bookLink = document.createElement('a');
        bookLink.href = `reader.html?book=${encodeURIComponent(book.path)}`;

        const bookCover = document.createElement('img');
        bookCover.src = book.cover;
        bookCover.alt = `Capa do livro ${book.title}`;

        const bookTitle = document.createElement('div');
        bookTitle.className = 'book-item-title';
        bookTitle.textContent = book.title;

        bookLink.appendChild(bookCover);
        bookLink.appendChild(bookTitle);
        bookItem.appendChild(bookLink);
        bookList.appendChild(bookItem);
    });
});
