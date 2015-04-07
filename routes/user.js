'use strict';

var express = require('express');
var router = express.Router();

var sessionManager = require('../modules/session/session');


/** CURRENTLY ALL PATHS ARE DISABLED **/
router.get('*', function(req, res, next) {
	res.redirect('/');
});







router.get('/', function(req, res, next) {
	if(!sessionManager.isLoggedIn(req.session)) {
		res.redirect('/signin');
		return;
	}
	res.send('User without param will redirect to /USER/USER.USERNAME');
});

router.get('/:username', function(req, res, next) {
	res.render('index', { title: 'Profile', USER: req.session });
});

module.exports = router;