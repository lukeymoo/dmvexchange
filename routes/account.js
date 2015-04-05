'use strict';

var express = require('express');
var router = express.Router();

var formManager = require('../modules/form/form');
var databaseManager = require('../modules/database/database');
var sessionManager = require('../modules/session/session');

var uuid = require('node-uuid');

/** GET account page **/
router.get('/', function(req, res, next) {
	if(!sessionManager.isLoggedIn(req.session)) {
		res.redirect('/signin');
		return;
	}
	res.render('index', { title: 'Account', USER: req.session });
});

router.get('/mail', function(req, res, next) {
	if(!sessionManager.isLoggedIn(req.session)) {
		res.redirect('/signin');
		return;
	}
	res.render('index', { title: 'Mail', USER: req.session });
});


module.exports = router;