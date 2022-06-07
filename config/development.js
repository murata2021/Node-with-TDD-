module.exports = {
  database: {
    database: 'hoaxify',
    username: 'my-db-user',
    password: 'db-p4ss',
    dialect: 'sqlite',
    storage: './database.sqlite',
    logging: false,
  },
  mail: {
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
      user: 'jlyksfjsyobpqctq@ethereal.email',
      pass: '79bGPqXSyCmha2KY8H',
    },
  },
  uploadDir:'uploads-dev',
  profileDir:'profile',
  attachmentDir:'attachment',
};
