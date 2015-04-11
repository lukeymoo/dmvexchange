'use strict';

var Main = {
	view: '[INBOX]',
	parsedMessages: [],
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
		console.log(json.message[msgObj]);

		var recipients = 'you';

		for(var user in json.message[msgObj].recipients) {
			console.log(json.message[msgObj].recipients[user]);
			if(json.message[msgObj].recipients[user].username != state.USERNAME) {
				recipients += ' ' + json.message[msgObj].recipients[user].username;
			}
		}

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
		
		this.parsedMessages.push(json.message[msgObj]._id);
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









$(function() {

	// Load messages for default view [INBOX]
	Main.get();

	// Toggle Compose Message
	$('#mailControls #compose').on('click', function() {
		// Hide message action menu
		Controls.hide();

		Messenger.toggleForm();
	});

});
