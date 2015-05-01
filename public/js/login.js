'use strict';

$(function() {
	// Give focus on load
	$('#loginForm #username').focus();

	// Validate username as entering
	$('#loginForm #username').on('keyup change', function(e) {
		if(e.which == 13) {
			$('#loginFormContainer button').click();
		}

		if(!validateUsername($(this).val())) {
			if(!validateEmail($(this).val())) {
				badStyle($(this));
			} else {
				goodStyle($(this));
			}
		} else {
			goodStyle($(this));
		}
	});

	// Validate password as entering
	$('#loginForm #password').on('keyup change', function(e) {
		if(e.which == 13) {
			$('#loginFormContainer button').click();
		}

		if(validatePassword($(this).val())) {
			goodStyle($(this));
		} else {
			badStyle($(this));
		}
	});

	// Login button
	$('#loginFormContainer button').on('click', function() {
		if(validateLogin()) {
			// submit
			$('#loginForm').submit();
		}
	});


	// Detect errors
	if(getParam('err')) {
		switch(getParam('err')) {
			case 'invalid_login':
				$('#loginForm #username').val(getParam('u'));
				window_message('Invalid login credentials');
				break;
		}
	}
});

function validateLogin() {
	var status = true;

	if(!validateUsername($('#loginForm #username').val())) {
		if(!validateEmail($('#loginForm #username').val())) {
			badStyle($('#loginForm #username'));
			status = false;
		} else {
			goodStyle($('#loginForm #username'));
		}
	} else {
		goodStyle($('#loginForm #username'));
	}

	if(!validatePassword($('#loginForm #password').val())) {
		badStyle($('#loginForm #password'));
		status = false;
	} else {
		goodStyle($('#loginForm #password'));
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