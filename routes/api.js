'use strict';


var express = require('express');
var router = express.Router();

var formManager = require('../modules/form/form');
var databaseManger = require('../modules/database/database');
var sessionManager = require('../modules/session/session');
var ObjectID = require('mongodb').ObjectID;


/**
	RESPONSE TYPES

	1. DX-OK -- Successful request
	2. DX-REJECTED -- Bad parameters for request ( EX: Incorrect password )
	3. DX-FAILED -- Invalid request outright ( EX: Failed tests || Missing session values )
*/

// Catch state request
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
});

// Change password
router.get('/changePassword', function(req, res, next) {

	// Ensure the user is logged in
	if(!req.session.LOGGED_IN) {
		res.send({status: 'DX-FAILED', message: 'Must be logged in!'});
		return;
	}

	// Ensure the user has an identity
	if(!('USERNAME' in req.session) || req.session.USERNAME.length == 0) {
		res.send({status: 'DX-FAILED', message: 'Failed to retrieve identity, please try logging in again'});
		return;
	}
	if(!('EMAIL' in req.session) || req.session.EMAIL.length == 0) {
		res.send({status: 'DX-FAILED', message: 'Failed to retrieve identity, please try logging in again'});
		return;
	}


	// Ensure we recieved the old password, the new password and a confirmation re-entry
	if(!('oldP' in req.query) || req.query.oldP.length == 0) {
		res.send({status: 'DX-FAILED', message: 'Request incomplete :: Old password missing'});
		return;
	}
	if(!('newP' in req.query) || req.query.newP.length == 0) {
		res.send({status: 'DX-FAILED', message: 'Request incomplete :: New password missing'});
		return;
	}
	if(!('newPA' in req.query) || req.query.newPA.length == 0) {
		res.send({status: 'DX-FAILED', message: 'Request incomplete :: Confirm password missing'});
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
	var database = databaseManger.getDB();
	var usrCol = database.collection('USERS');
	var crypto = require('crypto');

	var usrID = '';

	usrCol.findOne({
		username: req.session.USERNAME.toLowerCase(),
		password: crypto.createHash('md5').update(String(req.query.oldP)).digest('hex')
	}, function(err, doc) {
		if(err) {
			res.send({status: 'DX-FAILED', message: 'Error occurred'});
			console.log('[-] MongoDB Error while updating password :: ' + err);
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

/** Mail API calls **/


module.exports = router;
