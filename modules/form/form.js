'use strict';

var validateName = function(string) {
	var status = true;
	var reg = /^[A-Za-z]+(([\'-])?[A-Za-z]+$)/;
	if(!reg.test(string) || string.length < 2 || string.length > 32) {
		status = false;
	}
	return status;
};

var validateEmail = function(string) {
	var status = true;
	var reg = /^([a-zA-Z0-9_.+-])+\@(([a-zA-Z0-9-])+\.)+([a-zA-Z0-9]{2,4})+$/;
	if(!reg.test(string)) {
		status = false;
	}
	return status;
};

var validateUsername = function(string) {
	var status = true;
	var reg = /^[A-Za-z0-9_]+$/;
	if(!reg.test(string) || string.length < 2 || string.length > 15) {
		status = false;
	}
	return status;
};

var validatePassword = function(string) {
	var status = true;
	if(string.length < 2 || string.length > 32) {
		status = false;
	}
	return status;
};

var validateTOS = function(string) {
	var status = true;
	if(string != 'I_AGREE') {
		status = false;
	}
	return status;
};

var isRegisterProper = function(form) {
	var status = true;

	// Ensure we recieved all parts of the form
	if(!('f' in form) || form.f.length == 0) {
		status = false;
	}
	if(!('l' in form) || form.l.length == 0) {
		status = false;
	}
	if(!('e' in form) || form.e.length == 0) {
		status = false;
	}
	if(!('ea' in form) || form.ea.length == 0) {
		status = false;
	}
	if(!('u' in form) || form.u.length == 0) {
		status = false;
	}
	if(!('p' in form) || form.p.length == 0) {
		status = false;
	}
	if(!('pa' in form) || form.pa.length == 0) {
		status = false;
	}
	if(!('tos' in form) || form.tos.length == 0 || form.tos != 'I_AGREE') {
		status = false;
	}

	return status;
};

var isLoginProper = function(form) {
	var status = true;

	/**
		Ensure we recieved the username / password
	*/
	if(!'u' in form || form.u.length == 0) {
		status = false;
	}
	if(!'p' in form || form.p.length == 0) {
		status = false;
	}

	return status;
};

module.exports = {
	validateName: validateName,
	validateEmail: validateEmail,
	validateUsername: validateUsername,
	validatePassword: validatePassword,
	validateTOS: validateTOS,
	isRegisterProper: isRegisterProper,
	isLoginProper: isLoginProper
};