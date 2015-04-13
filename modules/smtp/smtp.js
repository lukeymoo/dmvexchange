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


module.exports = {

	send: send

};