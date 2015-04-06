'use strict';

$(function() {

	// Give focus to firstname field
	$('#registerForm #firstname').focus();

	// Validate FIRSTNAME on entry
	$('#registerForm #firstname').on('keyup change', function() {
		if(!validateName($(this).val())) {
			badStyle($(this));
		} else {
			goodStyle($(this));
		}
	});

	// Validate LASTNAME on entry
	$('#registerForm #lastname').on('keyup change', function() {
		if(!validateName($(this).val())) {
			badStyle($(this));
		} else {
			goodStyle($(this));
		}
	});

	// Email
	$('#registerForm #email').on('keyup change', function() {

		if($('#registerForm #emailAgain').val().length > 0) {
			if($(this).val() != $('#registerForm #emailAgain').val()) {
				badStyle($('#registerForm #emailAgain'));
			} else {
				goodStyle($('#registerForm #emailAgain'));
			}
		}

		if(!validateEmail($(this).val())) {
			if($('#registerForm #emailAgain').val() == $(this).val()) {
				badStyle($('#registerForm #emailAgain'));
			}
			badStyle($(this));
		} else {
			goodStyle($(this));
		}
	});

	// Email confirmation
	$('#registerForm #emailAgain').on('keyup change', function() {
		if($(this).val() != $('#registerForm #email').val()) {
			badStyle($(this));
		} else {
			goodStyle($(this));
		}
	});

	// Username
	$('#registerForm #username').on('keyup change', function() {
		if(!validateUsername($(this).val())) {
			badStyle($(this));
		} else {
			goodStyle($(this));
		}
	});

	// Passwords
	$('#registerForm #password').on('keyup change', function() {

		if($('#registerForm #passwordAgain').val().length > 0) {
			if($(this).val() != $('#registerForm #passwordAgain').val()) {
				badStyle($('#registerForm #passwordAgain'));
			} else {
				goodStyle($('#registerForm #passwordAgain'));
			}
		}

		if(!validatePassword($(this).val())) {
			if($('#registerForm #passwordAgain').val() == $(this).val()) {
				badStyle($('#registerForm #passwordAgain'));
			}
			badStyle($(this));
		} else {
			goodStyle($(this));
		}
	});

	$('#registerForm #passwordAgain').on('keyup change', function() {
		if($(this).val() != $('#registerForm #password').val()) {
			badStyle($(this));
		} else {
			goodStyle($(this));
		}
	});

	// Validate on signup click
	$('#registerFormContainer button').on('click', function() {
		resetForm();
		if(validateRegister()) {
			$('#registerForm').submit();
		}
	});


	// Error handling
	if(getParam('err')) {
		// Fill in fields with returned values
		$('#registerForm #firstname').val(getParam('f'));
		$('#registerForm #lastname').val(getParam('l'));
		$('#registerForm #email').val(getParam('e'));
		$('#registerForm #emailAgain').val(getParam('e'));
		$('#registerForm #username').val(getParam('u'));

		var errors = getParam('err').split('|');
		for(var error in errors) {
			switch(errors[error]) {
				case 'F':
					$('#registerForm #firstname').val('');
					badStyle($('#registerForm #firstname'));
					$('#registerForm #nameError').html('Invalid name');
					$('#registerForm #nameError').css('display', 'block');
					break;
				case 'L':
					$('#registerForm #lastname').val('');
					badStyle($('#registerForm #lastname'));
					$('#registerForm #nameError').html('Invalid name');
					$('#registerForm #nameError').css('display', 'block');
					break;
				case 'U':
					$('#registerForm #username').val('');
					badStyle($('#registerForm #username'));
					$('#registerForm #usernameError').html('Username invalid');
					$('#registerForm #usernameError').css('display', 'block');
					break;
				case 'E':
					$('#registerForm #email').val('');
					$('#registerForm #emailAgain').val('');
					badStyle($('#registerForm #email'));
					$('#registerForm #emailError').html('Email invalid');
					$('#registerForm #emailError').css('display', 'block');
					break;
				case 'EM':
					$('#registerForm #email').val('');
					$('#registerForm #emailAgain').val('');
					$('#registerForm #emailError').html('Emails did not match');
					$('#registerForm #emailError').css('display', 'block');
					break;
				case 'PM':
					$('#registerForm #password').val('');
					$('#registerForm #passwordAgain').val('');
					$('#registerForm #passwordError').html('Passwords did not match');
					$('#registerForm #passwordError').css('display', 'block');
					break;
				case 'UIN':
					$('#registerForm #username').val('');
					badStyle($('#registerForm #username'));
					$('#registerForm #usernameError').html('Username in use');
					$('#registerForm #usernameError').css('display', 'block');
					break;
				case 'EIN':
					$('#registerForm #email').val('');
					$('#registerForm #emailAgain').val('');
					badStyle($('#registerForm #email'));
					$('#registerForm #emailError').html('Email in use');
					$('#registerForm #emailError').css('display', 'block');
					break;
			}
		}
	}
});

function resetForm() {
	$('#registerForm').find('input').each(function() {
		goodStyle($(this));
	});

	$('#registerForm').find('div').each(function() {
		var id = $(this).attr('id');
		if(id.indexOf('Error') > -1) {
			$(this).html('');
			$(this).css('display', 'none');
		}
	});
	return;
}

function validateRegister() {
	var status = true;

	if(!validateName($('#registerForm #firstname').val())) {
		badStyle($('#registerForm #firstname'));
		status = false;
	} else {
		goodStyle($('#registerForm #firstname'));
	}

	if(!validateName($('#registerForm #lastname').val())) {
		badStyle($('#registerForm #lastname'));
		status = false;
	} else {
		goodStyle($('#registerForm #lastname'));
	}

	if(!validateEmail($('#registerForm #email').val())) {
		badStyle($('#registerForm #email'));
		status = false;
	} else {
		goodStyle($('#registerForm #email'));
	}

	if($('#registerForm #email').val() != $('#registerForm #emailAgain').val()) {
		badStyle($('#registerForm #emailAgain'));
		status = false;
	} else {
		goodStyle($('#registerForm #emailAgain'));
	}

	if(!validateUsername($('#registerForm #username').val())) {
		badStyle($('#registerForm #username'));
		status = false;
	} else {
		goodStyle($('#registerForm #usernamea'));
	}

	if(!validatePassword($('#registerForm #password').val())) {
		badStyle($('#registerForm #password'));
		status = false;
	} else {
		goodStyle($('#registerForm #password'));
	}

	if($('#registerForm #password').val() != $('#registerForm #passwordAgain').val()) {
		badStyle($('#registerForm #passwordAgain'));
		status = false;
	} else {
		goodStyle($('#registerForm #passwordAgain'));
	}

	if(!$('#registerForm #tosContainer').find('input').is(':checked')) {
		$('#registerForm #tosContainer').find('input').css('outline', '2px solid rgb(175, 0, 0)');
		status = false;
	} else {
		$('#registerForm #tosContainer').find('input').css('outline', 'none');
	}

	return status;
}

function validateName(string) {
	return (/^[A-Za-z]+(([\'-])?[A-Za-z]+$)/.test(string)
		&& string.length >= 2 && string.length < 32) ? true : false;
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