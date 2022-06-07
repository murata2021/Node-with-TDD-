const request = require('supertest');
const app = require('../src/app');
const User = require('../src/user/User');
const sequelize = require('../src/config/database');
const bcrypt = require('bcrypt');
const SMTPServer = require('smtp-server').SMTPServer;
const config = require('config');
const Token = require('../src/auth/Token');

const FileAttachment=require('../src/file/FileAttachment')

let lastMail, server;
let simulateSmtpFailure = false;
beforeAll(async () => {
  server = new SMTPServer({
    authOptional: true,
    onData(stream, session, callback) {
      let mailBody;
      stream.on('data', (data) => {
        mailBody += data.toString();
      });
      stream.on('end', () => {
        if (simulateSmtpFailure) {
          const err = new Error('invalid mailbox');
          err.responseCode = 553;

          return callback(err);
        }
        lastMail = mailBody;
        callback();
      });
    },
  });

  await server.listen(config.mail.port, 'localhost');

  //initializing the database
  if(process.env.NODE_ENV==='test'){
    await sequelize.sync();
  }
  await FileAttachment.destroy({truncate:true})
  jest.setTimeout(20000);
});

beforeEach(async () => {
  //cleaning user table before each test
  simulateSmtpFailure = false;
  await User.destroy({ truncate: { cascade: true } });
});

afterAll(async () => {
  await server.close();
  jest.setTimeout(20000);
});

const activeUser = { username: 'user1', email: 'user1@mail.com', password: 'P4ssword', inactive: false };
const inactiveUser = { username: 'user1', email: 'user1@mail.com', password: 'P4ssword', inactive: true };

const addUser = async (user = activeUser) => {
  const hashedPwd = await bcrypt.hash(user.password, 12);
  return User.create({ ...user, password: hashedPwd });
};

const postPasswordReset = (email = 'user1@mail.com', options = {}) => {
  return request(app).post('/api/1.0/user/password').send({ email });
};

const putPasswordUpdate = (body = {}, options = {}) => {
  return request(app).put('/api/1.0/user/password').send(body);
};
describe('Password Reset Request', () => {
  it('returns 404 when a password reset request is sent for unknown e-mail', async () => {
    const response = await postPasswordReset();
    expect(response.status).toBe(404);
  });
  it('returns error body with message for unknown email for password reset request', async () => {
    const nowInMillis = new Date().getTime();
    const response = await postPasswordReset();
    const error = response.body;
    expect(error.path).toBe('/api/1.0/user/password');
    expect(error.timestamp).toBeGreaterThan(nowInMillis);
    expect(error.message).toBe('E-mail not found');
  });

  it('returns 400 with validation error response having message when request does not have valid e-mail', async () => {
    const response = await postPasswordReset((email = null));
    const error = response.body;
    expect(error.validationErrors.email).toBe('E-mail is not valid');
    expect(response.status).toBe(400);
  });

  it('returns 200 ok when a password reset request is sent for known e-mail', async () => {
    const user = await addUser();
    const response = await postPasswordReset(user.email);
    expect(response.status).toBe(200);
  });

  it('returns success response body with message for known email for password reset request ', async () => {
    const user = await addUser();
    const response = await postPasswordReset(user.email);
    expect(response.body.message).toBe('Check your e-mail for resetting your password');
  });

  it('creates passwordResetToken when a password reset request is sent for known e-mail', async () => {
    const user = await addUser();
    await postPasswordReset(user.email);
    const userInDB = await User.findOne({ where: { email: user.email } });
    expect(userInDB.passwordResetToken).toBeTruthy();
  });

  it('sends a password reset e-mail with password reset token', async () => {
    const user = await addUser();
    await postPasswordReset(user.email);
    const userInDB = await User.findOne({ where: { email: user.email } });
    const passwordResetToken = userInDB.passwordResetToken;
    expect(lastMail).toContain('user1@mail.com');
    expect(lastMail).toContain(passwordResetToken);
  });

  it('returns 502 Bad Gateway when sending email fails', async () => {
    simulateSmtpFailure = true;
    const user = await addUser();
    const response = await postPasswordReset(user.email);
    expect(response.status).toBe(502);
  });

  it('returns email failure message after e-mail failure', async () => {
    simulateSmtpFailure = true;
    const user = await addUser();
    const response = await postPasswordReset(user.email);
    expect(response.body.message).toBe('E-mail Failure');
  });
});

describe('Password Update', () => {
  it('returns 403 when password update request does not have the valid password reset token', async () => {
    const response = await putPasswordUpdate({
      password: 'P4ssword',
      passwordResetToken: 'abcd',
    });
    expect(response.status).toBe(403);
  });

  it('returns error body with message after trying to update password woth the invalid token', async () => {
    const nowInMillis = new Date().getTime();
    const response = await putPasswordUpdate({
      password: 'P4ssword',
      passwordResetToken: 'abcd',
    });
    const error = response.body;
    expect(error.path).toBe('/api/1.0/user/password');
    expect(error.timestamp).toBeGreaterThan(nowInMillis);
    expect(error.message).toBe(
      'You are not authorized to update your password. Please follow the password reset steps again'
    );
  });

  it('returns 403 when password update request with invalid password pattern and the reset token is invalid', async () => {
    const response = await putPasswordUpdate({
      password: 'not-valid',
      passwordResetToken: 'abcd',
    });
    expect(response.status).toBe(403);
  });

  it('returns 400 when trying to update with invalid password and the reset token is valid', async () => {
    const user = await addUser();
    user.passwordResetToken = 'test-token';
    await user.save();
    //wrong password valid token
    const response = await putPasswordUpdate({
      password: 'not-valid',
      passwordResetToken: 'test-token',
    });

    expect(response.status).toBe(400);
  });

  it.each`
    value              | expectedMessage
    ${null}            | ${'Password cannot be null'}
    ${'P4ssw'}         | ${'Password must be at least 6 characters'}
    ${'alllowercase'}  | ${'Password must have at least 1 uppercase, 1 lowercase letter and 1 number'}
    ${'ALLUPPERCASE'}  | ${'Password must have at least 1 uppercase, 1 lowercase letter and 1 number'}
    ${'123123123'}     | ${'Password must have at least 1 uppercase, 1 lowercase letter and 1 number'}
    ${'lowerandUPPER'} | ${'Password must have at least 1 uppercase, 1 lowercase letter and 1 number'}
    ${'lower1231231'}  | ${'Password must have at least 1 uppercase, 1 lowercase letter and 1 number'}
    ${'UPPER1231231'}  | ${'Password must have at least 1 uppercase, 1 lowercase letter and 1 number'}
  `(
    'returns password validation error $expectedMessage when the new password value is set to $value',
    async ({ value, expectedMessage }) => {
      const user = await addUser();
      user.passwordResetToken = 'test-token';
      await user.save();
      //wrong password valid token
      const response = await putPasswordUpdate({
        password: value,
        passwordResetToken: 'test-token',
      });
      expect(response.body.validationErrors.password).toBe(expectedMessage);
    }
  );

  it('returns 200 when valid password is sent with valid reset token', async () => {
    const user = await addUser();
    user.passwordResetToken = 'test-token';
    await user.save();
    const response = await putPasswordUpdate({
      password: 'N3w-password',
      passwordResetToken: 'test-token',
    });
    expect(response.status).toBe(200);
  });

  it('updates the password in database when the request is valid', async () => {
    const user = await addUser();
    user.passwordResetToken = 'test-token';
    await user.save();
    await putPasswordUpdate({
      password: 'N3w-password',
      passwordResetToken: 'test-token',
    });
    const userInDB = await User.findOne({ where: { email: user.email } });
    expect(userInDB.password).not.toEqual(user.password);
  });

  it('clears the reset token in database when the request is valid', async () => {
    const user = await addUser();
    user.passwordResetToken = 'test-token';
    await user.save();
    await putPasswordUpdate({
      password: 'N3w-password',
      passwordResetToken: 'test-token',
    });
    const userInDB = await User.findOne({ where: { email: user.email } });
    expect(userInDB.passwordResetToken).toBeFalsy();
  });

  it('activates and clears activation token if the account is inactive after valid password reset', async () => {
    const user = await addUser();
    user.passwordResetToken = 'test-token';
    user.activationToken = 'activation-token';
    user.inactive = true;
    await user.save();
    await putPasswordUpdate({
      password: 'N3w-password',
      passwordResetToken: 'test-token',
    });
    const userInDB = await User.findOne({ where: { email: user.email } });
    expect(userInDB.activationToken).toBeFalsy();
    expect(userInDB.inactive).toBe(false);
  });

  it('clear all tokens of user after valid password reset', async () => {
    const user = await addUser();
    user.passwordResetToken = 'test-token';
    await user.save();
    await Token.create({
      token: 'token-1',
      userId: user.id,
      lastUsedAt: Date.now(),
    });
    await putPasswordUpdate({
      password: 'N3w-password',
      passwordResetToken: 'test-token',
    });
    const tokens = await Token.findAll({ where: { userId: user.id } });
    expect(tokens.length).toBe(0);
  });
});
