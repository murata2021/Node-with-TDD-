const request = require('supertest');
const app = require('../src/app');
const User = require('../src/user/User');
const Hoax = require('../src/hoax/Hoax');

const FileAttachment = require('../src/file/FileAttachment');
const fs = require('fs');
const path = require('path');
const config = require('config');

const { uploadDir, attachmentDir } = config;
const attachmentFolder = path.join('.', uploadDir, attachmentDir);

const filename = 'test-file-hoax-delete';
const targetPath = path.join(attachmentFolder, filename);
const testFilePath = path.join('.', '__tests__', 'resources', 'test-png.png');

const sequelize = require('../src/config/database');
const bcrypt = require('bcrypt');

beforeAll(async () => {
  if (process.env.NODE_ENV === 'test') {
    await sequelize.sync();
  }
});

beforeEach(async () => {
  //it clears User table
  await User.destroy({ truncate: { cascade: true } });

  if (fs.existsSync(targetPath)) {
    fs.unlinkSync(targetPath);
  }
});

const deleteHoax = async (id = 5, options = {}) => {
  let agent = request(app).delete('/api/1.0/hoaxes/' + id);
  if (options.token) {
    agent.set('Authorization', `Bearer ${options.token}`);
  }
  return agent.send();
};

const activeUser = { username: 'user1', email: 'user1@mail.com', password: 'P4ssword', inactive: false };
const inactiveUser = { username: 'user1', email: 'user1@mail.com', password: 'P4ssword', inactive: true };
const credentials = { email: 'user1@mail.com', password: 'P4ssword' };

const addUser = async (user = activeUser) => {
  const hashedPwd = await bcrypt.hash(user.password, 12);
  return User.create({ ...user, password: hashedPwd });
};

const addFileAttachment = async (hoaxId) => {
  fs.copyFileSync(testFilePath, targetPath);
  return await FileAttachment.create({
    filename: filename,
    uploadDate: new Date(),
    hoaxId: hoaxId,
  });
};

const auth = async (options = {}) => {
  let token;
  if (options.auth) {
    const response = await request(app).post('/api/1.0/auth').send(options.auth);
    token = response.body.token;
  }
  return token;
};

const addHoax = async (userId) => {
  return await Hoax.create({
    content: 'Hoax for user',
    timestamp: Date.now(),
    userId: userId,
  });
};
// const postHoax = async (body = null, options = {}) => {
//   let agent = request(app);
//   let token;
//   if (options.auth) {
//     const response = await agent.post('/api/1.0/auth').send(options.auth);
//     token = response.body.token;
//   }
//   agent = request(app).post('/api/1.0/hoaxes');
//   if (token) {
//     agent.set('Authorization', `Bearer ${token}`);
//     console.log(token);
//   }

//   if (options.token) {
//     agent.set('Authorization', `Bearer ${options.token}`);
//   }
//   return agent.send(body);
// };

describe('Delete Hoax', () => {
  it('returns forbidden when request is unauthorized', async () => {
    const response = await deleteHoax();
    expect(response.status).toBe(403);
  });
  it('returns 403 when token is invalid', async () => {
    const response = await deleteHoax(5, { token: 'abcde' });
    expect(response.status).toBe(403);
  });
  it('returns error body with message for unauthorized request ', async () => {
    const nowInMillis = new Date().getTime();
    const response = await deleteHoax(5, { token: 'abcde' });
    const error = response.body;
    expect(error.path).toBe('/api/1.0/hoaxes/5');
    expect(error.timestamp).toBeGreaterThan(nowInMillis);
    expect(error.message).toBe('You are not authorized to delete this hoax');
  });

  it('returns 403 when delete request is sent with correct credentials but for different user', async () => {
    const user = await addUser();
    const hoax = await addHoax(user.id);
    const user5 = await addUser({ ...activeUser, username: 'user5', email: 'user5@mail.com' });

    const token = await auth({
      auth: {
        email: user5.email,
        password: user5.password,
      },
    });
    const response = await deleteHoax(hoax.id, { token: token });
    expect(response.status).toBe(403);
  });

  it('returns 200 ok when user deletes their hoax', async () => {
    const user = await addUser();
    const hoax = await addHoax(user.id);
    const token = await auth({
      auth: credentials,
    });
    const response = await deleteHoax(hoax.id, { token: token });
    expect(response.status).toBe(200);
  });

  it('removes the hoax from the database when user deletes their hoax', async () => {
    const user = await addUser();
    const hoax = await addHoax(user.id);
    const token = await auth({
      auth: credentials,
    });
    await deleteHoax(hoax.id, { token: token });

    const hoaxInDb = await Hoax.findOne({ where: { id: hoax.id } });
    expect(hoaxInDb).toBeNull();
  });

  it('removes the fileAttachment from database when user deletes their hoax', async () => {
    const user = await addUser();
    const hoax = await addHoax(user.id);

    const attachment = await addFileAttachment(hoax.id);
    const token = await auth({
      auth: credentials,
    });
    await deleteHoax(hoax.id, { token: token });

    const attachmentInDb = await FileAttachment.findOne({ where: { id: attachment.id } });
    expect(attachmentInDb).toBeNull();
  });

  it('removes the file from storage when user deletes their hoax', async () => {
    const user = await addUser();
    const hoax = await addHoax(user.id);
    const attachment = await addFileAttachment(hoax.id);
    const token = await auth({
      auth: credentials,
    });
    await deleteHoax(hoax.id, { token: token });

    console.log(targetPath)
    expect(fs.existsSync(targetPath)).toBe(false)


    
  });
});
