'use strict';

$(function() {

	/** Open Compose Form **/
	$(document).on('click', '#actionContainer .compose', function() {
	});

	/** Give focus to messageTo on container click **/
	$(document).on('click', '#messageToContainer', function(e) {
		if(!$(e.target).is('.token')) {
			$('#messageTo').focus();
		}
	});

	/** Add/Remove recipient token **/
	$(document).on('keydown', '#messageTo', function(e) {
		// On Backspace
		if(e.which == 8) {
			// Remove last token if empty input
			var inputText = $(this).html();
			if(inputText.length == 0) {
				// Remove last token
				removeToken();
				return false;
			}
		}
		// On enter key
		if(e.which == 13) {
			var inputText = $(this).html();
			// Stop if invalid username
			if(!validUsername(inputText)) {
				createAlert('Not a valid username', 'medium');
				return false;
			}
			// Stop if recipient limit has been reached ( limit == 10 )
			if(getTokenCount() >= 10) {
				createAlert('Maximum number of recipients reached', 'medium');
				return false;
			}
			// Stop if token has already been added
			if(tokenExists(inputText)) {
				createAlert('Already a recipient', 'medium');
				return false;
			}
			// Create the token & clear input
			createToken(inputText);
			$(this).html('');
			e.preventDefault();
		}
	});

});

function getTokenCount() {
	return $('.token').length;
}

function tokenExists(string) {
	string = string.toLowerCase();
	var status = false;
	$('.token').each(function() {
		if($(this).attr('data-value') == string) {
			status = true;
		}
	});
	return status;
}

function validUsername(string) {
	string = string.toLowerCase();
	return (/^[A-Za-z0-9_]+$/.test(string) && string.length >= 2 && string.length < 16) ? true : false;
}

function createToken(string) {
	string = string.toLowerCase();
	var	DOM = "<span class='token' data-value='" + string + "'>" + string + "</span>";
	$(DOM).insertBefore($('#messageTo'));
	return;
}

function removeToken(token) {
	token = token || null;
	// If a token was supplied, find and remove
	if(token) {

	} else { // If no token was supplied, remove last token
		$('.token').last().remove();
	}
}
