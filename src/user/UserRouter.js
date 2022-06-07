const express = require('express');
const router = express.Router();
const UserService = require('./UserService');
const { check, validationResult } = require('express-validator');
const ValidationException = require('../error/ValidationException');
const { pagination } = require('../middleware/pagination');
const bcrypt = require('bcrypt');
const ForbiddenException = require('../error/ForbiddenException');
const User = require('./User');
const NotFoundException = require('../error/NotFoundException');
// const { tokenAuthentication } = require('../middleware/tokenAuthentication');
const FileType = require('file-type');
const FileService=require('../file/FileService')

router.post(
  '/api/1.0/users',
  check('username')
    .notEmpty()
    .withMessage('Username cannot be null')
    .bail()
    .isLength({ min: 4, max: 32 })
    .withMessage('Must have min 4 and max 32 characters'),
  check('email')
    .notEmpty()
    .withMessage('E-mail cannot be null')
    .bail()
    .isEmail()
    .withMessage('E-mail is not valid')
    .bail()
    .custom(async (email) => {
      const user = await UserService.findByEmail(email);
      if (user) {
        throw new Error('E-mail in use');
      }
    }),
  check('password')
    .notEmpty()
    .withMessage('Password cannot be null')
    .bail()
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
    .bail()
    .matches(/^(?:(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).*)$/)
    .withMessage('Password must have at least 1 uppercase, 1 lowercase letter and 1 number'),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ValidationException(errors.array()));
    }

    try {
      await UserService.save(req.body);
      return res.send({ message: 'User created' });
    } catch (error) {
      next(error);
    }
  }
);

router.post('/api/1.0/users/token/:token', async (req, res, next) => {
  const token = req.params.token;
  try {
    await UserService.activate(token);
    return res.send({ message: 'Account is activated' });
  } catch (error) {
    next(error);
  }
});

router.get(
  '/api/1.0/users',
  pagination,
  //  tokenAuthentication , //we no longer need it since we add it to app.use(tokenAuthentication)
  async (req, res, next) => {
    const authenticatedUser = req.authenticatedUser;
    const { size, page } = req.pagination;
    const users = await UserService.getUsers(page, size, authenticatedUser);
    res.status(200).send(users);
  }
);

router.get('/api/1.0/users/:id', async (req, res, next) => {
  const id = +req.params.id;
  try {
    const user = await UserService.getUser(id);
    return res.status(200).send(user);
  } catch (error) {
    next(error);
  }
});

router.put(
  '/api/1.0/users/:id',
  check('username')
    .notEmpty()
    .withMessage('Username cannot be null')
    .bail()
    .isLength({ min: 4, max: 32 })
    .withMessage('Must have min 4 and max 32 characters'),
  check('image').custom(async (imageAsBase64String) => {
    if (!imageAsBase64String) {
      return true;
    }
    const buffer = Buffer.from(imageAsBase64String, 'base64');
    //Checks file size
    if (!FileService.isLessThan2MB(buffer)) {
      throw Error('Your profile image cannot be bigger than 2MB');
    }
    //checks file type
    const supportedType = await FileService.isSupportedFileType(buffer);
    if (!supportedType) {
      throw new Error('Only JPEG or PNG files are allowed');
    }
    return true;
  }),
  //  tokenAuthentication,
  async (req, res, next) => {
    const id = +req.params.id;
    const authenticatedUser = req.authenticatedUser;
    if (!authenticatedUser || authenticatedUser.id !== id) {
      return next(new ForbiddenException('You are not authorized to update the user'));
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ValidationException(errors.array()));
    }

    const user = await UserService.updateUser(id, req.body);
    return res.send(user);
  }
);

router.delete(
  '/api/1.0/users/:id',
  //  tokenAuthentication,
  async (req, res, next) => {
    const authenticatedUser = req.authenticatedUser;
    const id = +req.params.id;

    if (!authenticatedUser || authenticatedUser.id !== id) {
      return next(new ForbiddenException('You are not authorized to delete the user'));
    }
    await UserService.deleteUser(id);

    return res.send();
  }
);

router.post(
  '/api/1.0/user/password',
  check('email').isEmail().withMessage('E-mail is not valid'),
  async (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return next(new ValidationException(errors.array()));
    }
    try {
      await UserService.passwordResetRequest(req.body.email);
      return res.send({ message: 'Check your e-mail for resetting your password' });
    } catch (error) {
      next(error);
    }
  }
);

const passwordResetTokenValidator = async (req, res, next) => {
  const user = await UserService.findByPasswordResetToken(req.body.passwordResetToken);
  if (!user) {
    next(
      new ForbiddenException(
        'You are not authorized to update your password. Please follow the password reset steps again'
      )
    );
  }
  next();
};

router.put(
  '/api/1.0/user/password',
  passwordResetTokenValidator,
  check('password')
    .notEmpty()
    .withMessage('Password cannot be null')
    .bail()
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
    .bail()
    .matches(/^(?:(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).*)$/)
    .withMessage('Password must have at least 1 uppercase, 1 lowercase letter and 1 number'),
  async (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return next(new ValidationException(errors.array()));
    }
    await UserService.updatePassword(req.body);
    return res.send();
  }
);

module.exports = router;
