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
router.get('/chgpwd', function(req, res, next) {

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
router.get('/mail', function(req, res, next) {
	// Ensure they're logged in
	if(!req.session.LOGGED_IN) {
		res.send({status: 'DX-REJECTED', message: 'Must be logged in'});
		return;
	}

	// Ensure they have an identity
	if(!('USERNAME' in req.session) || req.session.USERNAME.length == 0) {
		res.send({status: 'DX-REJECTED', message: 'Could not resolve identity please try re-logging in'});
		return;
	}
	if(!('EMAIL') in req.session || req.session.EMAIL.length == 0) {
		res.send({status: 'DX-REJECTED', message: 'Could not resolve identity please try re-logging in'});
		return;
	}

	// Ensure they've sent a valid request type
	if(!('request' in req.query) || req.query.request.length == 0) {
		res.send({status: 'DX-REJECTED', message: 'Must have a valid request type'});
		return;
	}

	switch(req.query.request) {
		case 'GET':
			// Ensure they've sent a view
			if(!('view' in req.query) || req.query.view.length == 0) {
				res.send({status: 'DX-REJECTED', message: 'No view specified'});
				return;
			}
			// Parse JSON for messages in database and send it as array of objects(messages)
			switch(req.query.view) {
				case '[INBOX]':
					break;
				case '[TRASH]':
					break;
				default:
					res.send({status: 'DX-REJECTED', message: 'Could not resolve view requested'});
					return;
					break;
			}
			res.send({status: 'DX-OK', message: 'Unprogrammed response'});
			return;
			break;

		case 'SEND':
			// Ensure they've sent a proper message
			if(!('message' in req.query)
				|| 'object' != typeof req.query.message
				|| req.query.message.length == 0) {
				res.send({status: 'DX-REJECTED', message: 'Must specify message and in object format'});
				return;
			}
			// Ensure they've sent valid targets
			if(!('target' in req.query)
				|| 'object' != req.query.target
				|| req.query.target.length == 0) {
				res.send({status: 'DX-REJECTED', message: 'Must specify target(s) and in array format'});
				return;
			}

			// create and parse message object
			var validTarget = [];
			for(var user in req.query.target) {

				// Ensure its not an empty target
				if(req.query.target[user].length == 0) {
					continue;
				}

				// ensure we don't send to the same user twice
				var added = false;

				for(var target in validTarget) {
					if(req.query.target[user] == validTarget[target]) {
						added = true;
					}
				}

				// if not added, push to targets array
				if(!added) {
					validTarget.push({
						username: req.query.target[user],
						label: '[INBOX]',
						read: false
					});
				}

			}

			// Ensure we still have targets after validation
			if(validTarget.length == 0) {
				res.send({status: 'DX-REJECTED', message: 'No valid targets specified'});
				return;
			}

			var mail = {
				title: req.query.message.title,
				message: req.query.message.message,
				origin: req.session.USERNAME,
				target: validTarget
			};

			// Insert message
			var database = databaseManger.getDB();
			var msgCol = database.collection('MAIL');

			msgCol.insert(mail);
			res.send({status: 'DX-OK', message: 'Sent!'});
			return;
			break;
	}

	res.send({status: 'DX-FAILED', message: 'Could not meet request'});
});

module.exports = router;
