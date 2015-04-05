'use strict';

$(function() {
	var currentPassword = $('#passwordPanel #currentPassword');
	var newPassword = $('#passwordPanel #newPassword');
	var newPasswordAgain = $('#passwordPanel #newPasswordAgain');

	$(currentPassword, newPassword, newPasswordAgain).on('keyup change', function() {
		if(validatePassword($(this).val())) {
			goodStyle($(this));
		} else {
			badStyle($(this));
		}
	});

	$(newPassword).on('keyup change', function() {
		if(validatePassword($(this).val())) {
			goodStyle($(this));
		} else {
			badStyle($(this));
		}
	});

	$(newPasswordAgain).on('keyup change', function() {
		if(validatePassword($(this).val())) {
			goodStyle($(this));
		} else {
			badStyle($(this));
		}

		if($(this).val() != $(newPassword).val()) {
			badStyle($(this));
		} else {
			goodStyle($(this));
		}
	});

	// Submit password change
	$('#passwordPanel button').on('click', function() {
		if(validateChange()) {

			var req = {
				oldP: $(currentPassword).val(),
				newP: $(newPassword).val(),
				newPA: $(newPasswordAgain).val()
			};

			changePassword(req, function(res) {
				if(res.status == 'DX-OK') {
					$(currentPassword).val('');
					$(newPassword).val('');
					$(newPasswordAgain).val('');

					spawnMessage(res.message, true);
				} else {
					spawnMessage(res.message, false);
				}
			});
		} else {
			spawnMessage('Invalid fields', false);
		}
	});

});

function changePassword(req, callback) {
	$.ajax({
		url: '/api/chgpwd',
		data: req
	}).done(function(res) {
		callback(res);
	});
}

function validateChange() {
	var status = true;

	if(validatePassword($(currentPassword).val())) {
		goodStyle(currentPassword);
	} else {
		badStyle(currentPassword);
		status = false;
	}

	if(validatePassword($(newPassword).val())) {
		goodStyle(newPassword);
	} else {
		badStyle(newPassword);
		status = false;
	}

	if(validatePassword($(newPasswordAgain).val())) {
		goodStyle(newPasswordAgain);
	} else {
		badStyle(newPasswordAgain);
		status = false;
	}

	if($(newPassword).val() != $(newPasswordAgain).val()) {
		status = false;
	}

	if($(currentPassword).val() == $(newPassword).val()) {
		status = false;
		badStyle(currentPassword);
		badStyle(newPassword);
		badStyle(newPasswordAgain);
	}

	return status;
}

function validatePassword(string) {
	return (string.length >= 2 && string.length <= 32) ? true : false;
}