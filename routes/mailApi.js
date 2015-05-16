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
	// Grab all groups where user is a recipient
	var mail = dbManager.getDB().collection('MAIL');
	mail.find({
		RCPT: req.session.USERNAME
	}, { DATA: { $slice: -1 } }).sort({TS: -1}).toArray(function(err, inbox) {
		if(err) {
			smtp.report_error('Error while grabbing inbox :: ' + err, function(){});
			res.send({status: 'DX-FAILED', message: 'Server error occurred'});
			return;
		}
		res.send({status: 'DX-OK', message: inbox});
		return;
	});
});















/**
	Send a message to specified usernames
	Messages are sent to GROUP's.
	Groups are identified by the RCPT.
	When a message is sent if it's RCPT matches an existing GROUP's RCPT
	the message is pushed into an embedded array of DATA in GROUP
	If it does not match, a new GROUP is created and DATA is pushed into it
*/
router.post('/send', function(req, res, next) {
	/** Message Structure **/
	/**
		{
			_id: ObjectID('aksdm1294na0z0an2i'),
			FROM: 'Phil',
			RCPT: ['lukeymoo', 'lukeymoo2'], ( Max recipient length is 10 )
			TS: 1944421222
			DATA: [{
					FROM: 'Phil',
					TEXT: 'You going to the party ?',
					TS: 1944421222,
					RCPT: [
						{ USERNAME: 'lukeymoo', READ: false, LABEL: '[INBOX]' }
					]
			}]
		}
	*/
	var GROUP_ID = false;
	var RCPT = false;
	var DATA_TEXT = false;
	var FROM = req.session.USERNAME;
	/** Determine if this is a new message or a reply **/
	if(('GROUP_ID' in req.body) && req.body.GROUP_ID.length) {
		GROUP_ID = req.body.GROUP_ID; // Needs to be cast into ObjectID before query
	}
	if(!GROUP_ID) {
		/** Ensure we received RCPT if we didn't recieve a Group ID **/
		if(!('RCPT' in req.body) || !req.body.RCPT.length) {
			res.send({status: 'DX-REJECTED', message: 'No recipients specified'});
			return;
		}
		RCPT = JSON.parse(req.body.RCT);
		/** Determine if we have from **/
		if(('FROM' in req.body) && req.body.FROM.length) {
			FROM = req.body.FROM;
		}
	}
	/** Ensure we recevied message DATA **/
	if(!('DATA' in req.body) || !req.body.DATA.length) {
		res.send({status: 'DX-REJECTED', message: 'Can not send empty messages'});
		return;
	}
	DATA_TEXT = req.body.DATA;

	// Create structure for new message
	var DATA = {
		FROM: req.session.USERNAME,
		TEXT: DATA_TEXT,
		TS: new Date().getTime(),
		RCPT: []
	};


	var mail = dbManager.getDB().collection('MAIL');

	/** If we received a Group ID **/
	if(GROUP_ID) {
		// Determine if the group exists
		mail.findOne({
			_id: ObjectID(GROUP_ID)
		}, function(err, doc) {
			if(err) {
				smtp.report_error('Error determining if Group ID `' + GROUP_ID + '` exists :: ' + err, function(){});
				res.send({status: 'DX-FAILED', message: 'Server error occurred'});
				return;
			}
			// If the group exists, push object DATA into group.DATA field
			if(doc) {
				// Add Recipients into DATA object
				for(var r in doc.RCPT) {
					DATA.RCPT.push({
						USERNAME: doc.RCPT[r],
						READ: false,
						LABEL: '[INBOX]'
					});
				}
				mail.update({
					_id: ObjectID(GROUP_ID)
				}, { $push: { DATA: DATA } }, function(err, result) {
					if(err) {
						smtp.report_error('Error sending message to group id `' + GROUP_ID + '` :: ' + err, function(){});
						res.send({status: 'DX-FAILED', message: 'Server error occurred'});
						return;
					}
					if(result.nModified > 0) {
						res.send({status: 'DX-OK', message: 'Message Sent'});
						return;
					} else {
						res.send({status: 'DX-FAILED', message: 'Failed to send message'});
						return;
					}
				});
			} else { // If the group does not exist
				res.send({status: 'DX-REJECTED', message: 'Group does not exist'});
				return;
			}
		});
	} else {
		if(RCPT) { /** If we received RCPT's **/		
			var user = dbManager.getDB().collection('USERS');
			// Find all valid usernames in supplied RCPT
			user.find({
				username: {
					$in: RCPT
				}
			}).toArray(function(err, userArr) {
				if(err) {
					smtp.report_error('Error searching for valid recipients in `' + RCPT + '` :: ' + err, function(){});
					res.send({status: 'DX-FAILED', message: 'Server error occurred'});
					return;
				}
				// Sort through returned users, users not found are valid
				if(userArr) {
					// Contains valid recipients
					var RCPT_g = [];
					// Contains bad recipients
					var RCPT_b = [];
					for(var u in userArr) {
						var exists = false;
						for(var r in RCPT) {
							if(RCPT[r] == userArr[u].username) {
								exists = true;
							}
						}
						// If the user is valid push into good array
						if(exists) {
							RCPT_g.push(userArr[u].username);
						} else { // If the user wasn't found push into bad array
							RCPT_b.push(userArr[u].username);
						}
					}
					// Send PM for bad recipients
					if(RCPT_b.length) {
						// Send user PM of error
						var rs = '';
						for(var u in RCPT) {
							rs += RCPT[u] + ' ';
						}
						pmManager.serverSend(req.session.USERNAME, 'Some invalid recipients specified -> ' + rs);
					}
				} else { // If not users were found
					// Send user PM of error
					var rs = '';
					for(var u in RCPT) {
						rs += RCPT[u] + ' ';
					}
					pmManager.serverSend(req.session.USERNAME, 'No valid recipients specified -> ' + rs);
					res.send({status: 'DX-REJECTED', message: 'No valid recipients'});
					return;
				}
				// After sorting good & bad recipients determine if a group for
				// Recipients already exists
				mail.findOne({
					FROM: FROM,
					RCPT: {
						$all: RCPT_g
					}
				}, function(err, doc) {
					if(err) {
						smtp.report_error('Error determining if Group exists for `' + RCPT_g + '` :: ' + err, function(){});
						res.send({status: 'DX-FAILED', message: 'Server error occurred'});
						return;
					}
					// Format DATA.RCPT
					for(var r in doc.RCPT) {
						DATA.RCPT.push({
							USERNAME: doc.RCPT[r],
							READ: false,
							LABEL: '[INBOX]'
						});
					}
					// If a group exists, grab its ID and push data into it
					if(doc) {
						mail.update({
							_id: ObjectID(String(doc._id))
						}, { $push: { DATA: DATA } }, function(err, result) {
							if(err) {
								smtp.report_error('Error pushing message into Group DATA :: ' + err, function(){});
								res.send({status: 'DX-FAILED', message: 'Server error occurred'});
								return;
							}
							if(result.nModified > 0) {
								res.send({status: 'DX-OK', message: 'Message sent'});
								return;
							} else {
								res.send({status: 'DX-FAILED', message: 'Failed to send message'});
								return;
							}
						});
					} else { // If group did not exist create new one and push DATA
						for(var r in RCPT_g) {
							DATA.RCPT.push({
								USERNAME: RCPT_g[r],
								READ: false,
								LABEL: '[INBOX]'
							});
						}
						var GROUP = {
							FROM: req.session.USERNAME,
							RCPT: RCPT_g,
							TS: new Date().getTime(),
							DATA: [DATA]
						};
						mail.insert(GROUP);
						res.send({status: 'DX-OK', message: 'Message sent'});
						return;
					}
				});
			});
		} else {
			res.send({status: 'DX-FAILED', message: 'No recipients specified'});
			return;
		}
	}
});



module.exports = router;