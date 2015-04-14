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

	$('#messageContainer').find('.message').each(function() {
		if($(this).find('#messageid').html() == id) {
			
			// If its the current message in view, make sure its selected
			if(!$(this).find('input[type=checkbox]').is(':checked')) {
				// select message
				$(this).find('input[type=checkbox]').click();
			}

		} else {

			// If its the current message in view, make sure its selected
			if($(this).find('input[type=checkbox]').is(':checked')) {
				// Deselect message
				$(this).find('input[type=checkbox]').click();
			}
		}
	});

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

					$('#viewerControls #trash').html('Trash');

					if(Viewer.from == '[ DMV EXCHANGE ]') {
						$('#viewerControls #reply').css('display', 'none');
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
					Viewer.id = id;
					Viewer.subject = Main.parsedTrash[i].subject;
					Viewer.from = Main.parsedTrash[i].from;
					Viewer.text = Main.parsedTrash[i].text;
					Viewer.to = '';

					$('#viewerControls #trash').html('Delete forever');

					if(Viewer.from == '[ DMV EXCHANGE ]') {
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
					
					$('#viewerContent #subject').html(Viewer.subject);
					$('#viewerContent #from').html(Viewer.from);
					$('#viewerContent #to').html(Viewer.to);
					$('#viewerContent #text').html(Viewer.text);
				}
			}
			break;
	}

	$('#viewerContainer').show();
};

Viewer.hide = function() {

	Viewer.nextID = '';

	// deselect all
	$('#messageContainer').find('.message').each(function() {
		if($(this).find('input').is(':checked')) {
			$(this).find('input').click();
		}
	});

	// Empty the viewers content
	$('#viewerContent #subject').html('');
	$('#viewerContent #from').html('');
	$('#viewerContent #to').html('');
	$('#viewerContent #text').html('');
	$('#viewerContainer').hide();
};

Viewer.delete = function() {
	switch(Main.view) {
		case '[INBOX]':

			Viewer.nextID = '';

			for(var i = 0; i < Main.parsedInbox.length; i++) {
				if(Main.parsedInbox[i].id == Viewer.id) {
					if('undefined' != typeof Main.parsedInbox[i-1]) {
						Viewer.nextID = Main.parsedInbox[i-1].id;
					}
				}
			}

			$(document).find('#mailActionsButton').click();
			$(document).find('#markTrash').click();
			break;
		case '[TRASH]':

				Viewer.nextID = '';

				for(var i = 0; i < Main.parsedTrash.length; i++) {
					if(Main.parsedTrash[i].id == Viewer.id) {
						if('undefined' != typeof Main.parsedTrash[i-1]) {
							Viewer.nextID = Main.parsedTrash[i-1].id;
						}
					}
				}

				$(document).find('#mailActionsButton').click();
				$(document).find('#markGone').click();
			break;
	}
};

$(function() {

	// Show message on click
	$(document).on('click', '.message', function(e) {
		if(e.target.id != 'select' && e.target.nodeName != 'INPUT') {
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