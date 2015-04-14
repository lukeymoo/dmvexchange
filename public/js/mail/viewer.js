/**
	Contains methods for message viewer
	Searching message, tagging words within message, escaping message etc..
*/

'use strict';

var Viewer = {
	id: '',
	subject: '',
	from: '',
	to: '',
	text: ''
};

// Find ID of message in view and parse its data into view
Viewer.show = function(id) {

	switch(Main.view) {
		case '[INBOX]':
			for(var i = 0; i < Main.parsedInbox.length; i++) {
				if(Main.parsedInbox[i].id == id) {

					// Grab message properties
					Viewer.id = id;
					Viewer.subject = Main.parsedInbox[i].subject;
					Viewer.from = Main.parsedInbox[i].from;
					Viewer.text = Main.parsedInbox[i].text;
					Viewer.to = '';

					if(Viewer.from == '[ DMV EXCHANGE ]') {
						$('#viewerControls #reply').hide();
					} else {
						$('#viewerControls #reply').show();
					}

					for(var t = 0; t < Main.parsedInbox[i].recipients.length; t++) {
						if((t + 1) == Main.parsedInbox[i].recipients.length) {
							if(Main.parsedInbox[i].recipients[t].username == state.USERNAME) {
								Viewer.to += 'You';
							} else {
								Viewer.to += Main.parsedInbox[i].recipients[t].username;
							}
						} else {
							if(Main.parsedInbox[i].recipients[t].username == state.USERNAME) {
								Viewer.to += 'You, ';
							} else {
								Viewer.to += Main.parsedInbox[i].recipients[t].username + ', ';
							}
						}
					}
					
					$('#viewerContent #subject').html(Viewer.subject);
					$('#viewerContent #from').html(Viewer.from);
					$('#viewerContent #to').html(Viewer.to);
					$('#viewerContent #text').html(Viewer.text);
				}
			}
			break;
		case '[TRASH]':
			for(var i = 0; i < Main.parsedTrash.length; i++) {
				if(Main.parsedTrash[i].id == id) {

					// Grab message properties
					var message = {
						id: id,
						subject: Main.parsedTrash[i].subject,
						from: Main.parsedTrash[i].from,
						text: Main.parsedTrash[i].text
					};

					if(message.from == '[ DMV EXCHANGE ]') {
						$('#viewerControls #reply').hide();
					} else {
						$('#viewerControls #reply').show();
					}

					for(var t = 0; t < Main.parsedTrash[i].recipients.length; t++) {
						if((t + 1) == Main.parsedTrash[i].recipients.length) {
							if(Main.parsedTrash[i].recipients[t].username == state.USERNAME) {
								Viewer.to += 'You';
							} else {
								Viewer.to += Main.parsedTrash[i].recipients[t].username;
							}
						} else {
							if(Main.parsedTrash[i].recipients[t].username == state.USERNAME) {
								Viewer.to += 'You, ';
							} else {
								Viewer.to += Main.parsedTrash[i].recipients[t].username + ', ';
							}
						}
					}
					
					$('#viewerContent #subject').html(message.subject);
					$('#viewerContent #from').html(message.from);
					$('#viewerContent #to').html(Viewer.to);
					$('#viewerContent #text').html(message.text);
				}
			}
			break;
	}

	$('#viewerContainer').show();
};

Viewer.hide = function() {

	// Remove message from selected message
	$('#messageContainer').find('.message').each(function() {
		
	});

	// Empty the viewers content
	$('#viewerContent #subject').html('');
	$('#viewerContent #from').html('');
	$('#viewerContent #to').html('');
	$('#viewerContent #text').html('');
	$('#viewerContainer').hide();
};

Viewer.delete = function() {
	// Find the message in view, hide it, splice it then remove it
	// Shift viewer to next message in collection
	switch(Main.view) {
		case '[INBOX]':

			var nextMessage = {};

			for(var i = 0; i < Main.parsedInbox.length; i++) {
				if(Main.parsedInbox[i].id == Viewer.id) {


					// Splice the message
					Main.parsedInbox.splice(i, 1);

					// Remove from message container
					$('#messageContainer').find('.message').each(function() {
						if($(this).find('#messageid').html() == Viewer.id) {
							$(this).remove();
						}
					});

					// Close viewer
					this.hide();

					// If theres another message after Show it
					// get next message ID ( i - 1 = top -> down in view || i + 1 = top <- down )
					if('undefined' != typeof Main.parsedInbox[i-1]) {
						this.show(Main.parsedInbox[i-1].id);
					}
				}
			}

			break;
		case '[TRASH]':
			break;
	}
};

$(function() {

	// Show message on click
	$(document).on('click', '.message', function(e) {
		if(e.target.id != 'select') {
			Viewer.show($(this).find('#messageid').html());
		}
	});

	// Hide message
	$('#viewerControls #back').on('click', function() {
		Viewer.hide();
	});

	// Delete message
	$('#viewerControls #trash').on('click', function() {
		Viewer.delete();
	});

});