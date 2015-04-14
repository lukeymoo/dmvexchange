'use strict';

var express = require('express');
var router = express.Router();

var formManager = require('../modules/form/form');
var databaseManger = require('../modules/database/database');
var sessionManager = require('../modules/session/session');
var ObjectID = require('mongodb').ObjectID;

router.get('/', function(req, res, next) {
	res.render('market', { title: 'Market', USER: req.session });
});

router.get('/create', function(req, res, next) {
	if(!sessionManager.isLoggedIn(req.session)) {
		res.redirect('/signin');
		return;
	}
	res.render('market', { title: 'Create Listing', USER: req.session });
});

module.exports = router;