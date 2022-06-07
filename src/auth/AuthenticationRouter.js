const express = require('express');
const router = new express.Router();
const UserService = require('../user/UserService');
const AuthenticationException = require('./AuthenticationException');
const bcrypt = require('bcrypt');
const ForbiddenException = require('../error/ForbiddenException');
const ValidationException = require('../error/ValidationException');
const { check, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const tokenService = require('./tokenService');

router.post('/api/1.0/auth', check('email').isEmail(), async (req, res, next) => {
  const errors = validationResult(req);
  const { email, password } = req.body;
  try {
    if (!errors.isEmpty()) {
      throw new AuthenticationException();
    }

    const user = await UserService.findByEmail(email);
    if (!user) {
      throw new AuthenticationException();
    }
    const passwordValidation = await bcrypt.compare(password, user.password);
    console.log('Password Validation', passwordValidation);
    if (!passwordValidation) {
      throw new AuthenticationException();
    }
    if (user.inactive) {
      throw new ForbiddenException();
    }
    //generates token
    //old solution using JWT
    // const token=tokenService.createToken(user)
    //new solution using our own token generator
    const token = await tokenService.createToken(user);

    return res.send({
      id: user.id,
      username: user.username,
      token,
      image:user.image
    });
  } catch (error) {
    next(error);
  }
});

router.post('/api/1.0/logout', async (req, res, next) => {
  const authorization = req.headers.authorization;
  if (authorization) {
    //in the authorization header we stored data in base64 format, and header starts with Basic ...
    //that's why we applied substring method
    const token = authorization.substring(7);
    await tokenService.deleteToken(token);
  }
  res.send();
});

module.exports = router;
