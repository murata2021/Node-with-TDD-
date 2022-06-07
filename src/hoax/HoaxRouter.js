const express = require('express');
const AuthenticationException = require('../auth/AuthenticationException');
const HoaxService = require('./HoaxService');
const { check, validationResult } = require('express-validator');
const ValidationException = require('../error/ValidationException');
const { pagination } = require('../middleware/pagination');
const User = require('../user/User');
const Hoax = require('./Hoax');
const ForbiddenException = require('../error/ForbiddenException');
const router = new express.Router();

router.post(
  '/api/1.0/hoaxes',
  check('content').isLength({ min: 10, max: 5000 }).withMessage('Hoax must be min 10 and max 5000 characters'),
  async (req, res, next) => {
    if (req.authenticatedUser) {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return next(new ValidationException(errors.array()));
      }
      await HoaxService.save(req.body, req.authenticatedUser);
      return res.send({ message: 'Hoax is saved' });
    }

    return next(new AuthenticationException('You are not authorized to post hoax'));
  }
);

router.get('/api/1.0/hoaxes', pagination, async (req, res, next) => {
  const { page, size } = req.pagination;
  const hoaxes = await HoaxService.getHoaxes(page, size);
  res.status(200).send(hoaxes);
});

router.get('/api/1.0/users/:userId/hoaxes', pagination, async (req, res, next) => {
  const { page, size } = req.pagination;
  try {
    const response = await HoaxService.getHoaxes(page, size, +req.params.userId);
    return res.send(response);
  } catch (error) {
    next(error);
  }
});

router.delete('/api/1.0/hoaxes/:hoaxId', async (req, res, next) => {
  if (!req.authenticatedUser) {
    return next(new ForbiddenException('You are not authorized to delete this hoax'));
  }
  try {
    await HoaxService.deleteHoax(+req.params.hoaxId, req.authenticatedUser.id);
    return res.send();

  } catch (error) {
    next(error);
  }

});

module.exports = router;
