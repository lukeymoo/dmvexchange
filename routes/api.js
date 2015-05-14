'use strict';


var express = require('express');
var router = express.Router();

var formManager = require('../modules/form/form');
var dbManager = require('../modules/database/database');
var sessionManager = require('../modules/session/session');
var authManager = require('../modules/authentication');
var ObjectID = require('mongodb').ObjectID;
var fs = require('fs');

var pmSystem = require('../modules/PM/pm');
var smtp = require('../modules/smtp/smtp');
var uuid = require('node-uuid');
var secret = require('../modules/secret/secret');
var magicModule = require('mmmagic');
var Magic = magicModule.Magic;
var gm = require('gm');

/**
	RESPONSE TYPES

	1. DX-OK -- Successful request
	2. DX-REJECTED -- Bad parameters for request/not authenticated
	3. DX-FAILED -- Server errors
*/


/**
	Return the users session state
*/
router.get('/session', function(req, res, next) {
	var sessionState = sessionManager.isLoggedInQuiet(req.session);
	if('r' in req.query && req.query.r == 'state') {
		// convert message to string type
		var msg = (sessionState == true) ? 'true' : 'false';
		res.send({status: 'DX-OK', message: msg});
		return;
	}
	// check if still logged without setting new LAST_ACTIVITY
	res.send({ state: {
		USERNAME: req.session.USERNAME || '',
		EMAIL: req.session.EMAIL || '',
		LOGGED_IN: req.session.LOGGED_IN || false
	}});
	return;
});

// save landing page emails
router.get('/save_landing_email', function(req, res, next) {
	var db = dbManager.getDB();
	var emailCol = db.collection('EARLY_BIRD');

	// ensure email is sent
	if(!('email' in req.query) || req.query.email.length == 0) {
		res.send({status: 'DX-REJECTED', message: 'No email specified'});
		return;
	}

	if(!formManager.validateEmail(req.query.email)) {
		res.send({status: 'DX-REJECTED', message: 'Invalid email'});
		return;
	}

	// check if email exists
	emailCol.findOne({
		email: req.query.email.toLowerCase()
	}, function(err, doc) {
		if(err) {
			smtp.report_error('[-] MongoDB error while saving landing page lead :: ' + err, function(){});
		}
		if(doc) {
				res.send({status: 'DX-OK', message: 'Already signed up! Thanks!'});
				return;
		} else {
			// if not insert it
			emailCol.insert({email: req.query.email.toLowerCase()});
			res.send({status: 'DX-OK', message: 'Thanks for signing up!'});
		}
	});
	return;
});
























// Catch account cancellation confirmation
router.get('/confirm_account_canceled', function(req, res, next) {
	if(!('ACCOUNT_ID' in req.session) || req.session.ACCOUNT_ID.length == 0) {
		res.send({status: 'DX-REJECTED', message: 'No account ID specified, ensure the complete cancel link is in URL'});
		return;
	}

	// Find account with specified ID and remove it from the database
	var database = dbManager.getDB();
	var usrCol = database.collection('USERS');
	usrCol.update({
		_id: ObjectID(req.session.ACCOUNT_ID)
	}, { $unset: { email: '', activation: '' } });

	// Send PM to user notifying the unlinking of email
	// Point them to account settings page where they may set a new one
	pmSystem.serverSend(req.session.USERNAME, 'The email you registered with has been unlinked with account, please link a new email in the account settings page');

	delete req.session.ACCOUNT_ID;
	delete req.session.USERNAME;
	res.send({status: 'DX-OK', message: 'Email address unlinked'});
});























// Catch tip submissions
router.get('/savetip', function(req, res, next) {
	// Ensure we received the message
	if(!('message' in req.query) || req.query.message.length < 2) {
		// Drop the request
		res.send({status: 'DX-REJECTED', message: 'No message received'});
		return;
	}

	var message = '\n\n========\n\n' + req.query.message.toLowerCase();

	fs.appendFile('tip_submission', message, function(err) {
		res.send({status: 'DX-OK', message: 'Tip received'});
		return;
	});
	
});
















// Change password
router.get('/chgpwd', function(req, res, next) {

	// Handle all authentication and respond if necessary
	if(!authManager.json_is_authenticated(req, res)) {
		return;
	}

	// Ensure we recieved the old password, the new password and a confirmation re-entry
	if(!('oldP' in req.query) || req.query.oldP.length == 0) {
		res.send({status: 'DX-REJECTED', message: 'Request incomplete :: Old password missing'});
		return;
	}
	if(!('newP' in req.query) || req.query.newP.length == 0) {
		res.send({status: 'DX-REJECTED', message: 'Request incomplete :: New password missing'});
		return;
	}
	if(!('newPA' in req.query) || req.query.newPA.length == 0) {
		res.send({status: 'DX-REJECTED', message: 'Request incomplete :: Confirm password missing'});
		return;
	}

	var elements = {};
	elements.oldP = formManager.validatePassword(req.query.oldP); // Must be true
	elements.newP = formManager.validatePassword(req.query.newP); // Must be true
	// Are they entering the same password in all fields ( Only acceptable FALSE )
	elements.sameP = (req.query.oldP == req.query.newP) ? true : false;
	// Do the new passwords match
	elements.newPM = (req.query.newP == req.query.newPA) ? true : false; // Must be true

	// Ensure we're doing already before investing in database check
	for(var elem in elements) {
		if(elements[elem]) {
			if(elem == 'sameP') {
				res.send({status: 'DX-REJECTED', message: 'Cannot use existing password for new password'});
				return;
			}
		}
	}

	// Find document check if current password is already the same
	var database = dbManager.getDB();
	var usrCol = database.collection('USERS');
	var crypto = require('crypto');

	var usrID = '';

	usrCol.findOne({
		username: req.session.USERNAME.toLowerCase(),
		password: crypto.createHash('md5').update(String(req.query.oldP)).digest('hex')
	}, function(err, doc) {
		if(err) {
			res.send({status: 'DX-FAILED', message: 'Error occurred'});
			smtp.report_error('[-] MongoDB error while updating password :: ' + err, function(){});
			return;
		}
		// Correct old password
		if(doc) {
			// Grab user ID and update
			usrID = ObjectID(doc._id);
			// Update
			usrCol.update({
				_id: usrID
			}, { $set: { password: crypto.createHash('md5').update(String(req.query.newP)).digest('hex') } });
			res.send({status: 'DX-OK', message: 'Password updated!'});
			return;
		} else {
			// incorrect current password
			res.send({status: 'DX-REJECTED', message: 'Incorrect password'});
			return;
		}
	});

});




module.exports = router;




















