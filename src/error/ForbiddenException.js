module.exports = function ForbiddenException(message='Account is inactive') {
  this.status = 403;
  this.message = message;
};
