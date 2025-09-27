const { Book } = require('../models/Book');

async function createBook(file) {
  return await Book.create({
    title: file.originalname,
    path: file.path
  });
}

async function listBooks() {
  return await Book.findAll();
}

module.exports = { createBook, listBooks };
