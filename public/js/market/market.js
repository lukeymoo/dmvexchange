'use strict';


var Market = {
	isOpen: false,
	postType: 'sale',
	viewType: 'sale',
	minimumPostID: 0,
	feed: []
};

/*
	----------------
	- Things to do -
	----------------
	1. Ajax product fetching
	2. Create product filters ( for views )
	3. Allow ability to create custom filters
*/

$(function() {

	// fetch timeline for users
	Market.get(function(res) {
		if(res.status == 'DX-OK') {
			// save arrays for types of feed
			Market.minimumPostID = res.message[0];
			Market.feed = res.message;

			// parse messages
			Market.display();
		} else {
			spawnMessage(res.message, false);
		}
	});

	// switch view filters
	$('#viewContainer .view').on('click', function() {
		// make em all non-selected
		$('#viewContainer .view').each(function() {
			$(this).attr('data-selected', 'false');
		});

		// set this one to selected
		$(this).attr('data-selected', 'true');

		// Filter products
	});

	// convert all ISODates in products to more compact format
	$('.post').find('.timestamp').each(function() {
		$(this).html(string_to_date($(this).html()));
	});

});























// Display all posts inside of the feed array
Market.display = function() {
	console.log(this.feed[0]);
	var collection = this.feed;
	for(var message in collection) {
		$('#centerFeed').prepend(post_from_json(collection[message]));
	}
};

// Retrieve feed for current view
Market.get = function(callback) {
	$.ajax({
		url: '/api/get_feed',
		data: {
			si: this.saleIndex,
			gi: this.generalIndex,
			minID: this.minimumPostID
		}
	}).done(function(res) {
		callback(res);
	});
};

function post_from_json(json) {
	var DOM = 
	"<div class='post'>";

	if(json.images.length) {
		DOM += 
		"<div class='thumbnail'>" +
			"<img src='" + json.images[0].large + "'>" +
		"</div>";
	}

	DOM +=
	"<span class='post_id'>" + json._id + "</span>" +
		"<span class='post_type'>" + json.post_type + "</span>" +
		"<span class='creatorID'>" +
			json.poster_id + 
		"</span>" +
		"<div class='post_general'>" +
			"<span class='creatorUsername'>" +
				json.poster_username + 
			"</span>" +
			"<span class='post_date'>" + 
				time_since(date_from_objectid(json._id)) +
			"</span>" +
			"<span class='description'>" +
				json.post_text + 
			"</span>" +
		"</div>" +
		"<div class='commentContainer'>" +
			"<input class='commentInput' type='text' placeholder='Leave a comment...'>" +
		"</div>" +
	"</div>";
	
	return DOM;
}

function time_since(date) {

	var time = Math.floor((new Date() - date) / 1000);

	var date_type = (time == 1) ? 'second' : 'seconds';

	// seconds -> minutes
	if(time > 60) {
		time = Math.floor(time / 60);
		date_type = (time == 1) ? 'minute' : 'minutes';

		// minutes -> hours
		if(time > 60) {
			time = Math.floor(time / 60);
			date_type = (time == 1) ? 'hour' : 'hours' ;

			// hours -> days
			if(time > 24) {
				time = Math.floor(time / 24);
				date_type = (time == 1) ? 'day' : 'days';

				// days -> weeks
				if(time > 7) {
					time = Math.floor(time / 7);
					date_type = (time == 1) ? 'week' : 'weeks';

					// after 2 weeks return the normal date format
					if(time > 2) {
						time = date;
						date_type = '';
					}
				}
			}
		}
	}



	return (date_type == '') ? time : 'Posted ' + time + ' ' + date_type + ' ago';
}

function date_from_objectid(object_id) {
	return new Date(parseInt(object_id.substring(0, 8), 16) * 1000);
}

function string_to_date(ISODate) {
	var dateObj = new Date(ISODate);
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

	var month = monthArr[dateObj.getMonth()];
	var day = dateObj.getDate();
	var hour = dateObj.getHours();
	if(hour > 12) {
		period = 'pm';
		hour -= 12;
	}
	var minute = dateObj.getMinutes();
	if(minute < 10) {
		minute = '0' + minute;
	}

	time = month + '. ' + day + '  ' + hour + ':' + minute + ' ' + period;

	return time;
}























