'use strict';


var databaseManager = require('../database/database');

var serverSend = function(user, message) {
	var database = databaseManager.getDB();
	var mailCol = database.collection('MAIL');

	var message = {
		title: '[DMV Exchange Server Message]',
		message: message,
		origin: '[DMV EXCHANGE]',
		targets: [{username: user, label: '[INBOX]', read: false}]
	};
	
	mailCol.insert(message);
};

module.exports = {
	serverSend: serverSend
};