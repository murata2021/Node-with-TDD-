const request = require('supertest');
const app = require('../src/app');
const User = require('../src/user/User');
const Token = require('../src/auth/Token');
const Hoax = require('../src/hoax/Hoax');
const FileAttachment=require('../src/file/FileAttachment')

const sequelize = require('../src/config/database');
const bcrypt = require('bcrypt');

const fs = require('fs');
const path = require('path');
const config = require('config');

const { uploadDir, profileDir,attachmentDir } = config;
const profileFolder = path.join('.', uploadDir, profileDir);
const attachmentFolder = path.join('.', uploadDir, attachmentDir);


// const filename = 'test-file-hoax-delete';
// const targetPath = path.join(attachmentFolder, filename);
// const testFilePath = path.join('.', '__tests__', 'resources', 'test-png.png');
beforeAll(async () => {
  if (process.env.NODE_ENV === 'test') {
    await sequelize.sync();
  }
});

beforeEach(async () => {
  //it clears User table
  await User.destroy({ truncate: { cascade: true } });
});

const deleteUser = async (id = 5, options = {}) => {
  let agent = request(app).delete('/api/1.0/users/' + id);
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

const auth = async (options = {}) => {
  let token;
  if (options.auth) {
    const response = await request(app).post('/api/1.0/auth').send(options.auth);
    token = response.body.token;
  }
  return token;
};

const postHoax = async (body = null, options = {}) => {
  let agent = request(app);
  let token;
  if (options.auth) {
    const response = await agent.post('/api/1.0/auth').send(options.auth);
    token = response.body.token;
  }
  agent = request(app).post('/api/1.0/hoaxes');
  if (token) {
    agent.set('Authorization', `Bearer ${token}`);
    console.log(token);
  }

  if (options.token) {
    agent.set('Authorization', `Bearer ${options.token}`);
  }
  return agent.send(body);
};

describe('User Delete', () => {
  it('returns forbidden when request sent unauthorized', async () => {
    const response = await deleteUser();
    expect(response.status).toBe(403);
  });

  it('returns error body with message for unauthorized request ', async () => {
    const nowInMillis = new Date().getTime();
    const response = await deleteUser();
    const error = response.body;
    expect(error.path).toBe('/api/1.0/users/5');
    expect(error.timestamp).toBeGreaterThan(nowInMillis);
    expect(error.message).toBe('You are not authorized to delete the user');
  });

  it('returns forbidden when delete request is sent with correct credentials but for different user', async () => {
    await addUser();
    const userToBeDeleted = await addUser({ ...activeUser, username: 'user2', email: 'user2@mail.com' });
    const token = await auth({
      auth: credentials,
    });
    const response = await deleteUser(userToBeDeleted.id, { token: token });
    expect(response.status).toBe(403);
  });

  it('returns 403 when token is not valid', async () => {
    const response = await deleteUser(5, { token: '123' });
    expect(response.status).toBe(403);
  });

  it('returns 200 ok when delete request sent from authorized user', async () => {
    const savedUser = await addUser();
    const token = await auth({
      auth: credentials,
    });
    const response = await deleteUser(savedUser.id, { token: token });
    expect(response.status).toBe(200);
  });

  it('deletes username from database when request is sent from authorized user', async () => {
    const savedUser = await addUser();
    const token = await auth({
      auth: credentials,
    });
    await deleteUser(savedUser.id, { token: token });
    const userInDB = await User.findOne({ where: { id: savedUser.id } });
    expect(userInDB).toBe(null);
  });

  it('deletes token from database when delete user request is sent from authorized user', async () => {
    const savedUser = await addUser();
    const token = await auth({
      auth: credentials,
    });
    await deleteUser(savedUser.id, { token: token });
    const tokenInDB = await Token.findOne({ where: { token: token } });
    expect(tokenInDB).toBeNull();
  });

  it('deletes all tokens from database when delete user request is sent from authorized user', async () => {
    const savedUser = await addUser();
    const token1 = await auth({
      auth: credentials,
    });
    const token2 = await auth({
      auth: credentials,
    });

    await deleteUser(savedUser.id, { token: token1 });
    const tokenInDB = await Token.findOne({ where: { userId: savedUser.id } });
    expect(tokenInDB).toBeNull();
  });

  it('deletes hoax from database when delete user request is sent from authorized user', async () => {
    const savedUser = await addUser();
    const token = await auth({
      auth: credentials,
    });
    await postHoax({ content: 'Hoax content' }, { auth: credentials });
    await postHoax({ content: 'Hoax content for second hoax' }, { auth: credentials });
    await deleteUser(savedUser.id, { token: token });
    const hoaxes = await Hoax.findAll();
    expect(hoaxes.length).toBe(0);
  });

  it('removes profile image when user is deleted', async () => {
    const user = await addUser();
    const token = await auth({ auth: credentials });

    const storedFileName = 'profile-image-for-user1';

    const testFilePath = path.join('.', '__tests__', 'resources', 'test-png.png');
    const targetPath = path.join(profileFolder, storedFileName);
    fs.copyFileSync(testFilePath, targetPath);

    user.image = storedFileName;
    await user.save();
    await deleteUser(user.id, { token });

    expect(fs.existsSync(targetPath)).toBe(false);
  });

  it('removes hoax attachment from storage and database when user is deleted', async () => {
    const user = await addUser();
    const token = await auth({ auth: credentials });

    const storedFileName = 'hoax-attachment-for-user1';
    const testFilePath = path.join('.', '__tests__', 'resources', 'test-png.png');
    const targetPath = path.join(attachmentFolder, storedFileName);
    fs.copyFileSync(testFilePath, targetPath);

    const storedAttachment=await FileAttachment.create({filename:storedFileName})
    await postHoax(body={content:'HoaxContent',fileAttachment:storedAttachment.id},
    {token})
    await deleteUser(user.id, { token });

    const storedAttachmentAfterDelete=await FileAttachment.findOne({where:{id:storedAttachment.id}})

    expect(storedAttachmentAfterDelete).toBeNull();
    expect(fs.existsSync(targetPath)).toBe(false)
  });

  
});
