const Sequelize = require('sequelize');
const config = require('config');

require('pg').defaults.parseInt8 = true;

const dbConfig = config.get('database');

console.log(dbConfig)

const sequelize = new Sequelize(dbConfig.database, dbConfig.username, dbConfig.password, {
  dialect: dbConfig.dialect,
  storage: dbConfig.storage,
  logging: dbConfig.logging,
});

try {
  await sequelize.authenticate();
  console.log('Connection has been established successfully.');
} catch (error) {
  console.error('Unable to connect to the database:', error);
}

module.exports = sequelize;
