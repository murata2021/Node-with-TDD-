const profiles=require('../config');

const dbConfigs={}
Object.keys(profiles).forEach((profile)=>{
  dbConfigs[profile]={...profiles[profile].database}
})

console.log(dbConfigs)
module.exports=dbConfigs;
// module.exports = {
//   development: {
//     username: 'my-db-user',
//     password: 'db-p4ss',
//     database: 'hoaxify',
//     host: 'localhost',
//     dialect: 'sqlite',
//     storage: './database.sqlite',
//   },
//   staging: {
//     username: 'my-db-user',
//     password: 'db-p4ss',
//     database: 'hoaxify',
//     host: 'localhost',
//     dialect: 'sqlite',
//     storage: './staging.sqlite',
//   },
//   test: {
//     username: 'root',
//     password: null,
//     database: 'database_test',
//     host: '127.0.0.1',
//     dialect: 'mysql',
//   },
//   production: {
//     username: 'root',
//     password: null,
//     database: 'database_production',
//     host: '127.0.0.1',
//     dialect: 'mysql',
//   },
// };
