'use strict';


var databaseManager = require('../database/database');

var validateSubject = function(string) {
	return (string.length >= 0 && string.length < 32) ? 
		true : false;
};

var validateMessage = function(string) {
	return (string.length > 1 && string.length < 360) ?
		true : false;
};

var serverSend = function(user, message) {
	var database = databaseManager.getDB();
	var mailCol = database.collection('MAIL');

	var message = {
		subject: '[ DMV Exchange Server Message ]',
		message: message,
		from: '[ DMV EXCHANGE ]',
		recipients: [{username: user, label: '[INBOX]', read: false}]
	};
	
	mailCol.insert(message);
};

module.exports = {
	serverSend: serverSend,
	validateSubject: validateSubject,
	validateMessage: validateMessage
};