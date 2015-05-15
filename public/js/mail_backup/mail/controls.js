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
	Main.display();
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

				// Grab each message in container and Main.resave it
				$('#messageContainer').find('.message').each(function() {
					Main.resave($(this));
				});
			} else {
				// Spawn error
				createAlert(res.message);
			}
		});
	});

	// Mark message unread
	$(document).on('click', '#markUnread', function() {
		Controls.markUnread(function(res) {
			if(res.status == 'DX-OK') {
				// Add unread class
				Controls.addClass('unread');

				// Grab each message in container and Main.resave it
				$('#messageContainer').find('.message').each(function() {
					Main.resave($(this));
				});

			} else {
				// Spawn error
				createAlert(res.message);
			}
		});
	});

	// Move to inbox
	$(document).on('click', '#markInbox', function() {

		// Hide message temporarily
		Controls.hideSelected();
		
		Controls.markInbox(function(res) {
			if(res.status == 'DX-OK') {
				
				// Iterate through selected messages and use Main.move foreach
				for(var i = 0; i < Main.selectedMessages.length; i++) {
					Main.move(Main.selectedMessages[i], '[INBOX]');
				}

				// Clear selected messages
				Main.selectedMessages = [];

				// Redraw container
				Main.display();

				// All messages that were selected have been moved so deselect checkall
				$('#mailFilters #selectAll').find('input').prop('checked', false);

				// If parsedTrash is empty, disable action menu
				Controls.disable();
			} else {
				Controls.showSelected();
				createAlert(res.message);
			}
		});
	});

	// Move message to trash
	$(document).on('click', '#markTrash', function() {

		// Hide message temporarily
		Controls.hideSelected();

		Controls.markTrash(function(res) {
			if(res.status == 'DX-OK') {
				
				// Iterate through selected messages and Main.move foreach
				for(var i = 0; i < Main.selectedMessages.length; i++) {
					Main.move(Main.selectedMessages[i], '[TRASH]');
				}

				// Clear selected messages
				Main.selectedMessages = [];

				// Redraw container
				Main.display();

				// All messages that were selected have been moved so deselect checkall
				$('#mailFilters #selectAll').find('input').prop('checked', false);

				Controls.disable();

				// If nextID is set
				if(Viewer.nextID != '' && Viewer.nextID.length == 24) {
					Viewer.show(Viewer.nextID);
					Viewer.nextID = '';
				} else {
					Viewer.hide();
				}
			} else {
				Controls.showSelected();
				createAlert(res.message);
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
						if(Main.selectedMessages[id] == Main.parsedTrash[i].id) {
							// Remove it
							Main.parsedTrash.splice(i, 1);
							i -= 1;
						}
					}
				}

				// Clear selected messages
				Main.selectedMessages = [];

				// Redraw container
				Main.display();

				// All messages that were selected have been moved so deselect checkall
				$('#mailFilters #selectAll').find('input').prop('checked', false);

				Controls.disable();

				// If nextID is set
				if(Viewer.nextID != '' && Viewer.nextID.length == 24) {
					Viewer.show(Viewer.nextID);
					Viewer.nextID = '';
				} else {
					Viewer.hide();
				}
			} else {
				Controls.showSelected();
				createAlert(res.message);
			}
		});
	});
});