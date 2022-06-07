const express = require('express');

const UserRouter = require('./user/UserRouter');
const HoaxRouter=require('./hoax/HoaxRouter')
const FileRouter=require('./file/FileRouter')
const AuthenticationRouter=require('./auth/AuthenticationRouter')

const errorHandler=require('./error/ErrorHandler')
const {tokenAuthentication}=require('./middleware/tokenAuthentication')
const FileService=require('./file/FileService')
const config=require('config')
const path=require('path')


const {uploadDir,profileDir,attachmentDir}=config;
const profileFolder=path.join('.',uploadDir,profileDir)
const attachmentFolder=path.join('.',uploadDir,attachmentDir)


const oneYearInMilis=365*24*60*60*1000

FileService.createFolders()
const app = express();

//to parsing incoming data
app.use(express.json({limit:'3mb'}));

app.use('/images',express.static(profileFolder,{maxAge:oneYearInMilis}))
app.use('/attachments',express.static(attachmentFolder,{maxAge:oneYearInMilis}))

//it is mainly for dealing with unexpired tokens
app.use(tokenAuthentication)

app.use(UserRouter);
app.use(AuthenticationRouter);
app.use(HoaxRouter);
app.use(FileRouter);


app.use(errorHandler);

console.log('env: ' + process.env.NODE_ENV);

module.exports = app;
