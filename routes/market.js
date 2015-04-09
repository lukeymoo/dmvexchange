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

module.exports = router;