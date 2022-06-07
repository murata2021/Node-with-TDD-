const request = require('supertest');
const app = require('../src/app');
const sequelize = require('../src/config/database');
const User = require('../src/user/User');
const Hoax = require('../src/hoax/Hoax');
const FileAttachment = require('../src/file/FileAttachment');

beforeAll(async () => {
  //initializing the database
  if (process.env.NODE_ENV === 'test') {
    await sequelize.sync();
  }
});

beforeEach(async () => {
  await FileAttachment.destroy({ truncate: true });
  await User.destroy({ truncate: { cascade: true } });
});

const addFileAttachment = async (hoaxId) => {
  await FileAttachment.create({
    filename: `test-file-for-hoax-${hoaxId}`,
    fileType: 'image/png',
    hoaxId,
  });
};

describe('Listing All Hoaxes', () => {
  

  const getHoaxes = () => {
    const agent = request(app).get('/api/1.0/hoaxes');
    return agent;
  };

  const addHoaxes = async (count) => {
    const hoaxIds = [];
    for (let i = 0; i < count; i++) {
      const user = await User.create({
        username: `user${i + 1}`,
        email: `user${i + 1}@mail.com`,
      });
      const hoax = await Hoax.create({
        content: `hoax content ${i + 1}`,
        timestamp: Date.now(),
        userId: user.id,
      });
      hoaxIds.push(hoax.id);
    }
    return hoaxIds;
  };

  it('returns 200 ok when there are no hoax in database', async () => {
    const response = await getHoaxes();
    expect(response.status).toBe(200);
  });

  it('returns page object as response body', async () => {
    const response = await getHoaxes();
    expect(response.body).toEqual({
      content: [],
      page: 0,
      size: 10,
      totalPages: 0,
    });
  });

  it('returns 10 hoaxes in page content when there are 11 hoaxes in database', async () => {
    await addHoaxes(11);
    const response = await getHoaxes();
    console.log(response.body.content);
    expect(response.body.content.length).toBe(10);
  });

  it('returns only id, content, timesatamp and user object having id,username,email and image in content array for each hoax', async () => {
  
    await addHoaxes(11);
    const response = await getHoaxes();
    const hoax = response.body.content[0];
    const hoaxKeys = Object.keys(hoax);
    const userKeys = Object.keys(hoax.user);
    expect(userKeys).toEqual(['id', 'username', 'email', 'image']);
    expect(hoaxKeys).toEqual(['id', 'content', 'timestamp', 'user']);
  });

  it('returns fileAttachment having fileName, fileType if hoax has any attachment', async () => {
    const hoaxIds = await addHoaxes(1);
    await addFileAttachment(hoaxIds[0]);
    const response = await getHoaxes();
    const hoax = response.body.content[0];

    const hoaxKeys = Object.keys(hoax);
    expect(hoaxKeys).toEqual(['id', 'content', 'timestamp', 'user', 'fileAttachment']);

    const fileAttachmentKeys = Object.keys(hoax.fileAttachment);
    expect(fileAttachmentKeys).toEqual(['filename', 'fileType']);
  });

  it('returns 2 as totalPages when there are 11 hoaxes', async () => {
    await addHoaxes(11);
    const response = await getHoaxes();
    expect(response.body.totalPages).toBe(2);
  });

  it('returns second page hoaxes and page indicator when page is set as 1 in request parameter', async () => {
    await addHoaxes(11);
    const response = await getHoaxes().query({ page: 1 });
    //hoaxes are sorted=>the newest first that's why hoax content 1 gonna be the last hoax
    expect(response.body.content[0].content).toBe('hoax content 1');
    expect(response.body.page).toBe(1);
  });

  it('returns first page when page is set below zero as a request parameter ', async () => {
    await addHoaxes(11);
    const response = await getHoaxes().query({ page: -2 });
    expect(response.body.page).toBe(0);
  });

  it('returns 5 hoaxes and corresponding size indicator when size is set as 5 in request parameter', async () => {
    await addHoaxes(11);
    const response = await getHoaxes().query({ size: 5 });
    expect(response.body.content.length).toBe(5);
    expect(response.body.size).toBe(5);
  });

  it('returns 10 hoaxes and corresponding size indicator when size is set 1000', async () => {
    await addHoaxes(11);
    const response = await getHoaxes().query({ size: 1000 });
    expect(response.body.content.length).toBe(10);
    expect(response.body.size).toBe(10);
  });

  it('returns 10 hoaxes and corresponding size indicator when size is set 0', async () => {
    await addHoaxes(11);
    const response = await getHoaxes().query({ size: 0 });
    expect(response.body.content.length).toBe(10);
    expect(response.body.size).toBe(10);
  });

  it('returns page as zero and size as 10 when non-numeric query params provided for both', async () => {
    await addHoaxes(11);
    const response = await getHoaxes().query({ page: 'page', size: 'size' });
    expect(response.body.size).toBe(10);
    expect(response.body.page).toBe(0);
  });

  it('returns hoaxes to be ordered from new to old', async () => {
    await addHoaxes(11);
    const response = await getHoaxes();
    const firstHoax = response.body.content[0];
    const lastHoax = response.body.content[9];
    expect(firstHoax.timestamp).toBeGreaterThan(lastHoax.timestamp);
  });
});

describe('Listing Hoaxes of a user', () => {
  const addUser = async (id = 1) => {
    return await User.create({
      username: `user${id}`,
      email: `user${id}@mail.com`,
    });
  };
  const getHoaxes = (id) => {
    const agent = request(app).get(`/api/1.0/users/${id}/hoaxes`);
    return agent;
  };

  const addHoaxes = async (count, userId) => {
    const hoaxIds=[]
    for (let i = 0; i < count; i++) {
      const hoax=await Hoax.create({
        content: `hoax content ${i + 1}`,
        timestamp: Date.now(),
        userId: userId,
      });
      hoaxIds.push(hoax.id)
    }
    return hoaxIds;
  };

  it('returns 200 ok when there are no hoax in database', async () => {
    const user = await addUser();
    const response = await getHoaxes(user.id);
    expect(response.status).toBe(200);
  });

  it('returns 404 when user does not exist', async () => {
    const response = await getHoaxes(5);
    expect(response.status).toBe(404);
  });
  it('returns error object with message for unkonown user', async () => {
    const nowInMillis = Date.now();
    const response = await getHoaxes(5);
    const error = response.body;
    expect(error.message).toBe('User not found');
    expect(error.path).toBe('/api/1.0/users/5/hoaxes');
    expect(error.timestamp).toBeGreaterThan(nowInMillis);
  });
  it('returns page object as response body', async () => {
    const user = await addUser();
    const response = await getHoaxes(user.id);
    expect(response.body).toEqual({
      content: [],
      page: 0,
      size: 10,
      totalPages: 0,
    });
  });

  it('returns 10 hoaxes in page content when there are 11 hoaxes in database', async () => {
    const user = await addUser();
    await addHoaxes(11, user.id);
    const response = await getHoaxes(user.id);
    expect(response.body.content.length).toBe(10);
  });

  it('returns 5 hoaxes belongs to user in page content when there are total 11 hoaxes for two users', async () => {
    const user1 = await addUser();
    const user2 = await addUser(2);
    await addHoaxes(5, user1.id);
    await addHoaxes(6, user2.id);
    const response = await getHoaxes(user1.id);
    expect(response.body.content.length).toBe(5);
  });

  it('returns only id, content, timesatamp and user object having id,username,email and image in content array for each hoax', async () => {
    const user = await addUser();
    await addHoaxes(11, user.id);
    const response = await getHoaxes(user.id);
    const hoax = response.body.content[0];
    const hoaxKeys = Object.keys(hoax);
    const userKeys = Object.keys(hoax.user);
    expect(userKeys).toEqual(['id', 'username', 'email', 'image']);
    expect(hoaxKeys).toEqual(['id', 'content', 'timestamp', 'user']);
  });

  it('returns fileAttachment having fileName, fileType if hoax has any attachment', async () => {
    const user = await addUser();
    const hoaxIds = await addHoaxes(1,user.id);
    await addFileAttachment(hoaxIds[0]);
    const response = await getHoaxes(user.id);
    const hoax = response.body.content[0];

    const hoaxKeys = Object.keys(hoax);
    expect(hoaxKeys).toEqual(['id', 'content', 'timestamp', 'user', 'fileAttachment']);

    const fileAttachmentKeys = Object.keys(hoax.fileAttachment);
    expect(fileAttachmentKeys).toEqual(['filename', 'fileType']);
  });

  it('returns 2 as totalPages when there are 11 hoaxes', async () => {
    const user = await addUser();
    await addHoaxes(11, user.id);
    const response = await getHoaxes(user.id);
    expect(response.body.totalPages).toBe(2);
  });

  it('returns second page hoaxes and page indicator when page is set as 1 in request parameter', async () => {
    const user = await addUser();
    await addHoaxes(11, user.id);
    const response = await getHoaxes(user.id).query({ page: 1 });
    //hoaxes are sorted=>the newest first that's why hoax content 1 gonna be the last hoax
    expect(response.body.content[0].content).toBe('hoax content 1');
    expect(response.body.page).toBe(1);
  });

  it('returns first page when page is set below zero as a request parameter ', async () => {
    const user = await addUser();
    await addHoaxes(11, user.id);
    const response = await getHoaxes(user.id).query({ page: -2 });
    expect(response.body.page).toBe(0);
  });

  it('returns 5 hoaxes and corresponding size indicator when size is set as 5 in request parameter', async () => {
    const user = await addUser();
    await addHoaxes(11, user.id);
    const response = await getHoaxes(user.id).query({ size: 5 });
    expect(response.body.content.length).toBe(5);
    expect(response.body.size).toBe(5);
  });

  it('returns 10 hoaxes and corresponding size indicator when size is set 1000', async () => {
    const user = await addUser();
    await addHoaxes(11, user.id);
    const response = await getHoaxes(user.id).query({ size: 1000 });
    expect(response.body.content.length).toBe(10);
    expect(response.body.size).toBe(10);
  });

  it('returns 10 hoaxes and corresponding size indicator when size is set 0', async () => {
    const user = await addUser();
    await addHoaxes(11, user.id);
    const response = await getHoaxes(user.id).query({ size: 0 });
    expect(response.body.content.length).toBe(10);
    expect(response.body.size).toBe(10);
  });

  it('returns page as zero and size as 10 when non-numeric query params provided for both', async () => {
    const user = await addUser();
    await addHoaxes(11, user.id);
    const response = await getHoaxes(user.id).query({ page: 'page', size: 'size' });
    expect(response.body.size).toBe(10);
    expect(response.body.page).toBe(0);
  });

  it('returns hoaxes to be ordered from new to old', async () => {
    const user = await addUser();
    await addHoaxes(11, user.id);
    const response = await getHoaxes(user.id);
    const firstHoax = response.body.content[0];
    const lastHoax = response.body.content[9];
    expect(firstHoax.timestamp).toBeGreaterThan(lastHoax.timestamp);
  });
});
