const fs = require('fs');
const path = require('path');
const config = require('config');

const { uploadDir, profileDir,attachmentDir } = config;
const profileDirectory = path.join('.', uploadDir, profileDir);
const attachmentDirectory = path.join('.', uploadDir, attachmentDir);


const files = fs.readdirSync(profileDirectory);
for (const file of files) {
  fs.unlinkSync(path.join(profileDirectory, file));
}

const attachmentFiles = fs.readdirSync(attachmentDirectory);
for (const file of attachmentFiles) {
  fs.unlinkSync(path.join(attachmentDirectory, file));
}

