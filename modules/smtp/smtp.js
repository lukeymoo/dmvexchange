'use strict';


var nodemailer = require('nodemailer');
var transport = nodemailer.createTransport();

var send = function(messageObj, callback) {

	transport.sendMail({
		from: 'DMV Exchange <no-reply@dmv-exchange.com>',
		to: '<' + messageObj.to + '>',
		subject: messageObj.subject,
		text: messageObj.text
	}, function(err, result) {
		callback(err, result);
		return;
	});

};

var report_error = function(message, callback) {

	transport.sendMail({
		from: 'DMV Exchange <auto-reporter@dmv-exchange.com>',
		to: '<report@dmv-exchange.com>',
		subject: 'Error Report Generator',
		text: message
	}, function(err, result) {
		callback(err, result);
		return;
	});

};


module.exports = {

	send: send,
	report_error: report_error

};