'use strict';

var express = require('express');
var router = express.Router();

var formManager = require('../modules/form/form');
var dbManager = require('../modules/database/database');
var sessionManager = require('../modules/session/session');

var pmSystem = require('../modules/PM/pm');
var smtp = require('../modules/smtp/smtp');

var uuid = require('node-uuid');

/** GET account page **/
router.get('/', function(req, res, next) {
	if(!sessionManager.isLoggedIn(req.session)) {
		res.redirect('/signin');
		return;
	}

	// Get users other emails
	var database = dbManager.getDB();
	var userCol = database.collection('USERS');

	var emails = '';

	userCol.findOne({
		username: req.session.USERNAME
	}, { _id: 0, other_emails: 1 }, function(err, doc) {
		if(err) {
			smtp.report_error('[-] MongoDB Error getting other emails :: ' + err,function(){});
		}
		if(doc) {
			emails = doc.other_emails;
		}
		res.render('index', { title: 'Account', USER: req.session, DATA: emails });
	});
});

router.get('/ack', function(req, res, next) {

	// Ensure they have an activation token in the URL
	if(!('token' in req.query) || req.query.token.length == 0) {
		res.send('No token in URL found..<a href="/">Click here to return home</a>');
		return;
	}

	// Now query database for token and if found activate the user
	var database = dbManager.getDB();
	var userCol = database.collection('USERS');

	userCol.findOne({
		$or: [{ "activation.token": req.query.token },{ "activation.cancel": req.query.token }]
	}, function(err, doc) {
		if(doc) {

			// Decide which token was given
			if(doc.activation.token == req.query.token) {
				// Ensure not already used
				if(doc.activation.used) {
					// Tell the user the activation code was already used
					req.session.EVENT = 'ACTIVATED_ALREADY';
					res.redirect('/account/active');
				} else {
					// Activation
					userCol.update({
						_id: doc._id,
					}, { $set: { "activation.used": true }, $unset: { "activation.cancel": '' } }, function(err, item) {
						// Set session variable EVENT to be cleared after redirect
						req.session.USERNAME = doc.username;
						req.session.EMAIL = doc.email;
						req.session.EVENT = 'ACTIVATED';
						res.redirect('/account/activated');
					});
				}
			} else {
				// Cancel was requested, remove the email from
				// database and send message to user through
				// PM system to request a new email or their account
				// Will be deleted in 7 days
				// Set session variable EVENT to be cleared after redirect
				// Save account id so when they confirm the cancel we can find the account
				req.session.EVENT = 'CANCELED';
				req.session.USERNAME = doc.username;
				req.session.ACCOUNT_ID = doc._id;
				res.redirect('/account/canceled');
			}
			return;
		} else {
			res.send('Invalid token <a href="/">Click here to return home</a>');
			return;
		}
	});
});

router.get('/mail', function(req, res, next) {
	if(!sessionManager.isLoggedIn(req.session)) {
		res.redirect('/signin');
		return;
	}
	res.render('index', { title: 'Mail', USER: req.session });
});

router.get('/activated', function(req, res, next) {
	// Ensure EVENT was set
	if(!('EVENT' in req.session)
		|| req.session.EVENT.length == 0
		|| req.session.EVENT != 'ACTIVATED') {
		res.redirect('/');
		return;
	}

	var database = dbManager.getDB();
	var userCol = database.collection('USERS');

	userCol.update({
		username: req.session.USERNAME
	}, { $unset: { "activation.cancel": '' }, $set: { "activation.used": true } });

	pmSystem.serverSend(req.session.USERNAME, 'Your account has been activated!');

	var message = {
		to: req.session.EMAIL,
		subject: 'DMV Exchange - Account Activation',
		text: 'Your account has been activated!'
	};

	smtp.send(message, function(err, result) {

		// Clear event variable
		//delete req.session.EVENT;

		res.render('index', { title: 'Activated', USER: req.session });
	});
});

router.get('/canceled', function(req, res, next) {
	// Ensure EVENT was set
	if(!('EVENT' in req.session)
		|| req.session.EVENT.length == 0
		|| req.session.EVENT != 'CANCELED') {
		res.redirect('/');
		return;
	}

	// Clear EVENT variable
	//delete req.session.EVENT;
	res.render('index', { title: 'Sorry', USER: req.session });
});

router.get('/active', function(req, res, next) {
	// Ensure EVENT was set
	if(!('EVENT' in req.session)
		|| req.session.EVENT.length == 0
		|| req.session.EVENT != 'ACTIVATED_ALREADY') {
		res.redirect('/');
		return;
	}

	// Clear EVENT variable
	//delete req.session.EVENT;
	res.render('index', { title: 'Umm', USER: req.session });
});


module.exports = router;