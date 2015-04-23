'use strict';

// Core imports
var express = require('express');
var path = require('path');
var fs = require('fs');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var compression = require('compression');
var session = require('express-session');
var multer = require('multer');
var router = express.Router();
var uuid = require('node-uuid');

// Session handler
var redisStore = require('connect-redis')(session);
var redis = require('redis').createClient();

// Route controllers
var index = require('./routes/index');
var api = require('./routes/api');
var account = require('./routes/account');
var user = require('./routes/user');
var market = require('./routes/market');


// Custom modules
var secret = require('./modules/secret/secret');
var databaseManager = require('./modules/database/database');

var app = express();

// set the env port variable
process.env.PORT = '3000';

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// parse multipart/form-data forms
app.use(multer({
  dest: path.join(__dirname, 'public/cdn'),
  putSingleFilesInArray: true,
  limits: {
    fileSize: 4000000, // 4MB file size limit
    fields: 25 // prevent DOS by infinite fields within form
  },
  changeDest: function(dest, req, res) {
    // if this was being post to feed, place into post within cdn folder
    if(req.originalUrl == '/market/post') {
      return path.join(dest, '/product');
    } else {
      // otherwise place into notarget because no location has been specified (cleaned regularly) 
      return path.join(dest, '/notarget');
    }
  },
  rename: function(fieldname, filename, req, res) {
    // if this was being posted to feed rename it accordingly
    if(req.originalUrl == '/market/post') {
      return '__DEFAULT__' + uuid.v1() + Date.now();
    } else {
      return uuid.v1() + '_' + Date.now(); // unknown destination = random name
    }
  },
  onFileSizeLimit: function(file) {
    console.log('[-] File exceeded size limit...has been removed');
    fs.unlink(file.path, function(){}); // remove file
  }
}));

// parse cookies & basic forms
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

// Enable sessions using Redis
redis.auth(secret._SECRET_REDIS);
app.use(session({
  store: new redisStore({ host: '127.0.0.1', port: '6379', client: redis }),
  secret: 'keyboard cat',
  resave: true,
  saveUninitialized: true,
  ttl: 1800,
  cookie: { MaxAge: 1800 }
}));

// enable compression of all routes
app.use(compression({
  level: 9
}));

// Allow static files to be accessed
app.use(express.static(path.join(__dirname, 'public')));

// Set Custom X-Powered-By header
app.use(function(req, res, next) {
  res.set('X-Powered-By', 'DX');
  next();
});

// Custom middleware assigns LOGGED_IN value false if not defined
app.use(function(req, res, next) {
  if(!('LOGGED_IN' in req.session) || 'boolean' !== typeof req.session.LOGGED_IN) {
    req.session.LOGGED_IN = false;
  }
  next();
});

// Routes
app.use(router);
app.use('/', index);
app.use('/api', api);
app.use('/user', user);
app.use('/market', market);
app.use('/account', account);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// Catch errors + Log the request ip and the path requested

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  console.log('Environment: development');
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', { title: 'Error', USER: req.session, message: err.message, error: {} });
    console.log(err);
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  console.log('Environment: production');
  res.status(err.status || 500);
  res.render('error', { title: 'Error', USER: req.session, message: err.message, error: {} });
  console.log(err);
});


module.exports = app;
