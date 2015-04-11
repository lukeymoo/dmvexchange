'use strict';

var Main = {
	view: '[INBOX]',
	parsedInbox: [],
	parsedTrash: [],
	selectedMessages: []
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
	var DOM = '';

	if(json.returned == 0) {
		return;
	}

	for(var msgObj in json.message) {

		var recipients = 'you';

		// Capture the other recipients if any
		var location = '';
		for(var user in json.message[msgObj].recipients) {
			// Capture the label for user -- Where is message ( Inbox ? Trash ? )
			if(json.message[msgObj].recipients[user].username == state.USERNAME) {
				location = json.message[msgObj].recipients[user].label;
			}

			if(json.message[msgObj].recipients[user].username != state.USERNAME) {
				recipients += ' ' + json.message[msgObj].recipients[user].username;
			}
		}

		// Determine which view to parse
		if(this.view == '[INBOX]' && location == '[INBOX]') {
			// Parse DOM
			DOM += "<div class='message'>" +
						"<div id='messageid'>" + json.message[msgObj]._id + "</div>" +
						"<div id='to'>" + recipients + "</div>" +
						"<div id='select'><input type='checkbox'></div>" +
						"<div id='subject'>" + json.message[msgObj].subject + "</div>" +
						"<div id='message'>" + json.message[msgObj].message + "</div>" +
						"<div id='from'>" + json.message[msgObj].from + "</div>" +
						"<div id='date'>" + this.toDate(json.message[msgObj].timestamp) + "</div>" +
					"</div>";
			this.parsedInbox.push(json.message[msgObj]._id);

		} else if(this.view == '[TRASH]' && location == '[TRASH]') {
			// Parse DOM
			DOM += "<div class='message'>" +
						"<div id='messageid'>" + json.message[msgObj]._id + "</div>" +
						"<div id='to'>" + recipients + "</div>" +
						"<div id='select'><input type='checkbox'></div>" +
						"<div id='subject'>" + json.message[msgObj].subject + "</div>" +
						"<div id='message'>" + json.message[msgObj].message + "</div>" +
						"<div id='from'>" + json.message[msgObj].from + "</div>" +
						"<div id='date'>" + this.toDate(json.message[msgObj].timestamp) + "</div>" +
					"</div>";
			this.parsedTrash.push(json.message[msgObj]._id);
		}
	}
	
	// Prepend DOM
	if(DOM.length > 0) {
		$('#mailFilters #selectAll').find('input').prop('checked', false);	
		$('#messageContainer').prepend(DOM);
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
		this.hideActionsMenu();
	}

	// Determine the current view
	switch(this.view) {
		case '[INBOX]':
			console.log('inbox view looking for :: ' + id);
			// remove
			for(var i = 0; i < this.selectedMessages.length; i++) {
				console.log('ID :: ' + id);
				if(this.selectedMessages[i] == id) {
					// see if selected all
					if(this.selectedMessages.length == this.parsedInbox.length) {
						// if yes deselect selectall
						$('#mailFilters #selectAll').find('input').prop('checked', false);
					}
					this.selectedMessages.splice(i, 1);
					console.log('R: ' + this.selectedMessages.length + ' :: ' + this.parsedInbox.length);

					// deactivate actions menu
					if(this.selectedMessages.length > 0) {
						$('#mailActionsContainer').attr('data-active', 'true');
					} else {
						$('#mailActionsContainer').attr('data-active', 'false');
					}

					return;
				}
			}

			// add
			this.selectedMessages.push(id);
			console.log('A:' + this.selectedMessages.length + ' :: ' + this.parsedInbox.length);
			// see if selected all
			if(this.selectedMessages.length == this.parsedInbox.length) {
				// if yes deselect selectall
				$('#mailFilters #selectAll').find('input').prop('checked', true);
			}

			// deactivate actions menu
			if(this.selectedMessages.length > 0) {
				$('#mailActionsContainer').attr('data-active', 'true');
			} else {
				$('#mailActionsContainer').attr('data-active', 'false');
			}
			return;
			break;

		case '[TRASH]':
			break;
	}
};

Main.selectMessage = function(obj) {

	if($('#mailActions').attr('data-selected') == 'true') {
		this.hideActionsMenu();
	}

	var id = $(obj).find('#id').html();

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

	// check
	$(obj).find('input').prop('checked', true);

	return;
};

Main.deselectMessage = function(obj) {
	if($('#mailActions').attr('data-selected') == 'true') {
		this.hideActionsMenu();
	}

	var id = $(obj).find('#id').html();

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

	// uncheck
	$(obj).find('input').prop('checked', false);
	return;
};

Main.hideActionsMenu = function() {
	if($('#mailActions').hasClass('showActionsMenu')) {
		$('#mailActions').removeClass('showActionsMenu');

		if(!$('#mailActions').hasClass('showActionsMenu-reverse')) {
			$('#mailActions').addClass('showActionsMenu-reverse');
		}
	}
	$('#mailActions').attr('data-selected', 'false');
	return;
};





$(function() {

	// Load messages for default view [INBOX]
	Main.get();

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
