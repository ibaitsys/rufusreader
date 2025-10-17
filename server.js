const express = require('express');
const path = require('path');

const app = express();
const PORT = 3001;

// Serve arquivos estáticos da pasta 'public', 'css', 'js', e 'assets'
// Isso permite que o navegador acesse os arquivos dentro dessas pastas.
app.use(express.static(path.join(__dirname, 'public')));
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Rota principal que serve o index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Inicia o servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
    console.log('Pressione Ctrl+C para parar o servidor');
});