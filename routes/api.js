'use strict';


var express = require('express');
var router = express.Router();

var formManager = require('../modules/form/form');
var databaseManger = require('../modules/database/database');
var sessionManager = require('../modules/session/session');
var ObjectID = require('mongodb').ObjectID;
var fs = require('fs');

var pmSystem = require('../modules/PM/pm');
var smtp = require('../modules/smtp/smtp');
var uuid = require('node-uuid');


/**
	RESPONSE TYPES

	1. DX-OK -- Successful request
	2. DX-REJECTED -- Bad parameters for request ( EX: Incorrect password )
	3. DX-FAILED -- Invalid request outright ( EX: Failed tests || Missing session values )
*/


router.get('*', function(req, res, next) {
	if(!req.xhr && req.session.USERNAME != 'lukeymoo') {
		res.send({status: 'DX-REJECTED', message: 'Access denied'});
		return;
	}
	next();
});

// Catch account cancellation confirmation
router.get('/confirm_account_canceled', function(req, res, next) {
	if(!('ACCOUNT_ID' in req.session) || req.session.ACCOUNT_ID.length == 0) {
		res.send({status: 'DX-REJECTED', message: 'No account ID specified, ensure the complete cancel link is in URL'});
		return;
	}

	// Find account with specified ID and remove it from the database
	var database = databaseManger.getDB();
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
		res.send({status: 'DX-REJECTED', message: 'Must be logged in!'});
		return;
	}

	// Ensure the user has an identity
	if(!('USERNAME' in req.session) || req.session.USERNAME.length == 0) {
		res.send({status: 'DX-REJECTED', message: 'Failed to retrieve identity, please try logging in again'});
		return;
	}
	if(!('EMAIL' in req.session) || req.session.EMAIL.length == 0) {
		res.send({status: 'DX-REJECTED', message: 'Failed to retrieve identity, please try logging in again'});
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
// Get unread message count
router.get('/unread', function(req, res, next) {
	// Ensure logged in
	if(!('LOGGED_IN' in req.session) || !req.session.LOGGED_IN) {
		res.send({status: 'DX-REJECTED', message: 'Must be logged in'});
		return;
	}

	var database = databaseManger.getDB();
	var mailCol = database.collection('MAIL');

	mailCol.find({
		targets: {
			$elemMatch: {
				username: req.session.USERNAME.toLowerCase(),
				label: '[INBOX]',
				read: false
			}
		}
	}).toArray(function(err, arr) {
			if(err) {
				res.send({status: 'DX-FAILED', message: 'Server error retreiving unread message count'});
				return;
			}

			res.send({status: 'DX-OK', message: arr.length});
			return;
	});
});



router.get('/mail', function(req, res, next) {

	// Ensure they're logged in
	if(!req.session.LOGGED_IN) {
		res.send({status: 'DX-REJECTED', message: 'Must be logged in'});
		return;
	}

	// Ensure they have an identity ( Username & Email in session )
	if(!('USERNAME' in req.session) || req.session.USERNAME.length == 0) {
		res.send({status: 'DX-REJECTED', message: 'Could not resolve identity please try re-logging in'});
		return;
	}

	// Ensure they've sent a request
	if(!('request' in req.query) || req.query.request.length == 0) {
		res.send({status: 'DX-REJECTED', message: 'Must have a valid request type'});
		return;
	}

	// Now ensure the request was valid
	switch(req.query.request) {
		case 'UPDATE':
			// ensure they sent update to
			if(!('to' in req.query) || req.query.to.length == 0) {
				res.send({status: 'DX-REJECTED', message: 'Must specify update `to`'});
				return;
			}

			//ensure they sent array of IDS
			if(!('messages' in req.query) || req.query.messages.length == 0) {
				res.send({status: 'DX-REJECTED', message: 'No messages specified'});
				return;
			}
			
			// validate ids
			var validatedIDs = [];
			for(var id in req.query.messages) {
				if(req.query.messages[id].length == 24) {
					validatedIDs.push(ObjectID(req.query.messages[id]));
				}
			}

			// update messages
			var database = databaseManger.getDB();
			var mailCol = database.collection('MAIL');

			console.log(validatedIDs);

			switch(req.query.to) {
				case 'READ':
					mailCol.update({
						_id: { $in: validatedIDs },
						recipients: {
							$elemMatch: { username: req.session.USERNAME }
						}
					}, { $set: { "recipients.$.read": true } }, {multi:true});
					res.send({status: 'DX-OK', message: 'Updated!'});
					return;
					break;
				case 'UNREAD':
					mailCol.update({
						_id: { $in: validatedIDs },
						recipients: {
							$elemMatch: { username: req.session.USERNAME }
						}
					}, { $set: { "recipients.$.read": false } }, {multi:true});
					res.send({status: 'DX-OK', message: 'Updated!'});
					return;
					break;
				case 'INBOX':
					mailCol.update({
						_id: { $in: validatedIDs },
						recipients: {
							$elemMatch: { username: req.session.USERNAME }
						}
					}, { $set: { "recipients.$.label": '[INBOX]' } }, {multi:true});
					res.send({status: 'DX-OK', message: 'Updated!'});
					return;
					break;
				case 'TRASH':
					mailCol.update({
						_id: { $in: validatedIDs },
						recipients: {
							$elemMatch: { username: req.session.USERNAME }
						}
					}, { $set: { "recipients.$.label": '[TRASH]' } }, {multi:true});
					res.send({status: 'DX-OK', message: 'Updated!'});
					return;
					break;
			}

			break;

		case 'DELETE':
			// Ensure they've sent messages
			if(!('messages') in req.query || req.query.messages.length == 0) {
				res.send({status: 'DX-REJECTED', message: 'Must specify messags'});
				return;
			}

			// get valid ids from array
			var validatedIDs = [];
			for(var i in req.query.messages) {
				if(req.query.messages[i].length == 24) {
					validatedIDs.push(ObjectID(req.query.messages[i]));
				}
			}
			if(validatedIDs.length == 0) {
				res.send({status: 'DX-REJECTED', message: 'No valid messages specified'});
				return;
			}
			// delete
			var database = databaseManger.getDB();
			var mailCol = database.collection('MAIL');

			mailCol.update({
				_id: {
					$in: validatedIDs
				}
			}, { $pull: { targets: { username: req.session.USERNAME.toLowerCase() } } }, {multi:true});
			res.send({status: 'DX-OK', message: 'Removed'});
			return;
			break;

		default:
			res.send({status: 'DX-REJECTED', message: 'Could not meet request'});
			return;
			break;
	}
});


// Account Settings page add new email
router.get('/add_email', function(req, res, next) {
	// Ensure they're logged in
	if(!sessionManager.isLoggedIn(req.session)) {
		res.send({status: 'DX-REJECTED', message: 'Not logged in, please log in again'});
		return;
	}

	// Ensure they've sent the email
	if(!('email' in req.query) || req.query.email.length == 0) {
		res.send({status: 'DX-REJECTED', message: 'No new email specified'});
		return;
	}

	// Validate the email
	if(formManager.validateEmail(req.query.email)) {
		// Ensure this email isn't already present in database
		var database = databaseManger.getDB();
		var usrCol = database.collection('USERS');

		usrCol.findOne({
			$or: [
				{ email: req.query.email.toLowerCase() },
				{ other_emails: req.query.email.toLowerCase() }
			]
		}, function(err, doc) {
			if(err) {
				console.log('[-] MongoDB error while adding new email');
				res.send({status: 'DX-FAILED', message: 'Error while adding email, please try again.'});
				return;
			}
			if(doc) {
				// Email in use
				res.send({status: 'DX-REJECTED', message: 'Email is already in use!'});
				return;
			} else {
				// Find the user by username
				usrCol.findOne({
					username: req.session.USERNAME
				}, function(err, doc) {
					// does the user have a primary email ?
					if(!('email' in doc) || doc.email.length == 0) {

						var activation = {
							token: uuid.v1(),
							cancel: uuid.v1() + '-cancel',
							used: false
						};

						// Make primary email
						usrCol.update({
							username: req.session.USERNAME
						}, { $set: { email: req.query.email.toLowerCase(), activation: activation } });

						// Set the session variable
						req.session.EMAIL = req.query.email.toLowerCase();

						// prepare to email activation for newly set primary email
						var message = {
							to: req.session.EMAIL,
							subject: 'DMV Exchange Registration',
							text: 'New primary email has been set. Activate it using the link below\r\n\
								http://dmv-exchange.com/account/ack?token='+activation.token+'\r\n\r\n\r\n\
								 If you want to cancel activation of this email use the following link\r\n\
								 http://dmv-exchange.com/account/ack?token='+activation.cancel
						};

						// Email the user activation code
						smtp.send(message, function(err, result) {
							// Send reminder to activate account through internal PM system
							pmSystem.serverSend(req.session.USERNAME, 'Don\'t forget to activate your account, activation link was sent to email ' + req.session.EMAIL);
							res.send({
								status: 'DX-OK',
								message: 'Email has been added',
								email: req.query.email,
								refresh: true
							});
							return;
						});
					} else {
						// if not push into other emails
						usrCol.update({
							username: req.session.USERNAME
						}, { $push: { other_emails: req.query.email.toLowerCase() } });

						// Tell the user to activate the new emails
						pmSystem.serverSend(req.session.USERNAME, 'New email ' + req.query.email + ' has been linked with account.');

						res.send({
							status: 'DX-OK',
							message: 'Email has been added',
							email: req.query.email
						});
						return;
					}
				});
			}
		});
	} else {
		res.send({status: 'DX-REJECTED', message: 'The email specified is not a valid email'});
		return;
	}
});

// Account Settings page add new email
router.get('/remove_email', function(req, res, next) {
	// Ensure they're logged in
	if(!sessionManager.isLoggedIn(req.session)) {
		res.send({status: 'DX-REJECTED', message: 'Not logged in, please log in again'});
		return;
	}

	// Ensure they've sent the email
	if(!('email' in req.query) || req.query.email.length == 0) {
		res.send({status: 'DX-REJECTED', message: 'No new email specified'});
		return;
	}

	// Validate the email
	if(formManager.validateEmail(req.query.email)) {
		// Ensure this email isn't already present in database
		var database = databaseManger.getDB();
		var usrCol = database.collection('USERS');

		usrCol.findOne({
			username: req.session.USERNAME,
			other_emails: req.query.email
		}, function(err, doc) {
			if(err) {
				console.log('[-] MongoDB error while removing email :: ' + err);
				res.send({status: 'DX-FAILED', message: 'Error occurred while removing email, please refresh page and try again'});
				return;
			}
			if(doc) {
				// Remove the email
				usrCol.update({
					username: req.session.USERNAME
				}, { $pull: { other_emails: req.query.email.toLowerCase() } });
				// Send PM
				pmSystem.serverSend(req.session.USERNAME, 'Email ' + req.query.email + ' has been removed from account.');
				res.send({status: 'DX-OK', message: 'Email removed'});
				return;
			} else {
				// Email not in collection
				res.send({status: 'DX-REJECTED', message: 'Email not found in account'});
				return;
			}
		});

	} else {
		res.send({status: 'DX-REJECTED', message: 'The email specified is not a valid email'});
		return;
	}
});

// Get PM's
router.get('/getmail', function(req, res, next) {
	// Ensure they're logged in
	if(!sessionManager.isLoggedIn(req.session)) {
		res.send({status: 'DX-REJECTED', message: 'Must be logged in'});
		return;
	}

	// Ensure they've got an ID
	if(!('USERNAME' in req.session) || req.session.USERNAME.length == 0) {
		res.send({status: 'DX-REJECTED', message: 'Failed to resolve ID please try re-logging in'});
		return;
	}

	// Query database for messages with matching username in targets
	var database = databaseManger.getDB();
	var mailCol = database.collection('MAIL');

	mailCol.find({
		recipients: {
			$elemMatch: {
				username: req.session.USERNAME.toLowerCase()
			}
		}
	}).limit(40).sort({_id: -1}).toArray(function(err, arrayMail) {
		if(err) {
			console.log('[-] MongoDB error getting mail :: ' + JSON.stringify(err));
			res.send({status: 'DX-FAILED', message: 'Server error 500'});
			return;
		} else {
			var length;
			if(!arrayMail) {
				length = 0;
			} else {
				length = arrayMail.length;
			}
			// insert timestamp into each mail object
			for(var mail in arrayMail) {
				
				arrayMail[mail].timestamp = ObjectID(arrayMail[mail]._id).getTimestamp();
			}
			res.send({status: 'DX-OK', returned: length, message: arrayMail});
			return;
		}
	});
});

// Send PM's
router.get('/sendmail', function(req, res, next) {

	// Ensure they're logged in
	if(!sessionManager.isLoggedIn(req.session)) {
		res.send({status: 'DX-REJECTED', message: 'Must be logged in'});
		return;
	}

	// Ensure they've got an ID
	if(!('USERNAME' in req.session) || req.session.USERNAME.length == 0) {
		res.send({status: 'DX-REJECTED', message: 'Failed to resolve ID please try re-logging in'});
		return;
	}

	var s = ''; // subject
	var m = ''; // message text

	if(('s' in req.query) && pmSystem.validateSubject(req.query.s)) {
		s = req.query.s;
	}

	if(('m' in req.query) && pmSystem.validateMessage(req.query.m)) {
		m = req.query.m;
	} else {
		// Bad message
		res.send({status: 'DX-REJECTED', message: 'Invalid message text'});
		return;
	}

	// create and parse message object
	var validTarget = [];
	for(var user in req.query.r) {

		// Ensure its not an empty target
		if(req.query.r[user].length == 0) {
			continue;
		}

		// ensure we don't send to the same user twice
		var added = false;

		for(var target in validTarget) {
			if(req.query.r[user] == validTarget[target]) {
				added = true;
			}
		}

		// if not added, push to targets array
		if(!added) {
			validTarget.push({
				username: req.query.r[user],
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


	// Holds the message
	var PM = {
		subject: s,
		message: m,
		from: req.session.USERNAME,
		recipients: validTarget
	};

	// Insert message
	var database = databaseManger.getDB();
	var msgCol = database.collection('MAIL');

	msgCol.insert(PM);
	res.send({status: 'DX-OK', message: 'Sent!'});
});


module.exports = router;
