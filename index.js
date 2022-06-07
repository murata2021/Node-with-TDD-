const app = require('./src/app');
const sequelize = require('./src/config/database');
const User = require('./src/user/User');
const bcrypt = require('bcrypt');
const tokenService = require('./src/auth/tokenService');
const FileService = require('./src/file/FileService');
const logger = require('./src/shared/logger');

// const addUsers = async (activeUserCount, inactiveUserCount = 0) => {
//   const hashedPwd = await bcrypt.hash('P4ssword', 12);

//   for (let i = 0; i < activeUserCount + inactiveUserCount; i++) {

//     await User.create({
//       username: `user${i + 1}`,
//       email: `user${i + 1}@mail.com`,
//       password:hashedPwd,
//       inactive: i >= activeUserCount,
//     });
//   }
// };

//for the production mode we don need that force parameter since
//it creates tables from the scratch

// sequelize.sync({force:true}).then(async()=>{
//   await addUsers(25)
// });

sequelize.sync().then(async () => {
  // await addUsers(25)
});

tokenService.scheduleCleanUp();

FileService.removeUnusedAttachments();

app.listen(3000, () => {
  logger.info('app is running');
  // console.log('APP IS RUNNING');
});
