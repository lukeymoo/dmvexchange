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
	mail.find({
		"RCPT.USERNAME": req.session.USERNAME
	}).sort({_id: -1}).limit(17).toArray(function(err, inbox) {
		if(err) {
			smtp.report_error('Error occurred getting inbox :: ' + err, function(){});
			res.send({status: 'DX-FAILED', message: 'Server error occurred'});
			return;
		}
		res.send({status: 'DX-OK', message: inbox});
		return;
	});
});








/**
	Send PM to specified username(s)
*/
router.post('/send', function(req, res, next) {
	/** Ensure we recieved RCPT **/
	if(!('RCPT' in req.body) || !req.body.RCPT.length) {
		res.send({status: 'DX-REJECTED', message: 'No recipients specified'});
		return;
	}
	/** Ensure we received message DATA **/
	if(!('DATA' in req.body) || !req.body.DATA.length) {
		res.send({status: 'DX-REJECTED', message: 'No message text specified'});
		return;
	}
	/** Validate DATA **/
	if(!pmManager.validateText(req.body.DATA)) {
		res.send({status: 'DX-REJECTED', message: 'Message must be 2-360 characters'});
		return;
	}
	/** Set subject if not set **/
	if(!('SUBJECT' in req.body) || !req.body.SUBJECT.length) {
		req.body.SUBJECT = 'No subject';
	}
	/** Validate subject or set to default **/
	if(!pmManager.validateSubject(req.body.SUBJECT)) {
		req.body.SUBJECT = 'No subject';
	}
	/** Ensure recipients exist **/
	var RCPT = [];
	var tmp = JSON.parse(req.body.RCPT);
	for(var rr in tmp) {
		RCPT.push(tmp[rr].toLowerCase());
	}
	var BRCPT = [];
	var user = dbManager.getDB().collection('USERS');
	user.find({
		username: {
			$in: RCPT
		}
	}).toArray(function(err, users) {
		if(err) {
			smtp.report_error('Error occurred checking if recipients existed :: ' + err, function(){});
			res.send({status: 'DX-FAILED', message: 'Server error occurred'});
			return;
		}

		if(!users) {
			var rs = '';
			for(var rr in RCPT) {
				rs += RCPT[rr] + ' ';
			}
			pmManager.serverSend(req.session.USERNAME, 'Failed to reach all recipients ' + rs);
			res.send({status: 'DX-REJECTED', message: 'No valid recipients'});
			return;
		}

		/** RCPT_g is generated from all usernames that exist **/
		var RCPT_g = [];

		/** RCPT is user supplied & may contain bad usernames **/
		for(var r in RCPT) {
			var exists = false;
			for(var u in users) {
				if(users[u].username == RCPT[r]) {
					exists = true;
				}
			}
			if(exists) {
				RCPT_g.push(RCPT[r]);
			} else {
				BRCPT.push(RCPT[r]);
			}
		}

		/**
			If some of the recipients were bad
			notify user with PM
		*/
		if(BRCPT.length > 0 && BRCPT.length < RCPT.length) {
			var rs = '';
			for(var rr in BRCPT) {
				rs += BRCPT[rr] + ' ';
			}
			if(BRCPT.length == 1) {
				pmManager.serverSend(req.session.USERNAME, 'A recipient couldn\'t be reached => ' + rs);
			}
			if(BRCPT.length > 1) {
				pmManager.serverSend(req.session.USERNAME, 'Some recipients couldn\'t be reached => ' + rs);
			}
		}

		/** RCPT_s is generated and is an object structured for DB entry **/
		var RCPT_s = [];
		for(var rr in RCPT_g) {
			RCPT_s.push({
				USERNAME: RCPT_g[rr],
				LABEL: '[INBOX]',
				READ: false
			});
		}

		var message = {
			FROM: req.session.USERNAME,
			RCPT: RCPT_s,
			SUBJECT: req.body.SUBJECT,
			DATA: req.body.DATA
		};

		var mail = dbManager.getDB().collection('MAIL');

		mail.insert(message);

		res.send({status: 'DX-OK', message: 'Sent!'});
		return;
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
							pmManager.serverSend(req.session.USERNAME, 'Don\'t forget to activate your account, activation link was sent to email ' + req.session.EMAIL);
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
						pmManager.serverSend(req.session.USERNAME, 'New email ' + req.query.email + ' has been linked with account.');

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
				pmManager.serverSend(req.session.USERNAME, 'Email ' + req.query.email + ' has been removed from account.');
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

	if(('s' in req.query) && pmManager.validateSubject(req.query.s)) {
		s = req.query.s;
		if(s.length == 0) {
			s = 'No subject';
		}
	}

	if(('m' in req.query) && pmManager.validateMessage(req.query.m)) {
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