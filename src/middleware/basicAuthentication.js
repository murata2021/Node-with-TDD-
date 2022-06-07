const bcrypt = require('bcrypt');
const UserService = require('../user/UserService');

const basicAuthentication = async (req, res, next) => {
  const authorization = req.headers.authorization;

  console.log(req.headers)
  if (authorization) {
    //in the authorization header we stored data in base64 format, and header starts with Basic ...
    //that's why we applied substring method
    const encoded = authorization.substring(6);
    const decoded = Buffer.from(encoded, 'base64').toString('ascii');
    const [email, password] = decoded.split(':');

    const user = await UserService.findByEmail(email);
    if (user && !user.inactive) {
      const passwordValidation = await bcrypt.compare(password, user.password);
      if (passwordValidation) {
        req.authenticatedUser = user;
      }
    }
  }
  next();
};

module.exports = { basicAuthentication };
