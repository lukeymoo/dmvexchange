'use strict';

var express = require('express');
var router = express.Router();

var formManager = require('../modules/form/form');
var databaseManger = require('../modules/database/database');
var sessionManager = require('../modules/session/session');
var ObjectID = require('mongodb').ObjectID;

var nodemailer = require('nodemailer');
var transporter = nodemailer.createTransport({debug:true});

router.get('/', function(req, res, next) {
	res.render('market', { title: 'Market', USER: req.session });
});

router.get('/mailer', function(req, res, next) {

	// create message
	var message = {
		from: 'no-reply <no-reply@dmv-exchange.com>',
		to: 'termiosx@gmail.com',
		subject: 'Hello world',
		text: 'Hello world of SMTP servers'
	};

	transporter.sendMail(message, function(err, reply) {
		console.log(err);
		console.log(reply);
	});

	res.send('ok');

});

module.exports = router;