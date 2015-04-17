'use strict';

$(function() {
	var currentPassword = $('#passwordPanel #currentPassword');
	var newPassword = $('#passwordPanel #newPassword');
	var newPasswordAgain = $('#passwordPanel #newPasswordAgain');
	
	// Bind page tabs ( changing views )
	$('#accountControlsContainer #accountTab').on('click', function() {
		// if tab isnt already selected
		if($(this).attr('data-selected') != 'true') {
			// Deselect all tabs , select this tab & display this view ( #accountSettings )
			$('#accountControlsContainer').find('div').each(function() {
				$(this).attr('data-selected', 'false');
			});

			$(this).attr('data-selected', 'true');
			$('#passwordPanel').hide();
			$('#accountSettings').show();
		}
	});

	// password tab
	$('#accountControlsContainer #passwordTab').on('click', function() {
		// tab isnt already selected
		if($(this).attr('data-selected') != 'true') {
			// Deselect all tabs , select this tab & display this view ( #passwordPanel )
			$('#accountControlsContainer').find('div').each(function() {
				$(this).attr('data-selected', 'false');
			});

			$(this).attr('data-selected', 'true');
			$('#accountPanel #accountSettings').hide();
			$('#accountPanel #passwordPanel').show();
		}
	});

	// Bind link another email button
	$(document).on('click', '#addEmail', function() {
		// Remove the button
		$(this).remove();
		// Spawn an input field with add + cancel buttons
		var DOM = "<span class='newEmailContainer'>\
		<input type='text', placeholder='Email...'></input>\
		<button id='confirmAddEmail'>Add</button>\
		<button id='cancelAddEmail'>Cancel</button>\
		</span>";

		$('#emailContainer').append(DOM);

		$('#emailContainer').find('input[type=text]').focus();

	});

	// Validate new email as they're typed in
	$(document).on('keyup change', '.newEmailContainer input', function(e) {
		if(e.which == 13) {
			// Simulate add button click
			$('#confirmAddEmail').click();
		}
		if(validateEmail($(this).val())) {
			goodStyle($(this));
		} else {
			badStyle($(this));
		}
	});

	// Add the entered email
	$(document).on('click', '#confirmAddEmail', function() {
		if(validateEmail($(this).parent('.newEmailContainer').find('input[type=text]').val())) {
			goodStyle($(this).parent('.newEmailContainer').find('input[type=text]'));

			// Hide the new email container
			$(document).find('.newEmailContainer').hide();

			// Add email
			addNewEmail(function(res) {
				// If response was good, make add email button available again
				// spawn spawn with newly added email
				if(res.status == 'DX-OK') {
					// should we refresh? 
					if(res.refresh) {
						window.location.href = '/account';
					}
					updateUnread();
					// Remove the button
					$(document).find('.newEmailContainer').remove();
					spawnMessage(res.message, true);
					var DOM = "<span value='" + res.email + "' class='email'>" + res.email + "\
					<button id='removeEmail'>Remove</button>\
					</span>\
					<button id='addEmail'>Add new email</button>";
					$('#emailContainer').append(DOM);
				} else {
					spawnMessage(res.message, false);
					$('#emailContainer').find('.newEmailContainer').show();
					$('#emailContainer').find('input[type=text]').focus();
				}
			});
		} else {
			badStyle($(this).parent('.newEmailContainer').find('input[type=text]'));
		}
	});

	// Cancel addEmailButton
	$(document).on('click', '#cancelAddEmail', function() {
		// Remove the newly created line
		$(document).find('.newEmailContainer').remove();
		// Show the add button again
		var DOM = "<button id='addEmail'>Add new email</button>";
		$('#emailContainer').append(DOM);
	});

	// On email remove button remove the email
	$(document).on('click', '#removeEmail' , function() {
		var string = $(this).parent('.email').attr('value');
		removeEmail(string, function(res) {
			// if it was ok remove it
			if(res.status == 'DX-OK') {
				updateUnread();
				spawnMessage(res.message, true);
				$('.email:contains(' + string + ')').remove();
			} else {
				spawnMessage(res.message, false);
			}
		});
	});

	$(currentPassword, newPassword, newPasswordAgain).on('keyup change', function(e) {
		if(e.which == 13) {
			$('#passwordPanel button').click();
		}
		if(validatePassword($(this).val())) {
			goodStyle($(this));
		} else {
			badStyle($(this));
		}
	});

	$(newPassword).on('keyup change', function(e) {
		if(e.which == 13) {
			$('#passwordPanel button').click();
		}
		if(validatePassword($(this).val())) {
			goodStyle($(this));
		} else {
			badStyle($(this));
		}
	});

	$(newPasswordAgain).on('keyup change', function(e) {
		if(e.which == 13) {
			$('#passwordPanel button').click();
		}
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

function updateUnread() {
	getUnreadCount(function(res) {
		// Append mail button
		if(res.status == 'DX-OK') {
			if(res.message > 0) {
				var DOM = 'Mail<span id="unreadCount">' + res.message + '</span>';
				$('#headerControls #left').html(DOM);
			}
		}
	});
}

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

function validateEmail(string) {
	return (/^([a-zA-Z0-9_.+-])+\@(([a-zA-Z0-9-])+\.)+([a-zA-Z0-9]{2,4})+$/.test(string)
		&& string.length < 64) ? true : false;
}

function validateUsername(string) {
	return (/^[A-Za-z0-9_]+$/.test(string)
		&& string.length >= 2
		&& string.length < 16) ? true : false;
}

function addNewEmail(callback) {
	$.ajax({
		url: '/api/add_email',
		data: {
			email: $('.newEmailContainer').find('input[type=text]').val()
		}
	}).done(function(res) {
		callback(res);
	});
}

function removeEmail(string, callback) {
	$.ajax({
		url: '/api/remove_email',
		data: {
			email: string
		}
	}).done(function(res) {
		callback(res);
	});
}