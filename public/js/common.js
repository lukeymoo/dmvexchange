'use strict';

// Contains session values
var state = {};
var page = '';

$(function() {

	// remove window message on close button
	$(document).on('click', '.notification .close_button', function() {
		close_window_message($(this).parent());
	});


	// Get page
	page = getPage();

	// Check if logged in
	$.ajax({
		url: '/api/session'
	}).done(function(res) {

		// store response in global object
		state = res.state;

		// Check session every 5 minute
		// if logged in add interval to ensure session has not timed out
		if(state.LOGGED_IN) {


			if(page != 'Mail') {
				// Check unread messages and display counter
				// next to mail button
				getUnreadCount(function(res) {
					// Append mail button
					if(res.status == 'DX-OK') {
						if(parseInt(res.message) > 0) {
							var DOM = 'Mail<span id="unreadCount">' + res.message + '</span>';
							$('#headerControls #left').html(DOM);
						}
					}
				});
			}

			setInterval(function() {
				$.ajax({
					url: '/api/session',
					data: {
						r: 'state'
					}
				}).done(function(res) {
					if(res.status == 'DX-OK') {
						if(res.message == 'false') {
							window.location.href = '/signin';
						}
					}
				});
			}, 120000);
		}

	});
	

	// General click handler
	$(document).on('click', function(e) {
		if(isMenu()) {
			if(!$('#headerMenu').is(e.target)
				&& $('#headerMenu').has(e.target).length === 0
				&& !$('#menuButton').is(e.target)) {
				toggleMenu();
			}
		}
	});

	// MenuButton - on click
	$('#pageHeader #menuButton').on('click', function() {
		toggleMenu();
	});
});










function window_message(message, type) {

	type = type || 'low'; // normal alert level
	
	var id = new Date().getTime();
	var classes = 'notification';

	switch(type) {
		case 'low':
			classes += ' defcon1';
			break;
		case 'medium':
			classes += ' defcon3';
			break;
		case 'high':
			classes += ' defcon5';
			break;
	}

	var DOM =
	"<div data-id='" + id + "' class='" + classes + "'>" +
		"<span class='close_button'>&times;</span>" +
		"<span class='text'>" + message + "</span>" +
	"</div>";

	// timeout fadeout and remove
	setTimeout(function() {
		if($('div[data-id=' + id + ']')) {
			$('div[data-id=' + id + ']').fadeOut(function() {
				$(this).remove();
			});
		}
	}, 7000);
	$('#notification_container').prepend(DOM);
	return;
}

function close_window_message(obj) {
	$(obj).fadeOut(function() {
		$(this).remove();
	});
	return;
}

function goodStyle(obj) {
	$(obj).css('border', '2px solid rgb(200, 200, 200)');
}

function badStyle(obj) {
	$(obj).css('border', '2px solid rgb(175, 0, 0)');
	return;
}

function clickHandler() {
	return;
}

function isMenu() {
	return ($('#headerMenu').attr('data-selected') == 'true') ? true : false;
}

function toggleMenu() {
	if($('#headerMenu').attr('data-selected') == 'true') {
		if($('#headerMenu').hasClass('showHeaderMenu')) {
			$('#headerMenu').removeClass('showHeaderMenu');
		}
		if(!$('#headerMenu').hasClass('showHeaderMenu-reverse')) {
			$('#headerMenu').addClass('showHeaderMenu-reverse');
		}
		$('#headerMenu').attr('data-selected', 'false');

	} else if($('#headerMenu').attr('data-selected') == 'false') {

		if($('#headerMenu').hasClass('showHeaderMenu-reverse')) {
			$('#headerMenu').removeClass('showHeaderMenu-reverse');
		}
		if(!$('#headerMenu').hasClass('showHeaderMenu')) {
			$('#headerMenu').addClass('showHeaderMenu');
		}
		$('#headerMenu').attr('data-selected', 'true');
	}
	return;
}

function getParam(sParam) {
	var sPageURL = window.location.search.substring(1);
	var sURLVariables = sPageURL.split('&');
	for(var i = 0; i < sURLVariables.length; i++) {
		var sParameterName = sURLVariables[i].split('=');
		if (sParameterName[0] == sParam) {
			return sParameterName[1];
		}
	}
}

function getPage() {
	var page = $(document).find('title').html().substring(5);
	return page;
}

function getUnreadCount(callback) {
	$.ajax({
		url: '/api/unread',
	}).done(function(res) {
		callback(res);
	});
}