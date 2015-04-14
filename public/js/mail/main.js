/**
	Contains methods that pretty much handle any
	i/o from server and parsing of messages for
	client side api	
*/


'use strict';

var Main = {
	loaded: false,
	view: '[INBOX]',
	parsedInbox: [],
	parsedTrash: [],
	inboxDOM: '',
	trashDOM: '',
	selectedMessages: [],
	actionsMenu: '',
	messages: []
};

// Custom sort function for message timestamps
function cmpT(a, b) {
	if(a.timestamp < b.timestamp) {
		return -1;
	} else if(a.timestamp > b.timestamp) {
		return 1;
	}
	return 0;
}

// Calls get and generates actions menu
Main.init = function() {
	this.get();
	this.createActionMenu();
};

Main.createActionMenu = function() {
	var DOM = '';
	// Remove actions
	this.actionsMenu = '';
	$('#mailActions').empty();

	switch(this.view) {
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

	this.actionsMenu = DOM;
	// Append the dom
	$('#mailActions').append(this.actionsMenu);
	return;
};

Main.get = function() {
	// Ajax -> Parse -> Prepend DOM
	this.load(function(res){
		Main.save(res);
		Main.display();
	});
};

Main.load = function(callback) {
	$.ajax({
		url: '/api/getmail'
	}).done(function(res) {
		callback(res);
	});
};

Main.display = function() {

	// Iterate through collection and display in message container
	switch(this.view) {
		case '[INBOX]':

			// Sort by timestamp
			this.parsedInbox.sort(cmpT);

			// Iterate through each message
			for(var i = 0; i < this.parsedInbox.length; i++) {

				// Iterate through messageContainer, determine if it's already been displayed
				var added = false;
				$('#messageContainer').find('.message').each(function() {
					if($(this).find('#messageid').html() == Main.parsedInbox[i].id) {
						added = true;
					}
				});

				if(added) {
					continue;
				}

				var newElem =

				"<div class='" + this.parsedInbox[i].classes + "'>" + // Message wrapper
					"<div id='messageid'>" + this.parsedInbox[i].id + "</div>" + // Message id
					"<div id='select'><input type='checkbox'></div>" + // Select button
					"<div id='subject'>" + this.parsedInbox[i].subject + "</div>" + // Subject
					"<div id='from'>" + this.parsedInbox[i].from + "</div>" + // From
					"<div id='recipients'>" + JSON.stringify(this.parsedInbox[i].recipients) + "</div>" +
					"<div id='message'>" + this.parsedInbox[i].text + "</div>" + // Message text
					"<div id='date'>" + this.toDate(this.parsedInbox[i].timestamp) + "</div>" + // Timestamp
				"</div>";

				// Prepend message container ( display message )
				$('#messageContainer').prepend(newElem);

			}

			break;
		case '[TRASH]':

			// Sort by timestamp
			this.parsedTrash.sort(cmpT);

			// Iterate through each message
			for(var i = 0; i < this.parsedTrash.length; i++) {

				// Iterate through messageContainer, determine if it's already been displayed
				var added = false;
				$('#messageContainer').find('.message').each(function() {
					if($(this).find('#messageid').html() == Main.parsedTrash[i].id) {
						added = true;
					}
				});

				if(added) {
					continue;
				}

				var newElem =

				"<div class='" + this.parsedTrash[i].classes + "'>" + // Message wrapper
					"<div id='messageid'>" + this.parsedTrash[i].id + "</div>" + // Message id
					"<div id='select'><input type='checkbox'></div>" + // Select button
					"<div id='subject'>" + this.parsedTrash[i].subject + "</div>" + // Subject
					"<div id='from'>" + this.parsedTrash[i].from + "</div>" + // From
					"<div id='recipients'>" + JSON.stringify(this.parsedTrash[i].recipients) + "</div>" +
					"<div id='message'>" + this.parsedTrash[i].text + "</div>" + // Message text
					"<div id='date' value='" + this.parsedTrash[i].timestamp + "'>" + this.toDate(this.parsedTrash[i].timestamp) + "</div>" + // Timestamp
				"</div>";

				// Prepend message container ( display message )
				$('#messageContainer').prepend(newElem);

			}

			break;
	}
};

// Move message to new collection
Main.move = function(mid, loc) {
	switch(loc) {
		case '[INBOX]':

			// Ensure message isn't already in that location ( In this case the [INBOX] )
			var valid = true;

			for(var i = 0; i < this.parsedInbox.length; i++) {
				if(this.parsedInbox[i].id == mid) {
					valid = false;
				}
			}

			if(!valid) {
				return;
			}

			// Find message id in trash collection and move it
			var message = {};

			for(var i = 0; i < this.parsedTrash.length; i++) {
				if(this.parsedTrash[i].id == mid) {
					
					// copy the message
					message = this.parsedTrash[i];

					// remove from current collection ( trash )
					this.parsedTrash.splice(i, 1);

					// remove from message container
					$('#messageContainer').find('.message').each(function() {
						if($(this).find('#messageid').html() == mid) {
							$(this).remove();
						}
					});

					// Push message into new collection ( inbox )
					this.parsedInbox.push(message);

					break;
				}
			}


			break;
		case '[TRASH]':

			// Ensure message isn't already in that location ( In this case the [INBOX] )
			var valid = true;

			for(var i = 0; i < this.parsedTrash.length; i++) {
				if(this.parsedTrash[i].id == mid) {
					valid = false;
				}
			}

			if(!valid) {
				return;
			}

			// Find message id in inbox collection and move it
			var message = {};

			for(var i = 0; i < this.parsedInbox.length; i++) {
				if(this.parsedInbox[i].id == mid) {
					
					console.log('moving function');
					
					// copy the message
					message = this.parsedInbox[i];

					// remove from current collection ( inbox )
					this.parsedInbox.splice(i, 1);

					// remove from message container
					$('#messageContainer').find('.message').each(function() {
						if($(this).find('#messageid').html() == mid) {
							$(this).remove();
						}
					});

					// Push message into new collection ( trash )
					this.parsedTrash.push(message);

					break;
				}
			}

			break;
		default:
			break;
	}
};

// Resaves the message with updated properties from DOM element
Main.resave = function(obj) {

	var updatedMessage = {
		classes: $(obj).attr('class'),
		id: $(obj).find('#messageid').html(),
		subject: $(obj).find('#subject').html(),
		text: $(obj).find('#message').html(),
		from: $(obj).find('#from').html(),
		recipients: JSON.parse($(obj).find('#recipients').html()),
		timestamp: $(obj).find('#date').attr('value')
	};

	// Find message in collection, splice it, then push new message to replace it
	switch(this.view) {
		case '[INBOX]':
			for(var i = 0; i < this.parsedInbox.length; i++) {
				if(this.parsedInbox[i].id == $(obj).find('#messageid').html()) {
					
					this.parsedInbox[i].classes = updatedMessage.classes;
				}
			}
			break;
		case '[TRASH]':
			for(var i = 0; i < this.parsedTrash.length; i++) {
				if(this.parsedTrash[i].id == $(obj).find('#messageid').html()) {
					
					this.parsedTrash[i].classes = updatedMessage.classes;
				
				}
			}
			break;
	}

};

// Separate and save messages in collection as object
Main.save = function(json) {

	// Did we receive any messages
	if(json.returned == 0) {
		return;
	}

	var Messages = json.message;

	for(var msg in Messages) {

		// Determine if message has already been added to collection
		var added = false;

		// Inbox
		for(var i = 0; i < this.parsedInbox.length; i++) {
			if(this.parsedInbox[i].id == Messages[msg]._id) {
				added = true;
			}
		}

		// Trash
		for(var i = 0; i < this.parsedTrash.length; i++) {
			if(this.parsedTrash[i].id == Messages[msg]._id) {
				added = true;
			}
		}

		if(added) {
			continue;
		}

		// Parse top level properties
		var parsedMessage = {
			classes: 'message',
			id: Messages[msg]._id,
			subject: Messages[msg].subject,
			text: Messages[msg].message,
			from: Messages[msg].from,
			recipients: [],
			timestamp: Messages[msg].timestamp
		};

		// Parse recipients
		var location = '';
		for(var r in Messages[msg].recipients) {

			// Save class properties of message for current user
			if(Messages[msg].recipients[r].username == state.USERNAME) {

				// Where is message ( inbox, trash ? )
				location =  Messages[msg].recipients[r].label;

				// Is the message read or unread ?
				if(!Messages[msg].recipients[r].read) {
					parsedMessage.classes += ' unread';
				}

				// What is the message priority
				// -- Underconstruction --

			}

			parsedMessage.recipients.push({
				label: Messages[msg].recipients[r].label,
				username: Messages[msg].recipients[r].username,
				read: Messages[msg].recipients[r].read
			});
		}

		// Based on label specified for current user, push to inbox || trash collection
		switch(location) {
			case '[INBOX]':
				Main.parsedInbox.push(parsedMessage);
				break;
			case '[TRASH]':
				Main.parsedTrash.push(parsedMessage);
				break;
		}
	}
};

Main.show = function() {
	var DOM = '';
	// Show DOM
	switch(this.view) {
		case '[INBOX]':
			for(var msg in this.parsedInbox) {
				DOM += this.parsedInbox[msg].html;
			}
			$('#messageContainer').html(DOM);
			break;
		case '[TRASH]':
			for(var msg in this.parsedTrash) {
				DOM += this.parsedTrash[msg].html;
			}
			$('#messageContainer').html(DOM);
			break;
	}
};

Main.toDate = function(messageID) {
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
};

Main.toggleMessage = function(id) {
	if($('#mailActions').attr('data-selected') == 'true') {
		Controls.hide();
	}

	// Determine the current view
	switch(this.view) {
		case '[INBOX]':
			// remove
			for(var i = 0; i < this.selectedMessages.length; i++) {
				if(this.selectedMessages[i] == id) {
					// see if selected all
					if(this.selectedMessages.length == this.parsedInbox.length) {
						// if yes deselect selectall
						$('#mailFilters #selectAll').find('input').prop('checked', false);
					}
					this.selectedMessages.splice(i, 1);

					// enable/disable actions menu
					if(this.selectedMessages.length > 0) {
						Controls.enable();
					} else {
						Controls.disable();
					}
					return;
				}
			}

			// add
			this.selectedMessages.push(id);
			// see if selected all
			if(this.selectedMessages.length == this.parsedInbox.length) {
				// if yes deselect selectall
				$('#mailFilters #selectAll').find('input').prop('checked', true);
			}

			// deactivate actions menu
			if(this.selectedMessages.length > 0) {
				Controls.enable();
			} else {
				Controls.disable();
			}
			return;
			break;

		case '[TRASH]':
			// remove
			for(var i = 0; i < this.selectedMessages.length; i++) {
				if(this.selectedMessages[i] == id) {
					// see if selected all
					if(this.selectedMessages.length == this.parsedTrash.length) {
						// if yes deselect selectall
						$('#mailFilters #selectAll').find('input').prop('checked', false);
					}
					this.selectedMessages.splice(i, 1);

					// enable/disable actions menu
					if(this.selectedMessages.length > 0) {
						Controls.enable();
					} else {
						Controls.disable();
					}
					return;
				}
			}

			// add
			this.selectedMessages.push(id);
			// see if selected all
			if(this.selectedMessages.length == this.parsedTrash.length) {
				// if yes deselect selectall
				$('#mailFilters #selectAll').find('input').prop('checked', true);
			}

			// deactivate actions menu
			if(this.selectedMessages.length > 0) {
				Controls.enable();
			} else {
				Controls.disable();
			}
			return;
			break;
	}
};

Main.selectMessage = function(obj) {

	if($('#mailActions').attr('data-selected') == 'true') {
		Controls.hide();
	}

	var id = $(obj).find('#messageid').html();

	// ensure its not already added
	var add = true;
	for(var messageid in this.selectedMessages) {
		if(this.selectedMessages[messageid] == id) {
			add = false;
			break;
		}
	}

	// add
	if(add) {
		this.selectedMessages.push(id);
	}

	// enable/disable contols
	if(this.selectedMessages.length > 0) {
		Controls.enable();
	} else {
		Controls.disable();
	}

	// add check
	$(obj).find('input').prop('checked', true);

	return;
};

Main.deselectMessage = function(obj) {
	if($('#mailActions').attr('data-selected') == 'true') {
		Controls.hide();
	}

	var id = $(obj).find('#messageid').html();

	// Determine the view
	switch(this.view) {
		case '[INBOX]':
			// remove
			for(var i = 0; i < this.selectedMessages.length; i++) {
				if(this.selectedMessages[i] == id) {
					// see if selected all
					if(this.selectedMessages.length == this.parsedInbox.length) {
						// if yes deselect selectall
						$('#mailFilters #selectAll').find('input').prop('checked', false);
					}
					this.selectedMessages.splice(i, 1);
					i -= 1;
				}
			}
			break;
		case '[TRASH]':
			// remove
			for(var i = 0; i < this.selectedMessages.length; i++) {
				if(this.selectedMessages[i] == id) {
					// see if selected all
					if(this.selectedMessages.length == this.parsedTrash.length) {
						// if yes deselect selectall
						$('#mailFilters #selectAll').find('input').prop('checked', false);
					}
					this.selectedMessages.splice(i, 1);
					i -= 1;
				}
			}
			break;
	}

	// deactivate actions menu
	if(this.selectedMessages.length > 0) {
		Controls.enable();
	} else {
		Controls.disable();
	}


	// uncheck
	$(obj).find('input').prop('checked', false);
	return;
};





$(function() {

	// Load messages for default view [INBOX]
	Main.init();

	// Update message container every 10 seconds
	setInterval(function() {
		Main.init();
	}, 10000);

	// Toggle Compose Message
	$('#mailControls #compose').on('click', function() {
		// Hide message action menu
		Controls.hide();

		Messenger.toggleForm();
	});

	// Bind selectAll button
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
					Main.deselectMessage($(this));

					// deactivate selectedmessages ( change color )
					$('#mailActionsContainer').attr('data-active', 'false');
				}
			});
		} else {
			// select all
			$('#messageContainer').find('.message').each(function() {
				if(!$(this).find('input').prop('checked')) {
					Main.selectMessage($(this));
				}
				// activate selectedmessages ( change color )
				$('#mailActionsContainer').attr('data-active', 'true');
			});
		}

	});

	// Easier select button
	$(document).on('click', '.message #select', function(e) {

		if(e.target.nodeName != 'INPUT') {
			var propTo = $(this).find('input').prop('checked');
			$(this).find('input').prop('checked', !propTo);
		}

		// toggle message
		Main.toggleMessage($(this).parent('.message').find('#messageid').html());

	});

});
