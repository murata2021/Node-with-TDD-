const request = require('supertest');
const app = require('../src/app');
const sequelize = require('../src/config/database');
const bcrypt = require('bcrypt');
const path = require('path');

const User = require('../src/user/User');
const Hoax = require('../src/hoax/Hoax');
const FileAttachment = require('../src/file/FileAttachment');

beforeAll(async () => {
  if (process.env.NODE_ENV === 'test') {
    await sequelize.sync();
  }
});

beforeEach(async () => {
  await FileAttachment.destroy({ truncate: true });
  await User.destroy({ truncate: { cascade: true } });
});



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

const activeUser = { username: 'user1', email: 'user1@mail.com', password: 'P4ssword', inactive: false };
const inactiveUser = { username: 'user1', email: 'user1@mail.com', password: 'P4ssword', inactive: true };
const credentials = { email: 'user1@mail.com', password: 'P4ssword' };

const addUser = async (user = activeUser) => {
  const hashedPwd = await bcrypt.hash(user.password, 12);
  return User.create({ ...user, password: hashedPwd });
};

const uploadFile = (file = 'test-png.png') => {
  return request(app)
    .post('/api/1.0/hoaxes/attachments')
    .attach('file', path.join('.', '__tests__', 'resources', file));
};

describe('Post Hoax', () => {
  it('returns 401 when hoax post request has no authentication', async () => {
    const response = await postHoax();
    expect(response.status).toBe(401);
  });

  it('returns error body with proper error message when unauthorized request sent', async () => {
    const nowInMillis = Date.now();
    const response = await postHoax();
    const error = response.body;

    expect(error.path).toBe('/api/1.0/hoaxes');
    expect(error.message).toBe('You are not authorized to post hoax');
    expect(error.timestamp).toBeGreaterThan(nowInMillis);
  });

  it('returns 200 when valid hoax submitted with authorized user', async () => {
    await addUser();
    const response = await postHoax({ content: 'Hoax content' }, { auth: credentials });
    expect(response.status).toBe(200);
  });

  it('saves the hoax to database when authorized user sends valid request', async () => {
    await addUser();
    await postHoax({ content: 'Hoax content' }, { auth: credentials });
    const hoaxes = await Hoax.findAll();
    expect(hoaxes.length).toBe(1);
  });

  it('saves the hoax content and timestampto database', async () => {
    await addUser();
    const beforeSubmit = Date.now();
    await postHoax({ content: 'Hoax content' }, { auth: credentials });
    const hoaxes = await Hoax.findAll();
    const savedHoax = hoaxes[0];
    expect(savedHoax.content).toBe('Hoax content');
    expect(savedHoax.timestamp).toBeGreaterThan(beforeSubmit);
    expect(savedHoax.timestamp).toBeLessThan(Date.now());
  });

  it('returns proper message to success submit', async () => {
    await addUser();
    const response = await postHoax({ content: 'Hoax content' }, { auth: credentials });
    expect(response.body.message).toBe('Hoax is saved');
  });

  it('returns 400 and validation error message when hoax content is less than 10 characters', async () => {
    await addUser();
    const response = await postHoax({ content: 'a'.repeat(9) }, { auth: credentials });
    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Validation Failure');
  });

  it('returns validation error body when an invalid hoax post by author', async () => {
    await addUser();
    const nowInMillis = Date.now();
    const response = await postHoax({ content: 'a'.repeat(9) }, { auth: credentials });
    const error = response.body;
    expect(error.timestamp).toBeGreaterThan(nowInMillis);
    expect(error.path).toEqual('/api/1.0/hoaxes');
    expect(Object.keys(error)).toEqual(['path', 'timestamp', 'message', 'validationErrors']);
  });

  it.each`
    content             | message                                          | contentDescription
    ${null}             | ${'Hoax must be min 10 and max 5000 characters'} | ${'null'}
    ${'a'.repeat(9)}    | ${'Hoax must be min 10 and max 5000 characters'} | ${'short text'}
    ${'a'.repeat(5001)} | ${'Hoax must be min 10 and max 5000 characters'} | ${'long text'}
  `('returns $message when the content is $contentDescription', async ({ content, message }) => {
    await addUser();
    const response = await postHoax({ content: content }, { auth: credentials });
    const error = response.body;
    expect(error.validationErrors.content).toEqual(message);
  });

  it('stores hoax owner id in the database', async () => {
    const user = await addUser();
    await postHoax({ content: 'Hoax content' }, { auth: credentials });
    const hoaxes = await Hoax.findAll();
    const hoax = hoaxes[0];
    expect(hoax.userId).toBe(user.id);
  });

  it('associates hoax with attachment in the database', async () => {
    const uploadResponse = await uploadFile();
    const uploadedFileId = uploadResponse.body.id;
    await addUser();
    await postHoax(
      {
        content: 'Hoax content',
        fileAttachment: uploadedFileId,
      },
      { auth: credentials }
    );
    const hoaxes = await Hoax.findAll();
    const hoax = hoaxes[0];
    const attachmentInDb = await FileAttachment.findOne({ where: { id: uploadedFileId } });
    expect(attachmentInDb.hoaxId).toBe(hoax.id);
  });

  it('returns 200 ok even the attachment does not exist', async () => {
    const user = await addUser();
    const response = await postHoax({ content: 'Hoax content', fileAttachment: 1000 }, { auth: credentials });
    expect(response.status).toBe(200);
  });

  it('keeps the old associated hoax when new hoax submitted with old attachment', async () => {
    const uploadResponse = await uploadFile();
    const uploadedFileId = uploadResponse.body.id;
    await addUser();
    await postHoax(
      {
        content: 'Hoax content',
        fileAttachment: uploadedFileId,
      },
      { auth: credentials }
    );
    const attachment = await FileAttachment.findOne({ where: { id: uploadedFileId } });
    await postHoax(
      {
        content: 'Hoax content 2',
        fileAttachment: uploadedFileId,
      },
      { auth: credentials }
    );
    const attachmentAfterSecondPost = await FileAttachment.findOne({ where: { id: uploadedFileId } });
    expect(attachment.hoaxId).toBe(attachmentAfterSecondPost.hoaxId);
  });
});
