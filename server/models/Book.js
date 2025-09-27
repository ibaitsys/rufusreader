const { Sequelize, DataTypes } = require('sequelize');
const sequelize = new Sequelize({ dialect: 'sqlite', storage: 'server/database.sqlite' });

const Book = sequelize.define('Book', {
  title: DataTypes.STRING,
  path: DataTypes.STRING
});

module.exports = { Book, sequelize };
