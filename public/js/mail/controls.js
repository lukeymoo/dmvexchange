/**
	Contains methods to switch views and interact with message action
	menu
*/

'use strict';

var Controls = {
	isOpen: false
};

Controls.toggle = function() {
	if(this.isOpen) {
		this.hide();
	} else {
		this.show();
	}
};

Controls.show = function() {
	this.isOpen = true;
	if($('#mailActions').hasClass('showActionsMenu-reverse')) {
		$('#mailActions').removeClass('showActionsMenu-reverse');
	}

	if(!$('#mailActions').hasClass('showActionsMenu')) {
		$('#mailActions').addClass('showActionsMenu');
	}
};

Controls.hide = function() {
	this.isOpen = false;
	if($('#mailActions').hasClass('showActionsMenu')) {
		$('#mailActions').removeClass('showActionsMenu');

		if(!$('#mailActions').hasClass('showActionsMenu-reverse')) {
			$('#mailActions').addClass('showActionsMenu-reverse');
		}
	}
	return;
};

// Add classes to all selected messages
Controls.addClass = function(string) {
	$('#messageContainer').find('.message').each(function() {
		for(var id in Main.selectedMessages) {
			if(Main.selectedMessages[id] == $(this).find('#messageid').html()) {
				// Add class if not already present
				if(!$(this).hasClass(string)) {
					$(this).addClass(string);
				}
			}
		}
	});
};

// Remove classes from all selected messages
Controls.removeClass = function(string) {
	$('#messageContainer').find('.message').each(function() {
		for(var id in Main.selectedMessages) {
			if(Main.selectedMessages[id] == $(this).find('#messageid').html()) {
				// Add class if not already present
				if($(this).hasClass(string)) {
					$(this).removeClass(string);
				}
			}
		}
	});
};

Controls.showSelected = function() {
	$('#messageContainer').find('.message').each(function() {
		for(var id in Main.selectedMessages) {
			// Search container with selectedMessages
			if(Main.selectedMessages[id] == $(this).find('#messageid').html()) {
				// Hide message
				$(this).css('display', 'block');
			}
		}
	});
};

Controls.hideSelected = function() {
	$('#messageContainer').find('.message').each(function() {
		for(var id in Main.selectedMessages) {
			// Search container with selectedMessages
			if(Main.selectedMessages[id] == $(this).find('#messageid').html()) {
				// Hide message
				$(this).css('display', 'none');
			}
		}
	});
};

Controls.enable = function() {
	$('#mailActionsContainer').attr('data-active', 'true');
};

Controls.disable = function() {
	$('#mailActionsContainer').attr('data-active', 'false');
};

Controls.markRead = function(callback) {
	$.ajax({
		url: '/api/mail',
		data: {
			request: 'UPDATE',
			to: 'READ',
			messages: Main.selectedMessages
		}
	}).done(function(res) {
		callback(res);
	});
};

Controls.markUnread = function(callback) {
	$.ajax({
		url: '/api/mail',
		data: {
			request: 'UPDATE',
			to: 'UNREAD',
			messages: Main.selectedMessages
		}
	}).done(function(res) {
		callback(res);
	});
};

Controls.markInbox = function(callback) {
	$.ajax({
		url: '/api/mail',
		data: {
			request: 'UPDATE',
			to: 'INBOX',
			messages: Main.selectedMessages
		}
	}).done(function(res) {
		callback(res);
	});
};

Controls.markTrash = function(callback) {
	console.log(Main.selectedMessages);
	$.ajax({
		url: '/api/mail',
		data: {
			request: 'UPDATE',
			to: 'TRASH',
			messages: Main.selectedMessages
		}
	}).done(function(res) {
		callback(res);
	});
};

Controls.askMarkGone = function() {
	// Ask user if sure
	$('#backgroundBlur').fadeIn();
	$('#markGoneContainer').fadeIn();
};

Controls.closeMarkGone = function() {
	// Ask user if sure
	$('#backgroundBlur').fadeOut();
	$('#markGoneContainer').fadeOut();
};

Controls.markGone = function(callback) {
	$.ajax({
		url: '/api/mail',
		data: {
			request: 'DELETE',
			messages: Main.selectedMessages
		}
	}).done(function(res) {
		callback(res);
	});
};

Controls.clearView = function() {
	$('#messageContainer').empty();
};

Controls.switchView = function(string) {
	// Hide the actions menu
	this.hide();

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
	Controls.clearView();

	// Clear selected messages
	Main.selectedMessages = [];

	// store new view
	Main.view = string;

	// generate new message actions
	Main.createActionMenu();

	// show parsed messages for particular view
	Main.show();
	return;
};












$(function() {

	// Allow switching of views
	$('#mailControls #inbox').on('click', function() {
		if(Main.view != '[INBOX]') {
			Controls.switchView('[INBOX]');
		}
	});

	$('#mailControls #trash').on('click', function() {
		if(Main.view != '[TRASH]') {
			Controls.switchView('[TRASH]');
		}
	});

	// Show actions menu
	$('#mailActionsContainer #mailActionsButton').on('click', function() {
		if(Main.selectedMessages.length > 0) {
			Messenger.hideForm();
			Controls.toggle();
		}
	});

	// Mark message read
	$(document).on('click', '#markRead', function() {
		Controls.markRead(function(res) {
			if(res.status == 'DX-OK') {
				// Remove unread class
				Controls.removeClass('unread');

				// Save new parsedInbox DOM
				var inboxDOM = [];

				$('#messageContainer').find('.message').each(function() {
					// Grab each message and save to parsedInbox again
					var messageID = $(this).find('#messageid').html();
					var messageHTML = $(this).wrap('<p>').parent().html();
					inboxDOM.push({id: messageID, html: messageHTML});
				});

				Main.parsedInbox = inboxDOM;
			} else {
				// Spawn error
				spawnMessage(res.message, false);
			}
		});
	});

	// Mark message unread
	$(document).on('click', '#markUnread', function() {
		Controls.markUnread(function(res) {
			if(res.status == 'DX-OK') {
				// Add unread class
				Controls.addClass('unread');

				// Save new parsedInbox DOM
				var inboxDOM = [];
				$('#messageContainer').find('.message').each(function() {
					// Grab each message id and HTML and push to array
					var messageID = $(this).find('#messageid').html();
					var messageHTML = $(this).wrap('<p>').parent().html();
					$(this).unwrap();
					inboxDOM.push({id: messageID, html: messageHTML});
				});
				// Save new parsed inbox
				Main.parsedInbox = inboxDOM;
			} else {
				// Spawn error
				spawnMessage(res.message, false);
			}
		});
	});

	// Move to inbox
	$(document).on('click', '#markInbox', function() {
		// Hide message temporarily
		Controls.hideSelected();
		Controls.markInbox(function(res) {
			if(res.status == 'DX-OK') {
				// Move selected messages from parsedInbox to parsedTrash
				for(var id in Main.selectedMessages) {
					for(var i = 0; i < Main.parsedTrash.length; i++) {
						if(Main.parsedTrash[i].id == Main.selectedMessages[id]) {
							// Move to trash
							Main.parsedInbox.push({id: Main.parsedTrash[i].id, html: Main.parsedTrash[i].html});
							Main.parsedTrash.splice(i, 1);
							i -= 1;
						}
					}
				}

				// All messages that were selected have been moved so deselect checkall
				$('#mailFilters #selectAll').find('input').prop('checked', false);

				// If parsedTrash is empty, disable action menu
				if(Main.parsedTrash.length == 0) {
					Controls.disable();
				}
			} else {
				Controls.showSelected();
				spawnMessage(res.message, false);
			}
		});
	});

	// Move message to trash
	$(document).on('click', '#markTrash', function() {
		// Hide message temporarily
		Controls.hideSelected();
		Controls.markTrash(function(res) {
			if(res.status == 'DX-OK') {
				// Move selected messages from parsedInbox to parsedTrash
				for(var id in Main.selectedMessages) {
					for(var i = 0; i < Main.parsedInbox.length; i++) {
						if(Main.parsedInbox[i].id == Main.selectedMessages[id]) {
							// Move to trash
							Main.parsedTrash.push({id: Main.parsedInbox[i].id, html: Main.parsedInbox[i].html});
							Main.parsedInbox.splice(i, 1);
							i -= 1;
						}
					}
				}

				// All messages that were selected have been moved so deselect checkall
				$('#mailFilters #selectAll').find('input').prop('checked', false);

				// If parsedTrash is empty, disable action menu
				if(Main.parsedInbox.length == 0) {
					Controls.disable();
				}
			} else {
				Controls.showSelected();
				spawnMessage(res.message, false);
			}
		});
	});

	// Show confirmation to delete forever
	$(document).on('click', '#markGone', function() {
		Controls.askMarkGone();
	});

	// Delete forever
	$(document).on('click', '#cancelMarkGone', function() {
		Controls.closeMarkGone();
	});

	$(document).on('click', '#confirmMarkGone', function() {
		// Hide messages temp
		Controls.hideSelected();

		// Close markgone
		Controls.closeMarkGone();

		Controls.markGone(function(res) {
			if(res.status == 'DX-OK') {
				// Remove from DOM & collection
				for(var id in Main.selectedMessages) {
					// Remove from container
					$('#messageContainer').find('.message').each(function() {
						if($(this).find('#messageid').html() == Main.selectedMessages[id]) {
							$(this).remove();
						}
					});
					for(var i = 0; i < Main.parsedTrash.length; i++) {
						if(Main.parsedTrash[i].id == Main.selectedMessages[id]) {
							// Remove it
							Main.parsedTrash.splice(i, 1);
							i -= 1;
						}
					}
				}

				// All messages that were selected have been moved so deselect checkall
				$('#mailFilters #selectAll').find('input').prop('checked', false);

				// If parsedTrash is empty, disable action menu
				if(Main.parsedTrash.length == 0) {
					Controls.disable();
				}
			} else {
				Controls.showSelected();
				spawnMessage(res.message, false);
			}
		});
	});
});