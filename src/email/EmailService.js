const nodemailer = require('nodemailer');

const { transporter } = require('../config/emailTransporter');

const sendAccountActivation = async (emailTo, activationToken) => {
  const info = await transporter.sendMail({
    from: 'My App <info@my-app.com>',
    to: emailTo,
    subject: 'Account Activation',
    html: `
    <div>
      <b>Please click below link to activate your account</b>
    </div>
    <div>
      <a href="http://localhost:8080/#/login?token=${activationToken}">
      Activate
      </a>
    </div>
    `,
  });
  if (process.env.NODE_ENV === 'development') {
    console.log('url ' + nodemailer.getTestMessageUrl(info));
  }
};

const sendPasswordReset = async (emailTo, token) => {
  const info = await transporter.sendMail({
    from: 'My App <info@my-app.com>',
    to: emailTo,
    subject: 'Password Reset',
    html: `
    <div>
      <b>Please click below link to reset your password</b>
    </div>
    <div>
      <a href="http://localhost:8080/#/password-reset?reset=${token}">
      Reset
      </a>
    </div>
    `,
  });
  if (process.env.NODE_ENV === 'development') {
    console.log('url ' + nodemailer.getTestMessageUrl(info));
  }
};

module.exports = { sendAccountActivation, sendPasswordReset };
