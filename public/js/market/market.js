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

			// Parse array into storage
			Market.parse_messages(res.message);

			// Display messages
			Market.display();

			// Description VIEW MORE buttons
			// After 700 characters
			$('#centerFeed').find('.post').each(function() {
				if($(this).find('.description').html().length > 700) {
					parse_viewchanger($(this).find('.description'));
				}
			});
		} else {
			spawnMessage(res.message, false);
		}
	});

	// handle view more/less clicks
	$(document).on('click', '.view_change', function() {

		if($(this).attr('data-state') == 'less') {
			$(this).html('View less');
			expand_view($(this).parents('.post').find('.description'));
			$(this).attr('data-state', 'more');
			return;
		}

		if($(this).attr('data-state') == 'more') {
			$(this).html('View more');
			compact_view($(this).parents('.post').find('.description'));
			$(this).attr('data-state', 'less');
			return;
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
	setInterval(function() {
		$('.post').find('.post_date').each(function() {
			$(this).html(time_since(new Date($(this).attr('value'))));
		});
	}, 15000);

});



















// Display all posts inside of the feed array
Market.display = function() {
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

/*
	Feed object
	{
		_id: ObjectID 			-- 	The post ID
		poster_id: ObjectID 	-- 	The post creators user id
		poster_username: String --	Who created this post
		post_type: String 		--	'sale' || 'general' (will eventually expand options)
		post_text: String 		-- 	Contains the post description
		images: Array 			--	Contains image paths
		visibility: Integer		--	For use when products are sold or promoted
		comment_count: Integer  -- 	Number of comments (will be used for heat icon)
	}
*/

Market.parse_messages = function(json_response) {

	// iterate through message and save object in collection
	for(var message in json_response) {
		var post = json_response[message];

		if(state.USERNAME == json_response[message].poster_username) {
			post.is_owner = true;
		} else {
			post.is_owner = false;
		}

		this.feed.push(post);
	}

};





function parse_viewchanger(description_obj) {
	compact_view(description_obj);
	var DOM = '<div class="view_change" data-state="less">View more</div>'
	$(DOM).insertAfter(description_obj)
	return;
}

function expand_view(description_obj) {
	$(description_obj).css('overflow', 'initial');
	$(description_obj).css('max-height', 'initial');
	return;
}

function compact_view(description_obj) {
	$(description_obj).css('overflow', 'hidden');
	$(description_obj).css('max-height', '140px');
	return;
}

function post_from_json(json) {
	var DOM = 
	"<div class='post'>" +
		"<span class='post_id'>" + json._id + "</span>" + 
		"<span class='post_type'>" + json.post_type + "</span>" + 
		"<span class='creatorID'>" + 
			json.poster_id + 
		"</span>" + 
		"<div class='post_general'>";
			if(json.is_owner) {
				DOM += "<span class='post_options'></span>";
			}
			DOM += "<span class='creatorUsername'>" +
				json.poster_username + 
			"</span>" +
			"<span value='" + date_from_objectid(json._id) + "' class='post_date'>" + 
				time_since(date_from_objectid(json._id)) +
			"</span>" +
			"<span class='description'>" +
				json.post_text + 
			"</span>";

	if(json.images.length) {
		DOM += 
		"<div class='thumbnail'>" +
			"<img src='" + json.images[0].large + "'>" +
		"</div>";
	}

	DOM +=
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

function string_to_date(iso_date) {
	var date_obj = new Date(iso_date);
	var time = '';

	var period = 'am';

	var month_arr = [];
	month_arr[0] = 'Jan';
	month_arr[1] = 'Feb';
	month_arr[2] = 'Mar';
	month_arr[3] = 'Apr';
	month_arr[4] = 'May';
	month_arr[5] = 'Jun';
	month_arr[6] = 'Jul';
	month_arr[7] = 'Aug';
	month_arr[8] = 'Sept';
	month_arr[9] = 'Oct';
	month_arr[10] = 'Nov';
	month_arr[11] = 'Dec';

	var month = month_arr[date_obj.getMonth()];
	var day = date_obj.getDate();
	var hour = date_obj.getHours();
	if(hour > 12) {
		period = 'pm';
		hour -= 12;
	}
	var minute = date_obj.getMinutes();
	if(minute < 10) {
		minute = '0' + minute;
	}

	time = month + '. ' + day + '  ' + hour + ':' + minute + ' ' + period;

	return time;
}























