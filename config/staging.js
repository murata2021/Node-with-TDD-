module.exports = {
  database: {
    database: 'hoaxify',
    username: 'murat',
    password: 1234,
    host:'localhost',
    dialect: 'postgres',
    // storage: './staging.sqlite',
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
  uploadDir:'uploads-staging',
  profileDir:'profile',
  attachmentDir:'attachment',

};
