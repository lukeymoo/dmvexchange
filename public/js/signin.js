'use strict';

$(function() {
	/** Index login form fields for error handling and form validation **/
	var   u_or_e = {obj:$('#username-or-email')};
	var password = {obj:$('#password')};

	// Detect errors
	if(getParam('err')) {
		switch(getParam('err')) {
			case 'invalid_login':
				$('#username-or-email').val(getParam('u'));
				badStyle(password.obj);
				generateSigninError('Username/Email and password combination incorrect', password.obj);
				break;
		}
	}

	/** Focus on username/email field on load **/
	$('#username-or-email').focus();

	/** Validate form on submit **/
	$('#signin-form').on('submit', function(e) {
		// Reset form styles
		resetStyles();
		// Remove previous form errors
		clearErrors();
		if(!validSignin()) {
			e.preventDefault();
		}
	});
});

function resetStyles() {
	$('#signin-form .field').each(function() {
		goodStyle($(this));
	});
}

function clearErrors() {
	$('.form-error').each(function() {
		$(this).remove();
	});
	return;
}

function generateSigninError(string, field) {
	$("<span class='form-error'>" + string + "</span>").insertAfter(field);
}

function validSignin() {
	var status = true;

	var   u_or_e = {
		obj:$('#username-or-email'),
		val: $('#username-or-email').val()
	};
	var password = {
		obj:$('#password'),
		val: $('#password').val()
	};

	if(!validateUsername(u_or_e.val)) {
		status = false;
		generateSigninError('Invalid username or email', password.obj);
	}

	if(!validatePassword(password.val)) {
		status = false;
		generateSigninError('Invalid password', password.obj);
	}

	return status;
}

function validateUsername(string) {
	return (/^[A-Za-z0-9_]+$/.test(string)
		&& string.length >= 2
		&& string.length < 16) ? true : false;
}

function validateEmail(string) {
	return (/^([a-zA-Z0-9_.+-])+\@(([a-zA-Z0-9-])+\.)+([a-zA-Z0-9]{2,4})+$/.test(string)
		&& string.length < 64) ? true : false;
}

function validatePassword(string) {
	return (string.length > 2 && string.length < 32) ? true : false;
}