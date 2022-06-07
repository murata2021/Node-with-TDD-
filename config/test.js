module.exports = {
  database: {
    database: 'hoaxify',
    username: 'my-db-user',
    password: 'db-p4ss',
    dialect: 'sqlite',
    storage: ':memory:',
    logging: false,
  },
  mail: {
    host: 'localhost',
    //we were using smtp server for different test specs
    //that created conflicts, to solve it we made port number dynamic
    port: Math.floor(Math.random()*2000)+10000,
    tls: {
      rejectUnauthorized: false,
    },
  },
  uploadDir:'uploads-test',
  profileDir:'profile',
  attachmentDir:'attachment',
};
