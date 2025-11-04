// Biblioteca: renderização de livros e seção "Em breve" com metadados compactos e badges
document.addEventListener('DOMContentLoaded', () => {
  const SHOW_COMING_SOON = false; // disable "Em breve" section on index
  // Prevent duplicate rendering if this script runs twice for any reason
  if (window.__libraryInitDone) return;
  window.__libraryInitDone = true;
  // Flag de página e título
  document.body.setAttribute('data-page', 'library');
  document.title = 'Rodlist - Biblioteca';

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
      },
      // Adicionados
      {
        title: 'Confissões de Santo Agostinho - Edição de Luxo Almofadada',
        author: 'Agostinho de Hipona',
        year: '',
        format: 'Texto',
        cover: 'assets/book1.svg',
        lang: 'pt-BR',
        path: 'assets/memorias_postumas_final.txt'
      },
      {
        title: 'Amor, teoricamente',
        author: 'Ali Hazelwood',
        year: '',
        format: 'Texto',
        cover: 'assets/book3.svg',
        lang: 'pt-BR',
        path: 'assets/memorias_postumas_final.txt'
      },
      {
        title: 'A hipótese do amor',
        author: 'Ali Hazelwood',
        year: '',
        format: 'Texto',
        cover: 'assets/dom-casmurro.svg',
        lang: 'pt-BR',
        path: 'assets/memorias_postumas_final.txt'
      },
      {
        title: 'Como arruinar um casamento – Um livro sobre recomeços e amizades improváveis, vencedor do prêmio Goodreads',
        author: 'Alison Espach',
        year: '',
        format: 'Texto',
        cover: 'assets/book1.svg',
        lang: 'pt-BR',
        path: 'assets/memorias_postumas_final.txt'
      },
      {
        title: 'A morte é um dia que vale a pena viver: E um excelente motivo para se buscar um novo olhar para a vida',
        author: 'Ana Claudia Quintana Arantes',
        year: '',
        format: 'Texto',
        cover: 'assets/book3.svg',
        lang: 'pt-BR',
        path: 'assets/memorias_postumas_final.txt'
      },
      {
        title: 'Um defeito de cor',
        author: 'Ana Maria Gonçalves',
        year: '',
        format: 'Texto',
        cover: 'assets/dom-casmurro.svg',
        lang: 'pt-BR',
        path: 'assets/memorias_postumas_final.txt'
      },
      {
        title: 'A gente mira no amor e acerta na solidão',
        author: 'Ana Suy',
        year: '',
        format: 'Texto',
        cover: 'assets/book1.svg',
        lang: 'pt-BR',
        path: 'assets/memorias_postumas_final.txt'
      },
      {
        title: 'O Pequeno Príncipe - Edição de Luxo Almofadada',
        author: 'Antoine de Saint-Exupéry',
        year: '',
        format: 'Texto',
        cover: 'assets/book3.svg',
        lang: 'pt-BR',
        path: 'assets/memorias_postumas_final.txt'
      },
      {
        title: 'Tudo Sobre o Amor',
        author: 'bell hooks',
        year: '',
        format: 'Texto',
        cover: 'assets/dom-casmurro.svg',
        lang: 'pt-BR',
        path: 'assets/memorias_postumas_final.txt'
      },
      {
        title: 'Coleção completa Bobbie Goods (Do dia para a noite, Dias quentes, Isso e aquilo e Dias frios)',
        author: 'Bobbie Goods',
        year: '',
        format: 'Texto',
        cover: 'assets/book1.svg',
        lang: 'pt-BR',
        path: 'assets/memorias_postumas_final.txt'
      },
      {
        title: 'Dias quentes (Spring Summer)',
        author: 'Bobbie Goods',
        year: '',
        format: 'Texto',
        cover: 'assets/book3.svg',
        lang: 'pt-BR',
        path: 'assets/memorias_postumas_final.txt'
      },
      {
        title: 'Do dia para a noite (Day to night)',
        author: 'Bobbie Goods',
        year: '',
        format: 'Texto',
        cover: 'assets/dom-casmurro.svg',
        lang: 'pt-BR',
        path: 'assets/memorias_postumas_final.txt'
      },
      {
        title: 'A coragem de ser imperfeito: Como aceitar a própria vulnerabilidade, vencer a vergonha e ousar ser quem você é',
        author: 'Brené Brown',
        year: '',
        format: 'Texto',
        cover: 'assets/book1.svg',
        lang: 'pt-BR',
        path: 'assets/memorias_postumas_final.txt'
      },
      {
        title: 'Sociedade do cansaço',
        author: 'Byung-Chul Han',
        year: '',
        format: 'Texto',
        cover: 'assets/book1.svg',
        lang: 'pt-BR',
        path: 'assets/memorias_postumas_final.txt'
      },
      {
        title: 'Cartas de um diabo a seu aprendiz',
        author: 'C. S. Lewis',
        year: '',
        format: 'Texto',
        cover: 'assets/book3.svg',
        lang: 'pt-BR',
        path: 'assets/memorias_postumas_final.txt'
      },
      {
        title: 'Tudo é rio',
        author: 'Carla Madeira',
        year: '',
        format: 'Texto',
        cover: 'assets/dom-casmurro.svg',
        lang: 'pt-BR',
        path: 'assets/memorias_postumas_final.txt'
      },
      {
        title: 'Binding 13: Marcação cerrada no amor',
        author: 'Chloe Walsh',
        year: '',
        format: 'Texto',
        cover: 'assets/book1.svg',
        lang: 'pt-BR',
        path: 'assets/memorias_postumas_final.txt'
      },
      {
        title: 'Keeping 13: Se apaixonar é a parte fácil: 2',
        author: 'Chloe Walsh',
        year: '',
        format: 'Texto',
        cover: 'assets/book3.svg',
        lang: 'pt-BR',
        path: 'assets/memorias_postumas_final.txt'
      },
      {
        title: 'A hora da estrela: Edição comemorativa',
        author: 'Clarice Lispector',
        year: '',
        format: 'Texto',
        cover: 'assets/dom-casmurro.svg',
        lang: 'pt-BR',
        path: 'assets/memorias_postumas_final.txt'
      },
      {
        title: 'Se não fosse você',
        author: 'Colleen Hoover',
        year: '',
        format: 'Texto',
        cover: 'assets/book1.svg',
        lang: 'pt-BR',
        path: 'assets/memorias_postumas_final.txt'
      }
      , { title: 'Verity', author: 'Colleen Hoover', year: '', format: 'Texto', cover: 'assets/book3.svg', lang: 'pt-BR', path: 'assets/memorias_postumas_final.txt' }
      , { title: 'Verity (Edição de colecionador)', author: 'Colleen Hoover', year: '', format: 'Texto', cover: 'assets/dom-casmurro.svg', lang: 'pt-BR', path: 'assets/memorias_postumas_final.txt' }
      , { title: 'O lado feio do amor', author: 'Colleen Hoover', year: '', format: 'Texto', cover: 'assets/book1.svg', lang: 'pt-BR', path: 'assets/memorias_postumas_final.txt' }
      , { title: 'Uma segunda chance (Fenômeno do TikTok)', author: 'Colleen Hoover', year: '', format: 'Texto', cover: 'assets/book3.svg', lang: 'pt-BR', path: 'assets/memorias_postumas_final.txt' }
      , { title: 'Canção para ninar menino grande', author: 'Conceição Evaristo', year: '', format: 'Texto', cover: 'assets/dom-casmurro.svg', lang: 'pt-BR', path: 'assets/memorias_postumas_final.txt' }
      , { title: 'Olhos D\'Água', author: 'Conceição Evaristo', year: '', format: 'Texto', cover: 'assets/book1.svg', lang: 'pt-BR', path: 'assets/memorias_postumas_final.txt' }
      , { title: 'Como fazer amigos e influenciar pessoas', author: 'Dale Carnegie', year: '', format: 'Texto', cover: 'assets/book3.svg', lang: 'pt-BR', path: 'assets/memorias_postumas_final.txt' }
      , { title: 'O segredo final (Robert Langdon – Livro 6)', author: 'Dan Brown', year: '', format: 'Texto', cover: 'assets/dom-casmurro.svg', lang: 'pt-BR', path: 'assets/memorias_postumas_final.txt' }
      , { title: 'Nada pode me ferir', author: 'David Goggins', year: '', format: 'Texto', cover: 'assets/book1.svg', lang: 'pt-BR', path: 'assets/memorias_postumas_final.txt' }
      , { title: 'Oi, Sumido', author: 'Dolly Alderton', year: '', format: 'Texto', cover: 'assets/book3.svg', lang: 'pt-BR', path: 'assets/memorias_postumas_final.txt' }
      , { title: 'Noites Brancas', author: 'Fiódor Dostoiévski', year: '', format: 'Texto', cover: 'assets/dom-casmurro.svg', lang: 'pt-BR', path: 'assets/memorias_postumas_final.txt' }
      , { title: 'A Metamorfose: DIE VERWANDLUNG', author: 'Franz Kafka', year: '', format: 'Texto', cover: 'assets/book1.svg', lang: 'pt-BR', path: 'assets/memorias_postumas_final.txt' }
      , { title: 'Nunca minta', author: 'Freida McFadden', year: '', format: 'Texto', cover: 'assets/book3.svg', lang: 'pt-BR', path: 'assets/memorias_postumas_final.txt' }
      , { title: 'A empregada (A empregada – Livro 1): Bem-vinda à família', author: 'Freida McFadden', year: '', format: 'Texto', cover: 'assets/dom-casmurro.svg', lang: 'pt-BR', path: 'assets/memorias_postumas_final.txt' }
      , { title: 'O segredo da empregada (A empregada – Livro 2)', author: 'Freida McFadden', year: '', format: 'Texto', cover: 'assets/book1.svg', lang: 'pt-BR', path: 'assets/memorias_postumas_final.txt' }
      , { title: 'Cristianismo puro e simples', author: 'Gabriele Greggersen', year: '', format: 'Texto', cover: 'assets/book3.svg', lang: 'pt-BR', path: 'assets/memorias_postumas_final.txt' }
      , { title: 'O homem mais rico da Babilônia', author: 'George S. Clason', year: '', format: 'Texto', cover: 'assets/dom-casmurro.svg', lang: 'pt-BR', path: 'assets/memorias_postumas_final.txt' }
      , { title: 'Vidas secas', author: 'Graciliano Ramos', year: '', format: 'Texto', cover: 'assets/book1.svg', lang: 'pt-BR', path: 'assets/memorias_postumas_final.txt' }
      , { title: 'Essencialismo: A disciplinada busca por menos', author: 'Greg McKeown', year: '', format: 'Texto', cover: 'assets/book3.svg', lang: 'pt-BR', path: 'assets/memorias_postumas_final.txt' }
      , { title: 'As coisas que você só vê quando desacelera: Como manter a calma em um mundo frenético', author: 'Haemin Sunim', year: '', format: 'Texto', cover: 'assets/dom-casmurro.svg', lang: 'pt-BR', path: 'assets/memorias_postumas_final.txt' }
      , { title: 'Aliada do Vilã', author: 'Hannah Nicole Maehrer', year: '', format: 'Texto', cover: 'assets/book1.svg', lang: 'pt-BR', path: 'assets/memorias_postumas_final.txt' }
      , { title: 'A coragem de não agradar: Como a filosofia pode ajudar você a se libertar da opinião dos outros, superar suas limitações e se tornar a pessoa que deseja', author: 'Ichiro Kishimi', year: '', format: 'Texto', cover: 'assets/book3.svg', lang: 'pt-BR', path: 'assets/memorias_postumas_final.txt' }
      , { title: 'Hábitos Atômicos: um Método Fácil e Comprovado de Criar Bons Hábitos e se Livrar dos Maus', author: 'James Clear', year: '', format: 'Texto', cover: 'assets/dom-casmurro.svg', lang: 'pt-BR', path: 'assets/memorias_postumas_final.txt' }
      , { title: 'Thorgal: Série Clássica (Vol. 1 de 4)', author: 'Jean Van Hamme', year: '', format: 'Texto', cover: 'assets/book1.svg', lang: 'pt-BR', path: 'assets/memorias_postumas_final.txt' }
      , { title: 'Quebrando o hábito de ser você mesmo: como reconstruir sua mente e criar um novo eu', author: 'Joe Dispenza', year: '', format: 'Texto', cover: 'assets/book3.svg', lang: 'pt-BR', path: 'assets/memorias_postumas_final.txt' }
      , { title: 'A geração ansiosa: Como a infância hiperconectada está causando uma epidemia de transtornos mentais', author: 'Jonathan Haidt', year: '', format: 'Texto', cover: 'assets/dom-casmurro.svg', lang: 'pt-BR', path: 'assets/memorias_postumas_final.txt' }
      , { title: 'O poder do subconsciente', author: 'Joseph Murphy', year: '', format: 'Texto', cover: 'assets/book1.svg', lang: 'pt-BR', path: 'assets/memorias_postumas_final.txt' }
      , { title: 'Capitães da areia', author: 'Jorge Amado', year: '', format: 'Texto', cover: 'assets/book3.svg', lang: 'pt-BR', path: 'assets/memorias_postumas_final.txt' }
      , { title: 'Café com Deus Pai Vol. 6 - 2026: Porções Diárias de Amor', author: 'Júnior Rostirola', year: '', format: 'Texto', cover: 'assets/dom-casmurro.svg', lang: 'pt-BR', path: 'assets/memorias_postumas_final.txt' }
      , { title: 'Bíblia King James 1611 de Estudo Holman - Duotone - 7 Edição', author: 'King James', year: '', format: 'Texto', cover: 'assets/book1.svg', lang: 'pt-BR', path: 'assets/memorias_postumas_final.txt' }
      , { title: 'Caçador sem coração (Mariposa Escarlate - Livro 1)', author: 'Kristen Ciccarelli', year: '', format: 'Texto', cover: 'assets/book3.svg', lang: 'pt-BR', path: 'assets/memorias_postumas_final.txt' }
      , { title: 'A Morte de Ivan Ilitch (2 ed.)', author: 'Liev Tolstói', year: '', format: 'Texto', cover: 'assets/dom-casmurro.svg', lang: 'pt-BR', path: 'assets/memorias_postumas_final.txt' }
      , { title: 'De quanta terra precisa um homem e outras histórias', author: 'Liev Tolstói', year: '', format: 'Texto', cover: 'assets/book1.svg', lang: 'pt-BR', path: 'assets/memorias_postumas_final.txt' }
      , { title: 'Mulherzinhas', author: 'Louisa May Alcott', year: '', format: 'Texto', cover: 'assets/book3.svg', lang: 'pt-BR', path: 'assets/memorias_postumas_final.txt' }
      , { title: 'Melhor do que nos filmes', author: 'Lynn Painter', year: '', format: 'Texto', cover: 'assets/dom-casmurro.svg', lang: 'pt-BR', path: 'assets/memorias_postumas_final.txt' }
      , { title: 'Não é como nos filmes: (Melhor do que nos filmes – vol. 2)', author: 'Lynn Painter', year: '', format: 'Texto', cover: 'assets/book1.svg', lang: 'pt-BR', path: 'assets/memorias_postumas_final.txt' }
      , { title: 'Rabiscos de Florentia', author: 'Maidy Lacerda', year: '', format: 'Texto', cover: 'assets/book3.svg', lang: 'pt-BR', path: 'assets/memorias_postumas_final.txt' }
      , { title: 'Box Trono de Vidro (acompanha pôster e marcadores)', author: 'Mariana Kohnert', year: '', format: 'Texto', cover: 'assets/dom-casmurro.svg', lang: 'pt-BR', path: 'assets/memorias_postumas_final.txt' }
      , { title: 'Não Começou com Você: Como o Trauma Familiar Herdado nos Define e Como dar um fim a Esse Ciclo', author: 'Mark Wolynn', year: '', format: 'Texto', cover: 'assets/book1.svg', lang: 'pt-BR', path: 'assets/memorias_postumas_final.txt' }
      , { title: 'A Biblioteca da Meia-Noite', author: 'Matt Haig', year: '', format: 'Texto', cover: 'assets/book3.svg', lang: 'pt-BR', path: 'assets/memorias_postumas_final.txt' }
      , { title: 'Deixa pra lá: A teoria Let Them', author: 'Mel Robbins', year: '', format: 'Texto', cover: 'assets/dom-casmurro.svg', lang: 'pt-BR', path: 'assets/memorias_postumas_final.txt' }
      , { title: 'Coisa de rico: A vida dos endinheirados brasileiros', author: 'Michel Alcoforado', year: '', format: 'Texto', cover: 'assets/book1.svg', lang: 'pt-BR', path: 'assets/memorias_postumas_final.txt' }
      , { title: 'A psicologia financeira: lições atemporais sobre fortuna, ganância e felicidade', author: 'Morgan Housel', year: '', format: 'Texto', cover: 'assets/book3.svg', lang: 'pt-BR', path: 'assets/memorias_postumas_final.txt' }
      , { title: 'A arte de gastar dinheiro: Escolhas simples para uma vida equilibrada', author: 'Morgan Housel', year: '', format: 'Texto', cover: 'assets/dom-casmurro.svg', lang: 'pt-BR', path: 'assets/memorias_postumas_final.txt' }
      , { title: 'Mais esperto que o diabo: o mistério revelado da liberdade e do sucesso', author: 'Napoleon Hill', year: '', format: 'Texto', cover: 'assets/book1.svg', lang: 'pt-BR', path: 'assets/memorias_postumas_final.txt' }
      , { title: 'Noites brancas (tradução direta do original russo)', author: 'Nivaldo dos Santos', year: '', format: 'Texto', cover: 'assets/book3.svg', lang: 'pt-BR', path: 'assets/memorias_postumas_final.txt' }
      , { title: 'O livro que você gostaria que seus pais tivessem lido: (e seus filhos ficarão gratos por você ler)', author: 'Philippa Perry', year: '', format: 'Texto', cover: 'assets/dom-casmurro.svg', lang: 'pt-BR', path: 'assets/memorias_postumas_final.txt' }
      , { title: 'Dias perfeitos: O livro que deu origem à série original Globoplay', author: 'Raphael Montes', year: '', format: 'Texto', cover: 'assets/book1.svg', lang: 'pt-BR', path: 'assets/memorias_postumas_final.txt' }
      , { title: 'Jantar secreto', author: 'Raphael Montes', year: '', format: 'Texto', cover: 'assets/book3.svg', lang: 'pt-BR', path: 'assets/memorias_postumas_final.txt' }
      , { title: 'Quarta asa: 1', author: 'Rebecca Yarros', year: '', format: 'Texto', cover: 'assets/dom-casmurro.svg', lang: 'pt-BR', path: 'assets/memorias_postumas_final.txt' }
      , { title: 'Chama de Ferro (Série O Empyriano, Livro 2)', author: 'Rebecca Yarros', year: '', format: 'Texto', cover: 'assets/book1.svg', lang: 'pt-BR', path: 'assets/memorias_postumas_final.txt' }
      , { title: 'O massacre da família Hope', author: 'Riley Sager', year: '', format: 'Texto', cover: 'assets/book3.svg', lang: 'pt-BR', path: 'assets/memorias_postumas_final.txt' }
      , { title: 'As 48 leis do poder', author: 'Robert Greene', year: '', format: 'Texto', cover: 'assets/dom-casmurro.svg', lang: 'pt-BR', path: 'assets/memorias_postumas_final.txt' }
      , { title: 'Absolute Batman 01 (Volume 1)', author: 'Scott Snyder', year: '', format: 'Texto', cover: 'assets/book1.svg', lang: 'pt-BR', path: 'assets/memorias_postumas_final.txt' }
      , { title: 'A cabeça do santo', author: 'Socorro Acioli', year: '', format: 'Texto', cover: 'assets/book3.svg', lang: 'pt-BR', path: 'assets/memorias_postumas_final.txt' }
      , { title: 'Oração para Desaparecer', author: 'Socorro Acioli', year: '', format: 'Texto', cover: 'assets/dom-casmurro.svg', lang: 'pt-BR', path: 'assets/memorias_postumas_final.txt' }
      , { title: 'It: A coisa: O livro que deu origem à série da HBO Max “Bem-vindos à Derry”', author: 'Stephen King', year: '', format: 'Texto', cover: 'assets/book1.svg', lang: 'pt-BR', path: 'assets/memorias_postumas_final.txt' }
    ,
      , { title: 'O Vampiro que Ri (Mangá - Vol. 1 de 2)', author: 'Suehiro Maruo', year: '', format: 'Texto', cover: 'assets/book3.svg', lang: 'pt-BR', path: 'assets/memorias_postumas_final.txt' }
      , { title: 'O cara que estou a fim não é um cara! - Volume 2', author: 'Sumiko Arai', year: '', format: 'Texto', cover: 'assets/dom-casmurro.svg', lang: 'pt-BR', path: 'assets/memorias_postumas_final.txt' }
      , { title: 'Os segredos da mente milionária', author: 'T. Harv Eker', year: '', format: 'Texto', cover: 'assets/book1.svg', lang: 'pt-BR', path: 'assets/memorias_postumas_final.txt' }
      , { title: 'Ganhe o mundo sem perder a alma: O que a Sabedoria Milenar nos ensina sobre dinheiro e espiritualidade', author: 'Tiago Brunet', year: '', format: 'Texto', cover: 'assets/book3.svg', lang: 'pt-BR', path: 'assets/memorias_postumas_final.txt' }
      , { title: 'O mistério do biscoito de gengibre: contos e receitas para a melhor época do ano', author: 'Tiago Valente', year: '', format: 'Texto', cover: 'assets/dom-casmurro.svg', lang: 'pt-BR', path: 'assets/memorias_postumas_final.txt' }
      , { title: 'Perigoso!', author: 'Tim Warnes', year: '', format: 'Texto', cover: 'assets/book1.svg', lang: 'pt-BR', path: 'assets/memorias_postumas_final.txt' }
      , { title: 'Casas estranhas: Casas estranhas Vol. 1', author: 'Uketsu', year: '', format: 'Texto', cover: 'assets/book3.svg', lang: 'pt-BR', path: 'assets/memorias_postumas_final.txt' }
      , { title: 'Tremembé: O presídio dos famosos', author: 'Ullisses Campbell', year: '', format: 'Texto', cover: 'assets/dom-casmurro.svg', lang: 'pt-BR', path: 'assets/memorias_postumas_final.txt' }
      , { title: 'Em Busca De Sentido: Um psicólogo no campo de concentração', author: 'Viktor E. Frankl', year: '', format: 'Texto', cover: 'assets/book1.svg', lang: 'pt-BR', path: 'assets/memorias_postumas_final.txt' }
      , { title: 'Hamlet', author: 'William Shakespeare', year: '', format: 'Texto', cover: 'assets/book3.svg', lang: 'pt-BR', path: 'assets/memorias_postumas_final.txt' }
    ];

    // Normalize generic covers to a neutral placeholder
    try {
      books.forEach(b => {
        if (!b) return;
        const c = String(b.cover || '');
        if (/assets\/(book1\.svg|book3\.svg|dom-casmurro\.svg)$/i.test(c)) {
          b.cover = 'assets/book-placeholder.svg';
        }
      });
    } catch (_) {}

    // Render helper
    const renderBooks = (arr) => {
      bookList.innerHTML = '';
      arr.forEach(book => {
        const li = document.createElement('li');
        li.className = 'book-item';
        const a = document.createElement('a');
        a.href = 'book-dashboard.html?book=' + encodeURIComponent(book.path) + '&title=' + encodeURIComponent(book.title) + '&author=' + encodeURIComponent(book.author) + '&cover=' + encodeURIComponent(book.cover) + (book.lang ? ('&lang=' + encodeURIComponent(book.lang)) : '');
        const wrap = document.createElement('div');
        wrap.className = 'book-cover-wrap';
        const img = document.createElement('img');
        img.src = book.cover;
        img.alt = 'Capa do livro ' + (book.title || '');
        const badge = document.createElement('div');
        badge.className = 'corner-badge';
        badge.textContent = 'Disponíveis';
        wrap.appendChild(img);
        wrap.appendChild(badge);
        const meta = document.createElement('div');
        meta.className = 'book-meta';
        meta.textContent = book.title || '';
        a.appendChild(wrap);
        a.appendChild(meta);
        li.appendChild(a);
        bookList.appendChild(li);
      });
    };
    // Initial render
    renderBooks(books);

    // Wire up search
    const searchInput = document.getElementById('book-search');
    if (searchInput) {
      searchInput.addEventListener('input', function () {
        var q = (searchInput.value || '').toLowerCase();
        if (!q) { renderBooks(books); return; }
        var filtered = books.filter(function(b){
          var t = String(b.title || '').toLowerCase();
          var a = String(b.author || '').toLowerCase();
          return t.indexOf(q) !== -1 || a.indexOf(q) !== -1;
        });
        renderBooks(filtered);
      });
    }
  }

  // Seção Em breve (render only once)
  const container = document.querySelector('.library-container');
  if (SHOW_COMING_SOON && container && !document.getElementById('coming-soon-list')) {
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







