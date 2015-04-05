'use strict';

var express = require('express');
var router = express.Router();

var sessionManager = require('../modules/session/session');


router.get('/', function(req, res, next) {
	if(!sessionManager.isLoggedIn(req.session)) {
		res.redirect('/signin');
		return;
	}
	res.send('User without param will redirect to /USER/USER.USERNAME');
});

router.get('/:username', function(req, res, next) {
	res.send('User with param will be a users profile page');
});

module.exports = router;