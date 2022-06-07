const jwt = require('jsonwebtoken');
const { randomString } = require('../shared/generator');
const Token = require('./Token');
const Sequelize = require('sequelize');

const createToken = async (user) => {
  //generates token
  const token = randomString(32);
  await Token.create({
    token,
    userId: user.id,
    lastUsedAt: new Date(),
  });
  return token;
  //   return jwt.sign({ id: user.id }, 'this-is-our-secret');
};

const verify = async (token) => {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 - 1);
  //second condition checks that if token created older than oneWeekAgo
  //implies expired token
  const tokenInDB = await Token.findOne({
    where: {
      token: token,
      lastUsedAt: {
        [Sequelize.Op.gt]: oneWeekAgo,
      },
    },
  });
  tokenInDB.lastUsedAt = new Date();
  await tokenInDB.save();
  const userId = tokenInDB.userId;
  return { id: userId };
  //   return jwt.verify(token, 'this-is-our-secret');
};

const deleteToken = async (token) => {
  await Token.destroy({ where: { token: token } });
};

const scheduleCleanUp = async () => {
  setInterval(async () => {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 - 1);
    //removes token older than one week
    await Token.destroy({
      where: {
        lastUsedAt: {
          [Sequelize.Op.lt]: oneWeekAgo,
        },
      },
    });
  }, 60 * 60 * 1000);
};

const clearTokens = async (userId) => {
  await Token.destroy({ where: { userId: userId } });
};

module.exports = { createToken, verify, deleteToken, scheduleCleanUp, clearTokens };
