'use strict';

var express = require('express');
var router = express.Router();

var sessionManager = require('../modules/session/session');
var authManager = require('../modules/authentication');
var dbManager = require('../modules/database/database');
var formManager = require('../modules/form/form');
var pmManager = require('../modules/PM/pm');




/** All routes require authentication so single route acts as middleware **/
router.get('*', function(req, res, next) {
	if(!authManager.json_is_authenticated(req, res)) {
		res.send({status: 'DX-REJECTED', message: 'Must be logged in'});
		return;
	}
	next();
});













/**
	Get number of unread messages in Inbox
*/
router.get('/unread', function(req, res, next) {
	var mail = dbManager.getDB().collection('MAIL');
	mail.find({
		recipients: {
			$elemMatch: {
				username: req.session.USERNAME.toLowerCase(),
				label: '[INBOX]',
				read: false
			}
		}
	}).count(function(err, len) {
		if(err) {
			smtp.report_error('Error counting unread messages :: ' + err, function(){});
			res.send({status: 'DX-FAILED', message: 'Server error occurred'});
			return;
		}
		res.send({status: 'DX-OK', message: len});
		return;
	});
});













/**
	Get mail messages in inbox
*/
router.get('/inbox', function(req, res, next) {
	var mail = dbManager.getDB().collection('MAIL');
	res.send({status: 'DX-OK', message: 'This endpoint is incomplete'});
	return;
});








/**
	Send mail to specified username(s)
*/
router.post('/send', function(req, res, next) {
	/** Ensure the user supplied required fields for a message **/
	pmManager.validateMessage(req, res, function(bRcpt, isValid) {
		var recipients = JSON.parse(req.body.RCPT);
		/** If non-valid message, leave execution **/
		if(!isValid) {
			return;
		}

		/**
			If all submitted recipients were bad
		*/
		if(bRcpt.length == JSON.parse(req.body.RCPT).length) {
			var r = '';
			for(var b in bRcpt) {
				r += bRcpt[b] + ' ';
			}
			pmManager.serverSend(req.session.USERNAME, 'All specified recipients were invalid or non-existant ' + r);
			res.send({status: 'DX-REJECTED', message: 'No valid recipients'});
			return;
		}
		/**
			If only some recipients were bad
		*/
		if(bRcpt.length > 0 && bRcpt.length < JSON.parse(req.body.RCPT).length) {
			var r = '';
			for(var b in bRcpt) {
				r += bRcpt[b] + ' ';
			}
			pmManager.serverSend(req.session.USERNAME, 'The following recipients were invalid or non-existant ' + r);
			/** Remove bad recipients from recipients **/
			for(var i = 0; i < recipients.length; i++) {
				for(var t = 0; t < bRcpt.length; t++) {
					/** If this recipient was in bad recipients remove it **/
					if(recipients[i] == bRcpt[t]) {
						recipients.splice(i, 1);
					}
				}
			}
		}

		/**
			Create proper RCPT objects for each recipient
		*/
		var RCPT = [];
		for(var i = 0; i < recipients.length; i++) {
			RCPT.push({
				USERNAME: recipients[i],
				LABEL: '[INBOX]',
				READ: false
			});
		}

		/**
			Insert message into database
		*/
		var message {
			FROM: req.session.username,
			RCPT: 
			SUBJECT: req.body.SUBJECT,
			DATA: 
		};
		var mail = dbManager.getDB().collection('MAIL');
		mail.insert(message);
	});
});



/*
router.get('/mail', function(req, res, next) {

	// Handle all authentication and respond if necessary
	if(!authManager.json_is_authenticated(req, res)) {
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
			var database = dbManager.getDB();
			var mailCol = database.collection('MAIL');

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
			var database = dbManager.getDB();
			var mailCol = database.collection('MAIL');

			mailCol.update({
				_id: {
					$in: validatedIDs
				}
			}, { $pull: { recipients: { username: req.session.USERNAME.toLowerCase() } } }, {multi:true});
			res.send({status: 'DX-OK', message: 'Removed'});
			return;
			break;

		default:
			res.send({status: 'DX-REJECTED', message: 'Could not meet request'});
			return;
			break;
	}
});














FOR ACCOUNT PAGE
// Account Settings page add new email
router.get('/add_email', function(req, res, next) {
	// Handle all authentication and respond if necessary
	if(!authManager.json_is_authenticated(req, res)) {
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
		var database = dbManager.getDB();
		var usrCol = database.collection('USERS');

		usrCol.findOne({
			$or: [
				{ email: req.query.email.toLowerCase() },
				{ other_emails: req.query.email.toLowerCase() }
			]
		}, function(err, doc) {
			if(err) {
				smtp.report_error('[-] MongoDB error while adding new email :: ' + err, function(){});
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
	// Handle all authentication and respond if necessary
	if(!authManager.json_is_authenticated(req, res)) {
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
		var database = dbManager.getDB();
		var usrCol = database.collection('USERS');

		usrCol.findOne({
			username: req.session.USERNAME,
			other_emails: req.query.email
		}, function(err, doc) {
			if(err) {
				smtp.report_error('[-] MongoDB error while removing email :: ' + err, function(){});
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

	// Handle all authentication and respond if necessary
	if(!authManager.json_is_authenticated(req, res)) {
		return;
	}

	// Query database for messages with matching username in targets
	var database = dbManager.getDB();
	var mailCol = database.collection('MAIL');

	mailCol.find({
		recipients: {
			$elemMatch: {
				username: req.session.USERNAME.toLowerCase()
			}
		}
	}).limit(500).sort({_id: -1}).toArray(function(err, arrayMail) {
		if(err) {
			smtp.report_error('[-] MongoDB error getting mail :: ' + JSON.stringify(err), function(){});
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

	// Handle all authentication and respond if necessary
	if(!authManager.json_is_authenticated(req, res)) {
		return;
	}

	var s = ''; // subject
	var m = ''; // message text

	if(('s' in req.query) && pmSystem.validateSubject(req.query.s)) {
		s = req.query.s;
		if(s.length == 0) {
			s = 'No subject';
		}
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
			if(req.query.r[user] == validTarget[target].username) {
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
	var database = dbManager.getDB();
	var msgCol = database.collection('MAIL');

	msgCol.insert(PM);
	res.send({status: 'DX-OK', message: 'Sent!'});
});
*/





module.exports = router;