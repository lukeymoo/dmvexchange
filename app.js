'use strict';

var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var compression = require('compression');
var session = require('express-session');
var router = express.Router();

/**
  Redis handles storage of sessions
*/
var redisStore = require('connect-redis')(session);
var redis = require('redis').createClient();
redis.auth('9b3af6edcf71b34520a7d16412ad9325OMGOMG');

/**
  MongoDB as primary database
*/
var databaseManager = require('./modules/database/database');
databaseManager.initMongo();

// Routes
var index = require('./routes/index');
var api = require('./routes/api');
var account = require('./routes/account');
var user = require('./routes/user');
var market = require('./routes/market');

var app = express();

// set the env port variable
process.env.PORT = '3000';

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

// enable sessions using Redis
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

app.use(express.static(path.join(__dirname, '/public')));

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

// routes
app.use(router);
app.use('/', index);
app.use('/api', api);
app.use('/user', user);
app.use('/market', market);
app.use('/account', account);



// Record the IP + Request before letting bad request be catched
app.use(function(req, res, next) {
	databaseManager.recordBadRequest(req);
	next();
});

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
