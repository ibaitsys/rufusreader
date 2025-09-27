const { ReadingProgress } = require('../models/ReadingProgress');

async function saveProgress(bookId, page) {
  let prog = await ReadingProgress.findOne({ where: { bookId } });
  if (!prog) {
    prog = await ReadingProgress.create({ bookId, page });
  } else {
    prog.page = page;
    await prog.save();
  }
  return prog;
}

async function getProgress(bookId) {
  const prog = await ReadingProgress.findOne({ where: { bookId } });
  return prog ? prog.page : 1;
}

module.exports = { saveProgress, getProgress };
