const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('./Book').sequelize;

const ReadingProgress = sequelize.define('ReadingProgress', {
  bookId: DataTypes.INTEGER,
  page: DataTypes.INTEGER
});

module.exports = { ReadingProgress };
