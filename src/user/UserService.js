const User = require('./User');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const EmailService = require('../email/EmailService');
const sequelize = require('../config/database');
const EmailException = require('../email/EmailException');
const InvalidTokenException = require('./InvalidTokenException');
const UserNotFoundException = require('./UserNotFoundException');
const Sequelize = require('sequelize');
const { randomString } = require('../shared/generator');
const tokenService = require('../auth/tokenService');
const NotFoundException = require('../error/NotFoundException');
const FileService = require('../file/FileService');
// const generateToken = (length) => {
//   return crypto.randomBytes(length).toString('hex').substring(0, length);
// };

const save = async (body) => {
  const hashedPwd = await bcrypt.hash(body.password, 12);
  const { username, email } = body;
  const transaction = await sequelize.transaction();
  const newUser = {
    username,
    email,
    password: hashedPwd,
    // activationToken: generateToken(16),
    activationToken: randomString(16),
  };
  await User.create(newUser, { transaction });
  try {
    await EmailService.sendAccountActivation(newUser.email, newUser.activationToken);
    await transaction.commit();
  } catch (err) {
    await transaction.rollback();
    throw new EmailException();
  }
};

const findByEmail = async (email) => {
  return await User.findOne({ where: { email } });
};

const activate = async (token) => {
  const user = await User.findOne({ where: { activationToken: token } });

  if (!user) {
    throw new InvalidTokenException();
  }
  user.inactive = false;
  user.activationToken = null;
  await user.save();
};

const getUsers = async (page, size, authenticatedUser) => {
  const usersWithCount = await User.findAndCountAll({
    where: {
      inactive: false,
      id: {
        [Sequelize.Op.not]: authenticatedUser ? authenticatedUser.id : 0,
      },
    },
    attributes: ['id', 'username', 'email', 'image'],
    offset: page * size,
    limit: size,
  });
  return {
    content: usersWithCount.rows,
    page,
    size,
    totalPages: Math.ceil(usersWithCount.count / size),
  };
};

const getUser = async (id) => {
  const user = await User.findOne({
    where: {
      id,
      inactive: false,
    },
    attributes: ['id', 'username', 'email', 'image'],
  });
  if (!user) throw new UserNotFoundException();

  return user;
};

const updateUser = async (id, updatedBody) => {
  const user = await User.findOne({ where: { id } });
  user.username = updatedBody.username;

  if (updatedBody.image) {
    if (user.image) {
      await FileService.deleteProfileImage(user.image);
    }
    user.image = await FileService.saveProfileImage(updatedBody.image);
  }
  await user.save();

  return {
    id,
    username: user.username,
    email: user.email,
    image: user.image,
  };
};

const deleteUser = async (id) => {
  const user = await User.findOne({ where: { id: id } });

  await FileService.deleteUserFiles(user)
  
  await user.destroy();
};

const passwordResetRequest = async (email) => {
  const user = await findByEmail(email);
  if (!user) {
    throw new NotFoundException('E-mail not found');
  }
  user.passwordResetToken = randomString(16);
  await user.save();
  try {
    await EmailService.sendPasswordReset(email, user.passwordResetToken);
  } catch (error) {
    throw new EmailException();
  }
};

const updatePassword = async (updateRequest) => {
  const user = await findByPasswordResetToken(updateRequest.passwordResetToken);
  const hash = await bcrypt.hash(updateRequest.password, 10);
  user.password = hash;
  user.passwordResetToken = null;
  user.inactive = false;
  user.activationToken = null;
  await user.save();
  await tokenService.clearTokens(user.id);
};

const findByPasswordResetToken = (token) => {
  return User.findOne({ where: { passwordResetToken: token } });
};

module.exports = {
  save,
  findByEmail,
  activate,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  passwordResetRequest,
  updatePassword,
  findByPasswordResetToken,
};
