'use strict';


var currentView = '[INBOX]';

var parsedMessages = [];
var selectedMessages = [];

$(function() {

	// generate message actions
	generateActions();

	// Onload contact server and retreive inbox messages
	updateView(function(res) {
		// Parse the response
		parseJSON(res);
	});

	// Bind selectAll
	$(document).on('click', '#mailFilters #selectAll', function(e) {

		var propTo = $(this).find('input').prop('checked');

		if(e.target.nodeName != 'INPUT') {
			$(this).find('input').prop('checked', !propTo);
		} else {
			propTo = !propTo;
		}

		if(propTo) {
			// deselect all
			$('#messageContainer').find('.message').each(function() {
				if($(this).find('input').prop('checked')) {
					deselectMessages($(this));

					// deactivate selectedmessages ( change color )
					$('#mailActionsContainer').attr('data-active', 'false');
				}
			});
		} else {
			// select all
			$('#messageContainer').find('.message').each(function() {
				if(!$(this).find('input').prop('checked')) {
					selectMessages($(this));
				}
				// activate selectedmessages ( change color )
				$('#mailActionsContainer').attr('data-active', 'true');
			});
		}

	});

	// Bind select ( Make it easier to select a message )
	$(document).on('click', '.message #select', function(e) {

		if(e.target.nodeName != 'INPUT') {
			var propTo = $(this).find('input').prop('checked');
			$(this).find('input').prop('checked', !propTo);
		}

		// toggle message
		toggleMessage($(this).parent('.message').find('#id').html());

	});

	// Bind switch view
	$('#mailControls #inbox').on('click', function() {
		if(currentView != '[INBOX]') {
			switchView('[INBOX]');
		}
	});
	$('#mailControls #trash').on('click', function() {
		if(currentView != '[TRASH]') {
			switchView('[TRASH]');
		}
	});

	// Bind actions menu on click
	$('#mailActionsContainer #mailActionsButton').on('click', function() {
		if(selectedMessages.length > 0) {
			Messenger.hideForm();
			toggleActionsMenu();
		}
	});

	// bind mark as read action
	$(document).on('click', '#markRead', function() {
		if(selectedMessages.length > 0) {
			markRead(function(res) {
				// add unread class to all the selected
				$('#messageContainer').find('.message').each(function() {
					for(var id in selectedMessages) {
						if(selectedMessages[id] == $(this).find('#id').html()) {
							if($(this).hasClass('unread')) {
								$(this).removeClass('unread');
							}
						}
					}
				});
				if(res.status != 'DX-OK') {
					spawnMessage(res.message, false);
				}
			});
		}
	});

	// bind mark as unread action
	$(document).on('click', '#markUnread', function() {
		if(selectedMessages.length > 0) {
			markUnread(function(res) {
				// remove unread class from all the selected
				$('#messageContainer').find('.message').each(function() {
					// is id in selected
					for(var id in selectedMessages) {
						if(selectedMessages[id] == $(this).find('#id').html()) {
							if(!$(this).hasClass('unread')) {
								$(this).addClass('unread');
							}
						}
					}
				});
				if(res.status != 'DX-OK') {
					spawnMessage(res.message, false);
				}
			});
		}
	});

	//bind move to inbox
	$(document).on('click', '#markInbox', function() {
		if(selectedMessages.length > 0) {
			// Hide from view until response is success otherwise return to view
			$('#messageContainer').find('.message').each(function() {
				for(var id in selectedMessages) {
					if(selectedMessages[id] == $(this).find('#id').html()) {
						$(this).css('display', 'none');
					}
				}
			});

			// mark inbox
			markInbox(function(res) {
				// if success remove elements
				if(res.status == 'DX-OK') {
					// Hide from view until response is success otherwise return to view
					$('#messageContainer').find('.message').each(function() {
						for(var id in selectedMessages) {
							if(selectedMessages[id] == $(this).find('#id').html()) {
								// Deselect select all and disable action menu
								disableActionMenu();
								$('#mailFilters #selectAll').find('input').prop('checked', false);
								$(this).remove();
							}
						}
					});
				} else {
					spawnMessage(res.message, false);
					// if not return them to view
					$('#messageContainer').find('.message').each(function() {
						for(var id in selectedMessages) {
							if(selectedMessages[id] == $(this).find('#id').html()) {
								$(this).css('display', 'block');
							}
						}
					});
				}
			});
		}
	});

	// bind move to trash action
	$(document).on('click', '#markTrash', function() {
		if(selectedMessages.length > 0) {
			// Hide from view until response is success otherwise return to view
			$('#messageContainer').find('.message').each(function() {
				for(var id in selectedMessages) {
					if(selectedMessages[id] == $(this).find('#id').html()) {
						$(this).css('display', 'none');
					}
				}
			});

			markTrash(function(res) {
				// If success remove the selected elements
				if(res.status == 'DX-OK') {
					$('#messageContainer').find('.message').each(function() {
						for(var id in selectedMessages) {
							if(selectedMessages[id] == $(this).find('#id').html()) {
								// Deselect select all and disable action menu
								disableActionMenu();
								$('#mailFilters #selectAll').find('input').prop('checked', false);
								$(this).remove();
							}
						}
					});
				} else {
					// Return messages to view and show fail message
					spawnMessage(res.message, false);

					$('#messageContainer').find('.message').each(function() {
						for(var id in selectedMessages) {
							if(selectedMessages[id] == $(this).find('#id').html()) {
								$(this).css('display', 'block');
							}
						}
					});
				}
			});
		}
	});

	// Ask to delete forever
	$(document).on('click', '#markGone', function() {
		askMarkGone();
	});

	// cancel mark gone
	$(document).on('click', '#markGoneContainer #cancelMarkGone', function() {
		closeMarkGone();
	});

	// Officially delete forever
	$(document).on('click', '#markGoneContainer #confirmMarkGone', function() {
		// Close markGone
		closeMarkGone();
		markGone(function(res) {
			// Hide from view initially
			$('#messageContainer').find('.message').each(function() {
				for(var id in selectedMessages) {
					if(selectedMessages[id] == $(this).find('#id').html()) {
						$(this).css('display', 'none');
					}
				}
			});
			if(res.status == 'DX-OK') {
				spawnMessage('Messages deleted', true);
				// Remove node from container
				$('#messageContainer').find('.message').each(function() {
					for(var id in selectedMessages) {
						if(selectedMessages[id] == $(this).find('#id').html()) {
							// Deselect select all
							disableActionMenu();
							$('#mailFilters #selectAll').find('input').prop('checked', false);
							$(this).remove();
						}
					}
				});
			} else {
				// return to view and spawn error
				spawnMessage(res.message, false);
				$('#messageContainer').find('.message').each(function() {
					for(var id in selectedMessages) {
						if(selectedMessages[id] == $(this).find('#id').html()) {
							$(this).css('display', 'block');
						}
					}
				});
			}
		});
	});

	// Bind message on click
	$(document).on('click', '#messageContainer .message', function(e) {
		if(!$(this).find('#select').is(e.target)
			&& $(this).find('#select').has(e.target).length === 0) {
			hideActionsMenu();
			// Send read message to server
			if($(this).hasClass('unread')) {
				$(this).removeClass('unread');
			}
			readMessage($(this).find('#id').html());
			showMessage($(this));
		}
	});

	$(document).on('click', '#messageViewer #closeButton', function() {
		hideMessage();
	});

	$(document).on('keyup change', '#messageViewer textarea', function() {
		if(validateMessage($(this).val())) {
			goodStyle($(this));
		} else {
			badStyle($(this));
		}
	});

	// Bind message reply button
	$(document).on('click', '#messageViewer #replyButton', function() {

		// validate content then parse into object and call sendMail()
		if(validateMessage($('#messageViewer textarea').val())) {
			goodStyle($('#messageViewer textarea'));
			var replyMessage = {};
			replyMessage.title = $('#messageViewer #messageSubject').html();
			if(replyMessage.title.indexOf('RE: ') == -1) {
				replyMessage.title = 'RE: ' + replyMessage.title;
			}
			replyMessage.message = $('#messageViewer textarea').val();
			replyMessage.targets = [$('#messageViewer #from').html()];
			sendMail(replyMessage, function(res) {
				// Remove overlays
				hideMessage();

				if(res.status == 'DX-OK') {
					spawnMessage(res.message, true);
				} else {
					spawnMessage(res.message, false);
				}
			});
		} else {
			badStyle($('#messageViewer textarea'));
		}

	});

	// Set interval update view every 15 seconds
	setInterval(function() {
		updateView(function(res) {
			// Parse the response
			parseJSON(res);
		});
	}, 15000);
});







/** HELPER FUNCTIONS **/

function toggleCompose() {
	if($('#mailWrapper #composeForm').attr('data-active') == 'false') {
		composeMessage();
	} else if($('#mailWrapper #composeForm').attr('data-active') == 'true') {
		closeCompose();
	}
	return;
}

function composeMessage() {
	if($('#mailWrapper #composeForm').attr('data-active') == 'false') {
		$('#mailWrapper #composeForm').show();
		$('#composeForm #messageTo').focus();
		$('#mailWrapper #composeForm').attr('data-active', 'true');
	}
	return;
}

function closeCompose() {
	if($('#mailWrapper #composeForm').attr('data-active') == 'true') {
		$('#mailWrapper #composeForm').hide();
		$('#mailWrapper #composeForm').attr('data-active', 'false');
	}
	return;
}

function disableActionMenu() {
	// disable action menu
	$('#mailActionsContainer').attr('data-active', 'false');
	return;
}

function readMessage(messageId) {
	$.ajax({
		url: '/api/mail',
		data: {
			request: 'UPDATE',
			to: 'READ',
			messages: [messageId]
		}
	}).done(function(res) {
	});
}

function showMessage(messageObj) {
	// Fill in the divs
	var title = $(messageObj).find('#title').html();
	var from = $(messageObj).find('#from').html();
	var to = $(messageObj).find('#to').html();
	var content = $(messageObj).find('#content').html();

	$('#messageViewer #messageSubject').html(title);
	$('#messageViewer #from').html(from);
	$('#messageViewer #to').html(to);
	$('#messageViewer #content').html(content);

	$('#mailWrapper #backgroundBlur').fadeIn();

	if($('#mailWrapper #messageViewer').hasClass('showMessage-reverse')) {
		$('#mailWrapper #messageViewer').removeClass('showMessage-reverse');
	}
	if(!$('#mailWrapper #messageViewer').hasClass('showMessage')) {
		$('#mailWrapper #messageViewer').addClass('showMessage');
	}
	$('#mailWrapper #messageViewer').attr('data-active', 'true');
	return;
}

function hideMessage() {
	// Clear reply and goodstyle it
	$('#mailWrapper #messageViewer').find('textarea').val('');
	goodStyle($('#mailWrapper #messageViewer').find('textarea'));

	$('#mailWrapper #backgroundBlur').fadeOut();

	if($('#mailWrapper #messageViewer').hasClass('showMessage')) {
		$('#mailWrapper #messageViewer').removeClass('showMessage');
	}
	if(!$('#mailWrapper #messageViewer').hasClass('showMessage-reverse')) {
		$('#mailWrapper #messageViewer').addClass('showMessage-reverse');
	}
	$('#mailWrapper #messageViewer').attr('data-active', 'false');
	return;
}

function markRead(callback) {
	$.ajax({
		url: '/api/mail',
		data: {
			request: 'UPDATE',
			to: 'READ',
			messages: selectedMessages
		}
	}).done(function(res) {
		callback(res);
	});
}

function markUnread(callback) {
	$.ajax({
		url: '/api/mail',
		data: {
			request: 'UPDATE',
			to: 'UNREAD',
			messages: selectedMessages
		}
	}).done(function(res) {
		callback(res);
	});
}

function markInbox(callback) {
	$.ajax({
		url: '/api/mail',
		data: {
			request: 'UPDATE',
			to: 'INBOX',
			messages: selectedMessages
		}
	}).done(function(res) {
		callback(res);
	});
}

function markTrash(callback) {
	console.log(selectedMessages);
	$.ajax({
		url: '/api/mail',
		data: {
			request: 'UPDATE',
			to: 'TRASH',
			messages: selectedMessages
		}
	}).done(function(res) {
		callback(res);
	});
}

function askMarkGone() {
	// Ask user if sure
	$('#backgroundBlur').fadeIn();
	$('#markGoneContainer').fadeIn();
}

function closeMarkGone() {
	// Ask user if sure
	$('#backgroundBlur').fadeOut();
	$('#markGoneContainer').fadeOut();
}

function markGone(callback) {
	$.ajax({
		url: '/api/mail',
		data: {
			request: 'DELETE',
			messages: selectedMessages
		}
	}).done(function(res) {
		callback(res);
	});
}

function validateMessageForm() {
	var status = true;

	// title
	if(!validateTitle($('#composeForm #messageSubject').val())) {
		badStyle($('#composeForm #messageSubject'));
		status = false;
	} else {
		goodStyle($('#composeForm #messageSubject'));
	}

	// Message
	if(!validateMessage($('#composeForm #message').val())) {
		badStyle($('#composeForm #message'));
		status = false;
	} else {
		goodStyle($('#composeForm #message'));
	}

	// Recipients
	status = (validateRecipients()) ? status : false;

	return status;
}

function validateTitle(string) {
	return (string.length >= 2 && string.length <= 32) ? true : false;
}

function validateMessage(string) {
	return (string.length >= 2 && string.length <= 240) ? true : false;
}

function validateRecipients() {
	var status = true;

	// targets ( Must be at least one child .messageTo )
	var targetCount = 0;
	$('#currentTargets').find('.messageTo').each(function() {
		targetCount += 1;
	});
	if(targetCount == 0) {
		$('#currentTargets').css('border', '2px solid rgb(175, 0, 0)');
		status = false;
	} else {
		$('#currentTargets').css('border', '1px solid #aaa');
	}

	return status;
}

function addTarget(string) {

	// Ensure the user hasn't already been added

	if(validateTarget(string)) {

		var exist = false;
		$('#currentTargets').find('.messageTo').each(function() {
			if($(this).attr('value') == string) {
				exist = true;
			}
		});

		if(!exist) {
			var DOM = '<div value="' + string + '" class="messageTo">' + string + '\
			<span id="close">x</span>\
			</div>';

			$('#currentTargets').css('border', '1px solid #aaa');
			$('#composeForm #messageTo').val('');
			goodStyle($('#composeForm #messageTo'));
			$('#currentTargets').append(DOM);
		}
	}


}

function sendMail(messageObj, callback) {
	$.ajax({
		url: '/api/mail',
		data: {
			request: 'SEND',
			message: messageObj
		}
	}).done(function(res) {
		callback(res);
	});
}

function updateView(callback) {
	$.ajax({
		url: '/api/mail',
		data: {
			request: 'GET',
			view: currentView
		}
	}).done(function(res) {
		callback(res);
	});
	return;
}

function parseMessage(callback) {
	var parsed = {};

	parsed.title = $('#composeForm #messageSubject').val().toLowerCase();
	parsed.message = $('#composeForm #message').val().toLowerCase();

	// Loop through recipients and add to array
	var recipients = [];
	$('#currentTargets').find('.messageTo').each(function() {
		recipients.push($(this).attr('value'));
	});

	parsed.targets = recipients;

	callback(parsed);
}

function parseJSON(arrayObj) {
	var DOM = '';

	for(var message in arrayObj.message) {

		if(!('_id' in arrayObj.message[message])) {
			continue;
		}

		// Ensure its not already parsed
		var exist = false;
		for(var i in parsedMessages) {
			if(arrayObj.message[message]._id == parsedMessages[i]) {
				exist = true;
			}
		}
		// Also ensure it has an id field ( If not its not a valid message )
		if(!exist) {

			var unread = '';
			var targets = 'you';

			// see if we have read it or not
			for(var user in arrayObj.message[message].recipients) {
				if(arrayObj.message[message].recipients[user].username == state.USERNAME) {
					if(!arrayObj.message[message].recipients[user].read) {
						unread = ' unread';
					}
				} else {
					targets += ', ' + arrayObj.message[message].recipients[user].username;
				}
			}

			DOM += '<div class="message' + unread + '">\
			<div id="id">' + arrayObj.message[message]._id + '</div>\
			<div id="to">' + targets + '</div>\
			<div id="select"><input type="checkbox"></div>\
			<div id="title">' + arrayObj.message[message].subject + '</div>\
			<div id="content">' + arrayObj.message[message].message + '</div>\
			<div id="from">' + arrayObj.message[message].from + '</div>\
			<div id="date">' + toDate(arrayObj.message[message].timestamp) + '</div>\
			</div>'

			// Add id to parsed
			parsedMessages.push(arrayObj.message[message]._id);
		}
	}

	// Prepend message container with new DOM
	if(DOM.length > 0) {
		// deselect select all button
		$('#mailFilters #selectAll').find('input').prop('checked', false);
		$('#messageContainer').prepend(DOM);
	}
	return;
}

function toDate(messageID) {
	var id = new Date(messageID);
	var time = '';

	var period = 'am';

	var monthArr = [];
	monthArr[0] = 'Jan';
	monthArr[1] = 'Feb';
	monthArr[2] = 'Mar';
	monthArr[3] = 'Apr';
	monthArr[4] = 'May';
	monthArr[5] = 'Jun';
	monthArr[6] = 'Jul';
	monthArr[7] = 'Aug';
	monthArr[8] = 'Sept';
	monthArr[9] = 'Oct';
	monthArr[10] = 'Nov';
	monthArr[11] = 'Dec';

	var month = monthArr[id.getMonth()];
	var day = id.getDate();
	var hour = id.getHours();
	if(hour > 12) {
		period = 'pm';
		hour -= 12;
	}
	var minute = id.getMinutes();
	if(minute < 10) {
		minute = '0' + minute;
	}

	time = month + '. ' + day + '&nbsp;&nbsp;' + hour + ':' + minute + ' ' + period;

	return time;
}

function switchView(string) {

	// Hide the actions menu
	hideActionsMenu();

	var newView = string.substring(1, string.length - 1).toLowerCase();

	// update the selected tab
	$('#mailControls').find('div').each(function() {
		if($(this).attr('data-selected') == 'true') {
			$(this).attr('data-selected', 'false');
		}
		if($(this).attr('id') == newView) {
			$(this).attr('data-selected', 'true');
		}
	});

	// deselect selectall
	$('#mailFilters #selectAll').find('input').prop('checked', false);

	// deactivate actions menu
	$('#mailActionsContainer').attr('data-active', 'false');

	// clear message container
	clearView();

	// clear parsedMessages
	parsedMessages = [];
	selectedMessages = [];

	// store new view
	currentView = string;

	// generate new message actions
	generateActions();

	updateView(function(res) {
		parseJSON(res);
	});
	return;
}

function toggleActionsMenu() {
	if($('#mailActions').attr('data-selected') == 'true') {
		hideActionsMenu();
	} else {
		showActionsMenu();
	}
	return;
}

function showActionsMenu() {
	if($('#mailActions').hasClass('showActionsMenu-reverse')) {
		$('#mailActions').removeClass('showActionsMenu-reverse');
	}
	if(!$('#mailActions').hasClass('showActionsMenu')) {
		$('#mailActions').addClass('showActionsMenu');
	}
	$('#mailActions').attr('data-selected', 'true');
	return;
}

function hideActionsMenu() {
	if($('#mailActions').hasClass('showActionsMenu')) {
		$('#mailActions').removeClass('showActionsMenu');

		if(!$('#mailActions').hasClass('showActionsMenu-reverse')) {
			$('#mailActions').addClass('showActionsMenu-reverse');
		}
	}
	$('#mailActions').attr('data-selected', 'false');
	return;
}

function generateActions() {
	var DOM = '';
	// Remove actions
	$('#mailActions').empty();

	switch(currentView) {
		case '[INBOX]':
		// Delete mark gone
		$('#markGoneContainer').remove();
		DOM = '<div id="markRead">Mark read</div>\
			<div id="markUnread">Mark unread</div>\
			<div id="markTrash">Move to trash</div>';
			break;
		case '[TRASH]':
			var confirmGoneElem = '<div id="markGoneContainer">\
			<div id="header">Are you sure ?</div>\
			<div id="cancelMarkGone">Cancel</div>\
			<div id="confirmMarkGone">Yes, Delete forever</div>\
			</div>';
			DOM = '<div id="markInbox">Move to inbox</div>\
			<div id="markGone">Delete forever</div>';

			// Append wrapper with confirmGoneElem
			$('#mailWrapper').append(confirmGoneElem);
			break;
	}

	// Append the dom
	$('#mailActions').append(DOM);
	return;
}

function clearView() {
	$('#messageContainer').find('.message').each(function() {
		$(this).remove();
	});
	return;
}

function toggleMessage(id) {

	if($('#mailActions').attr('data-selected') == 'true') {
		hideActionsMenu();
	}

	// remove
	for(var i = 0; i < selectedMessages.length; i++) {
		if(selectedMessages[i] == id) {
			// see if selected all
			if(selectedMessages.length == parsedMessages.length) {
				// if yes deselect selectall
				$('#mailFilters #selectAll').find('input').prop('checked', false);
			}
			selectedMessages.splice(i, 1);

			// deactivate actions menu
			if(selectedMessages.length > 0) {
				$('#mailActionsContainer').attr('data-active', 'true');
			} else {
				$('#mailActionsContainer').attr('data-active', 'false');
			}

			return;
		}
	}

	// add
	selectedMessages.push(id);
	// see if selected all
	if(selectedMessages.length == parsedMessages.length) {
		// if yes deselect selectall
		$('#mailFilters #selectAll').find('input').prop('checked', true);
	}

	// deactivate actions menu
	if(selectedMessages.length > 0) {
		$('#mailActionsContainer').attr('data-active', 'true');
	} else {
		$('#mailActionsContainer').attr('data-active', 'false');
	}
	return;
}

function selectMessages(obj) {

	if($('#mailActions').attr('data-selected') == 'true') {
		hideActionsMenu();
	}

	var id = $(obj).find('#id').html();

	// ensure its not already added
	var add = true;
	for(var messageid in selectMessages) {
		if(selectedMessages[messageid] == id) {
			add = false;
			break;
		}
	}

	// add
	if(add) {
		selectedMessages.push(id);
	}
	// check
	$(obj).find('input').prop('checked', true);

	return;
}

function deselectMessages(obj) {

	if($('#mailActions').attr('data-selected') == 'true') {
		hideActionsMenu();
	}

	var id = $(obj).find('#id').html();

	// remove
	for(var i = 0; i < selectedMessages.length; i++) {
		if(selectedMessages[i] == id) {
			// see if selected all
			if(selectedMessages.length == parsedMessages.length) {
				// if yes deselect selectall
				$('#mailFilters #selectAll').find('input').prop('checked', false);
			}
			selectedMessages.splice(i, 1);
			i -= 1;
		}
	}

	// uncheck
	$(obj).find('input').prop('checked', false);
	return;
}