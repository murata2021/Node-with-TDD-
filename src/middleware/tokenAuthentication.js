const bcrypt = require('bcrypt');
const UserService = require('../user/UserService');
const tokenService = require('../auth/tokenService');

const tokenAuthentication = async (req, res, next) => {
  const authorization = req.headers.authorization;
  if (authorization) {
    //in the authorization header we stored data in base64 format, and header starts with Basic ...
    //that's why we applied substring method
    const token = authorization.substring(7);
    try {
      const user = await tokenService.verify(token);
      req.authenticatedUser = user;
    } catch (err) {}
  }
  next();
};

module.exports = { tokenAuthentication };
