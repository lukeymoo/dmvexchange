'use strict';


var dbManager = require('../database/database');

/** Ensure supplied string can be a valid username **/
var validateRecipient = function(string) {
	var status = true;
	var reg = /^[A-Za-z0-9_]+$/;
	if(!reg.test(string) || string.length < 2 || string.length > 15) {
		status = false;
	}
	return status;
};

// Ensure supplied string can be a valid subject
var validateSubject = function(string) {
	return (string.length >= 0 && string.length < 32) ? 
		true : false;
};

// Ensure supplied string can be a valid message text
var validateText = function(string) {
	return (string.length > 1 && string.length < 360) ?
		true : false;
};

/**
	Send message as server
*/
var serverSend = function(user, message) {
	var database = dbManager.getDB();
	var mailCol = database.collection('MAIL');

	var message = {
		subject: '[ DMV Exchange Server Message ]',
		message: message,
		from: '[ DMV EXCHANGE ]',
		recipients: [{username: user, label: '[INBOX]', read: false}]
	};
	
	mailCol.insert(message);
};

/**
	Ensure request is a valid Message
		By =>
			1. Ensure user supplied message recipients
			2. Ensure user supplied message text
			3. Validate recipients
				 ~ Bad recipients are passed to callback
			4. Validate message text 
				~ Validation result is passed to callback ( boolean )
					if `null` -> response was sent to client already
*/
var validateMessage = function(req, res, callback) {
	/** Ensure required fields are specified **/
	if(!('RCPT' in req.body) || !req.body.RCPT.length) {
		res.send({status: 'DX-REJECTED', message: 'No recipients specified'});
		callback(null, null);
		return;
	}
	if(!('DATA' in req.body) || !req.body.DATA.length) {
		res.send({status: 'DX-REJECTED', message: 'No message text specified'});
		callback(null, null);
		return;
	}
	/** If a subject was not supplied, use default one **/
	if(!('SUBJECT' in req.body) || !req.body.SUBJECT.length) {
		req.body.SUBJECT = 'No subject';
	}
	/** Validate subject, if invalid replace with default **/
	if(!validateSubject(req.body.SUBJECT)) {
		req.body.SUBJECT = 'No subject';
	}
	/** Validate message text **/
	if(!validateText(req.body.DATA)) {
		res.send({status: 'DX-REJECTED', message: 'Supplied message is invalid'});
		callback(null, null);
		return;
	}
	// Parse stringified array
	var rcpt = JSON.parse(req.body.RCPT);
	/** Validate recipients & ensure they exist **/
	var badRCPT = [];
	var iteration = 0;
	for(var i = 0; i < rcpt.length; i++) {
		if(!validateRecipient(rcpt[i])) {
			badRCPT.push(rcpt[i]);
			// Hit function controller
			iteration++;
			validateMessageCont(iteration, rcpt.length, badRCPT, callback);
			continue;
		}
		dbManager.doesUsernameExist_arr(rcpt[i], i, function(err, result, index) {
			if(err) {
				res.send({status: 'DX-FAILED', message: 'Server error occurred'});
				callback(null, null);
				return;
			}
			// If the username doesn't exist add to bad recipients
			if(!result) {
				badRCPT.push(rcpt[index]);
			}
			// Hit function controller
			iteration++;
			validateMessageCont(iteration, rcpt.length, badRCPT, callback);
		});
	}
};

/**
	Continues message validation by ensuring function is called
	specified number of times before passing control flow
*/
var validateMessageCont = function(it, length, badRCPT, callback) {
	if(it >= length) {
		badRCPT = (badRCPT.length) ? badRCPT : null;
		callback(badRCPT, true);
	}
};

module.exports = {
	serverSend: serverSend,
	validateSubject: validateSubject,
	validateText: validateText,
	validateMessage: validateMessage,
	validateMessageCont: validateMessageCont
};