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
		FROM: '[ DMV EXCHANGE ]',
		RCPT: [{
			USERNAME: user,
			LABEL: '[INBOX]',
			READ: false
		}],
		SUBJECT: '[ DMV Exchange Server Message ]',
		DATA: message
	};
	
	mailCol.insert(message);
};

module.exports = {
	serverSend: serverSend,
	validateSubject: validateSubject,
	validateText: validateText,
};