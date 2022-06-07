const request = require('supertest');
const app = require('../src/app');
const path = require('path');
const FileAttachment = require('../src/file/FileAttachment');
const sequelize = require('../src/config/database');
const fs = require('fs');
const config = require('config');
const FileService = require('../src/file/FileService');

const { uploadDir, attachmentDir } = config;

beforeAll(async () => {
  if (process.env.NODE_ENV === 'test') {
    await sequelize.sync();
  }
});

beforeEach(async () => {
  await FileAttachment.destroy({ truncate: true });
});

const uploadFile = (file = 'test-png.png') => {
  return request(app)
    .post('/api/1.0/hoaxes/attachments')
    .attach('file', path.join('.', '__tests__', 'resources', file));
};

describe('Upload File for Hoax', () => {
  it('returns 200 ok after successful upload', async () => {
    const response = await uploadFile();
    expect(response.status).toBe(200);
  });

  it('saves dynamicFilename, uploadDate as attachment object in database', async () => {
    const beforeSubmit = Date.now();
    await uploadFile();
    const attachments = await FileAttachment.findAll();
    const attachment = attachments[0];
    expect(attachment.filename).not.toBe('test-png.png');
    expect(attachment.uploadDate.getTime()).toBeGreaterThan(beforeSubmit);
  });

  it('saves file to attachment folder', async () => {
    await uploadFile();
    const attachments = await FileAttachment.findAll();
    const attachment = attachments[0];
    const filePath = path.join('.', uploadDir, attachmentDir, attachment.filename);
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it('saves file type in attachment object in database', async () => {
    await uploadFile();
    const attachments = await FileAttachment.findAll();
    const attachment = attachments[0];
    expect(attachment.fileType).toBe('image/png');
  });

  //fileType library cannot detect .txt extension that's why its value is null
  it.each`
    file              | fileType
    ${'test-png.png'} | ${'image/png'}
    ${'test-png'}     | ${'image/png'}
    ${'test-gif.gif'} | ${'image/gif'}
    ${'test-jpg.jpg'} | ${'image/jpeg'}
    ${'test-pdf.pdf'} | ${'application/pdf'}
    ${'test-txt.txt'} | ${null}
  `(
    'saves fileType as $fileType in attachment object in database when $file is uploaded',
    async ({ file, fileType }) => {
      await uploadFile(file);
      const attachments = await FileAttachment.findAll();
      const attachment = attachments[0];
      expect(attachment.fileType).toBe(fileType);
    }
  );

  it.each`
    file              | fileExtension
    ${'test-png.png'} | ${'png'}
    ${'test-png'}     | ${'png'}
    ${'test-gif.gif'} | ${'gif'}
    ${'test-jpg.jpg'} | ${'jpg'}
    ${'test-pdf.pdf'} | ${'pdf'}
    ${'test-txt.txt'} | ${null}
  `(
    'saves filename with extension $fileExtension in attachment object and stored object when when $file is uploaded',
    async ({ file, fileExtension }) => {
      await uploadFile(file);
      const attachments = await FileAttachment.findAll();
      const attachment = attachments[0];
      if (file === 'test-txt.txt') {
        expect(attachment.filename.endsWith('txt')).toBe(false);
      } else {
        expect(attachment.filename.endsWith(fileExtension)).toBe(true);
      }
      const filePath = path.join('.', uploadDir, attachmentDir, attachment.filename);
      expect(fs.existsSync(filePath)).toBe(true);
    }
  );

  it('returns 400 when uploaded file size is bigger than 5MB', async () => {
    const fiveMB = 5 * 1024 * 1024;
    const filePath = path.join('.', '__tests__', 'resources', 'random-file');
    fs.writeFileSync(filePath, 'a'.repeat(fiveMB) + 'a');
    const response = await uploadFile('random-file');
    expect(response.status).toBe(400);
    fs.unlinkSync(filePath);
  });

  it('returns 200 ok when uploaded file size is  5MB', async () => {
    const fiveMB = 5 * 1024 * 1024;
    const filePath = path.join('.', '__tests__', 'resources', 'random-file');
    fs.writeFileSync(filePath, 'a'.repeat(fiveMB));
    const response = await uploadFile('random-file');
    expect(response.status).toBe(200);
    fs.unlinkSync(filePath);
  });

  it('returns proper error message when attachment file size is bigger than 5MB', async () => {
    const fiveMB = 5 * 1024 * 1024;
    const filePath = path.join('.', '__tests__', 'resources', 'random-file');
    fs.writeFileSync(filePath, 'a'.repeat(fiveMB)+'a');
    const nowInMillis=Date.now()
    const response = await uploadFile('random-file');
    const error = response.body;
    expect(error.path).toBe('/api/1.0/hoaxes/attachments')
    expect(error.message).toBe('Uploaded file cannot be bigger than 5MB');
    expect(error.timestamp).toBeGreaterThan(nowInMillis)
    fs.unlinkSync(filePath);
  });

  it('returns attachment id in response',async()=>{
    const response=await uploadFile()
    expect(Object.keys(response.body)).toEqual(['id'])
  })
});
