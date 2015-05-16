'use strict';

$(function() {

	/** Indexing form fields for error handling & form validation **/
	var 		  tos = {obj: $('#tos-container')};
	var 		fname = {obj: $('#firstname')};
	var 		lname = {obj: $('#lastname')};
	var 		email = {obj: $('#email')};
	var 	   gender = {obj: $('#gender-select')};
	var 	  zipcode = {obj: $('#zipcode')};
	var 	 username = {obj: $('#username')};
	var      password = {obj: $('#password')};
	var    emailAgain = {obj: $('#email-again')};
	var passwordAgain = {obj: $('#password-again')};

	/** Give focus to first name field on load **/
	$('#firstname').focus();

	/** Display errors from processing **/
	/**
		Code				Error Meaning
		-----------			--------------
		invalid_form		Missing form field
		UIN					Username in use
		F 					Firstname invalid
		L 					Lastname invalid
		U 					Username invalid
		E 					Email invalid
		EM 					Email's don't match
		P 					Password invalid
		PM 					Password's don't match
		G 					Gender is not m || f
		Z 					Zipcode invalid

	*/
	var errors = getParam('err');
	if(errors) {
		errors = errors.split('|');
		for(var e in errors) {
			switch(errors[e]) {
				case 'F':
					generateSignupError('Invalid name', lname.obj);
					break;
				case 'L':
					generateSignupError('Invalid name', lname.obj);
					break;
				case 'U':
					generateSignupError('Invalid username', username.obj);
					break;
				case 'UIN':
					generateSignupError('Username is already in use', username.obj);
					break;
				case 'P':
					generateSignupError('Password invalid', password.obj);
					break;
				case 'PM':
					generateSignupError('Password\'s don\'t match', password.obj);
					break;
				case 'E':
					generateSignupError('Email address invalid', email.obj);
					break;
				case 'EM':
					generateSignupError('Email addresses don\'t match', email.obj);
					break;
				case 'EIN':
					generateSignupError('Email address already in use', email.obj);
					break;
			}
		}
	}

	/** On submit Validate form **/
	$('#signup-form').on('submit', function(e) {
		// Reset field styles
		resetStyles();
		// Remove previous error messages
		clearErrors();
		// Validate form
		if(!validSignup()) {
			e.preventDefault();
		}
	});
});

function resetStyles() {
	$('#signup-form .field').each(function() {
		goodStyle($(this));
	});
}

function clearErrors() {
	$('.form-error').each(function() {
		$(this).remove();
	});
	return;
}

function generateSignupError(string, field) {
	$("<span class='form-error'>" + string + "</span>").insertAfter(field);
	badStyle(field);
}

function validateName(string) {
	return (/^[A-Za-z]+(([\'-])?[A-Za-z]+$)/.test(string)
		&& string.length >= 2 && string.length < 32) ? true : false;
}

function validateZipcode(string) {
	return (/[0-9]/.test(string) && string.length == 5) ? true : false;
}

function validateEmail(string) {
	return (/^([a-zA-Z0-9_.+-])+\@(([a-zA-Z0-9-])+\.)+([a-zA-Z0-9]{2,4})+$/.test(string)
		&& string.length < 64) ? true : false;
}

function validateUsername(string) {
	return (/^[A-Za-z0-9_]+$/.test(string)
		&& string.length >= 2
		&& string.length < 16) ? true : false;
}

function validatePassword(string) {
	return (string.length > 2 && string.length < 32) ? true : false;
}

function validSignup() {
	var status = true;

	var fname = {
		obj: $('#firstname'),
		val: $('#firstname').val()
	};
	var lname = {
		obj: $('#lastname'),
		val: $('#lastname').val()
	};
	var username = {
		obj: $('#username'),
		val: $('#username').val()
	};
	var password = {
		obj: $('#password'),
		val: $('#password').val()
	};
	var passwordAgain = {
		obj: $('#password-again'),
		val: $('#password-again').val()
	};
	var email = {
		obj: $('#email'),
		val: $('#email').val()
	};
	var emailAgain = {
		obj: $('#email-again'),
		val: $('#email-again').val()
	};
	var zipcode = {
		obj: $('#zipcode'),
		val: $('#zipcode').val()
	};
	var gender = {
		obj: $('#gender-select'),
		val: $('#gender-select').val()
	};
	var tos = {
		obj: $('#tos-container'),
		val: $('#tos-checkbox').is(':checked')
	};

	// Validate names
	if(!validateName(fname.val)) {
		status = false;
		generateSignupError('Invalid name', fname.obj);
	}

	if(!validateName(lname.val)) {
		status = false;
		clearErrors();
		generateSignupError('Invalid name', lname.obj);
	}

	// Validate username
	if(!validateUsername(username.val)) {
		status = false;
		generateSignupError('Invalid username', username.obj);
	}

	// Validate password
	if(validatePassword(password.val)) {
		// If valid password ensure both password fields match
		if(password.val != passwordAgain.val) {
			status = false;
			generateSignupError('Passwords don\'t match', passwordAgain.obj);
		}
	} else {
		status = false;
		generateSignupError('Invalid password', password.obj);
	}

	// Validate email
	if(validateEmail(email.val)) {
		// If valid email ensure both fields match
		if(email.val != emailAgain.val) {
			status = false;
			generateSignupError('Email addresses don\'t match', emailAgain.obj);
		}
	} else {
		status = false;
		generateSignupError('Invalid email', email.obj);
	}

	// Validate Zipcode
	if(!validateZipcode(zipcode.val)) {
		status = false;
		generateSignupError('Invalid zipcode', zipcode.obj);
	}

	// Ensure a gender was selected
	if(gender.val != 'm' && gender.val != 'f') {
		status = false;
		generateSignupError('Must select a gender', gender.obj);
	}

	// Ensure Terms of service has been agreed to
	if(!tos.val) {
		status = false;
		generateSignupError('Must agree to terms of service', tos.obj);
	}

	return status;
}