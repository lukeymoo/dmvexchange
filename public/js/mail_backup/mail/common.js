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
	actionsMenu: ''
};

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
		Main.parse(res);
	});
};

Main.load = function(callback) {
	$.ajax({
		url: '/api/getmail'
	}).done(function(res) {
		callback(res);
	});
};

Main.parse = function(json) {

	if(json.returned == 0) {
		return;
	}

	// Parse JSON response into collections split by label ( inbox, trash etc.. )
	var DOM = '';
	for(var msgObj in json.message) {

		// Get label, is read, and other recipients
		var recipients = '';
		var inboxDOM = '';
		var trashDOM = '';

		for(var recip in json.message[msgObj].recipients) {
			
			if(!json.message[msgObj].recipients[recip].username != state.USERNAME) {
				// Add to recipients
				recipients += json.message[msgObj].recipients[recip].username;
			}

			if(json.message[msgObj].recipients[recip].username == state.USERNAME) {

				switch(json.message[msgObj].recipients[recip].label) {

					case '[INBOX]':
						// Check if it's already been parsed
						var added = false;

						for(var id in this.parsedInbox) {
							if(json.message[msgObj]._id == this.parsedInbox[id].id) {
								added = true;
							}
						}
						if(!added) {
							var classLabel = 'message';

							if(!json.message[msgObj].recipients[recip].read) {
								classLabel += ' unread';
							}

							// Parse message and add to inboxDOM
							inboxDOM += "<div class='" + classLabel + "'>" +
											"<div id='messageid'>" + json.message[msgObj]._id + "</div>" +
											"<div id='to'>" + recipients + "</div>" +
											"<div id='select'><input type='checkbox'></div>" +
											"<div id='subject'>" + json.message[msgObj].subject + "</div>" +
											"<div id='message'>" + json.message[msgObj].message + "</div>" +
											"<div id='from'>" + json.message[msgObj].from + "</div>" +
											"<div id='date'>" + this.toDate(json.message[msgObj].timestamp) + "</div>" +
										"</div>";
							if(this.view == '[INBOX]') {
								DOM += inboxDOM;
							}
							this.parsedInbox.push({id: json.message[msgObj]._id, html: inboxDOM});
						}
						break;
					case '[TRASH]':
						// Check if it's already been parsed
						var added = false;

						for(var id in this.parsedTrash) {
							if(json.message[msgObj]._id == this.parsedTrash[id].id) {
								added = true;
							}
						}
						if(!added) {
							var classLabel = 'message';

							if(!json.message[msgObj].recipients[recip].read) {
								classLabel += ' unread';
							}

							// Parse message and add to inboxDOM
							trashDOM += "<div class='" + classLabel + "'>" +
											"<div id='messageid'>" + json.message[msgObj]._id + "</div>" +
											"<div id='to'>" + recipients + "</div>" +
											"<div id='select'><input type='checkbox'></div>" +
											"<div id='subject'>" + json.message[msgObj].subject + "</div>" +
											"<div id='message'>" + json.message[msgObj].message + "</div>" +
											"<div id='from'>" + json.message[msgObj].from + "</div>" +
											"<div id='date'>" + this.toDate(json.message[msgObj].timestamp) + "</div>" +
										"</div>";
							if(this.view == '[TRASH]') {
								DOM += trashDOM;
							}
							this.parsedTrash.push({id: json.message[msgObj]._id, html: trashDOM});
						}
						break;
				}
			}
		}
	}

	if(this.loaded) {
		// Prepend DOM
		if(DOM.length > 0) {
			$('#mailFilters #selectAll').find('input').prop('checked', false);	
			$('#messageContainer').prepend(DOM);
		}
	} else {
		DOM = '';
		// Loop through all parsed and display
		switch(this.view) {
			case '[INBOX]':
				for(var msg in this.parsedInbox) {
					DOM += this.parsedInbox[msg].html;
				}

				// Prepend DOM
				if(DOM.length > 0) {
					$('#mailFilters #selectAll').find('input').prop('checked', false);	
					$('#messageContainer').prepend(DOM);
				}
				break;
			case '[TRASH]':
				for(var msg in this.parsedTrash) {
					DOM += this.parsedTrash[msg].html;
				}

				// Prepend DOM
				if(DOM.length > 0) {
					$('#mailFilters #selectAll').find('input').prop('checked', false);	
					$('#messageContainer').prepend(DOM);
				}
				break;
		}
		this.loaded = true;
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

Main.update = function() {
	// Update view
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

	// Update message container every 15 seconds
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
