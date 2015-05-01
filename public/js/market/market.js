'use strict';


var Market = {
	isOpen: false,
	postType: 'sale',
	viewType: 'sale',
	minimumPostID: 0,
	feed: []
};

var initial_description = '';

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
			window_message(res.message);
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

	// close options menu when click is outside element
	$(document).on('click', function(e) {

		// close other menus
		$(document).find('.post .post_options').each(function() {
			if(!$(e.target).is($(this))) {
				if($(this).attr('data-state') == 'opened') {
					$(this).parents('.post').find('.post_options_menu').hide();
					$(this).attr('data-state', 'closed');
				}
			}
		});

	});

	// handle post option button clicks
	$(document).on('click', '.post .post_options', function() {
		if($(this).parents('.post').find('.post_options').attr('data-state') == 'opened') {
			$(this).parents('.post').find('.post_options_menu').hide();
			$(this).parents('.post').find('.post_options').attr('data-state', 'closed');
			return;
		}
		if($(this).parents('.post').find('.post_options').attr('data-state') == 'closed') {
			$(this).parents('.post').find('.post_options_menu').show();
			$(this).parents('.post').find('.post_options').attr('data-state', 'opened');
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

	// allow edit of post on click
	$(document).on('click', '.post_options_menu .edit_post', function() {

		// save initial description
		initial_description = $(this).parents('.post').find('.description').html();

		$(this).parents('.post').find('.description').attr('contenteditable', 'true');
		place_cursor_end($(this).parents('.post').find('.description').get(0));
		var DOM = 
		"<div class='edit_controls'>" +
			"<span class='submit_edit'>Confirm</span>" +
			"<span class='cancel_edit'>Cancel</span>" +
		"</div>";
		$(DOM).insertAfter($(this).parents('.post').find('.description'));
	});

	// submit edit button
	$(document).on('click', '.post .submit_edit', function() {

		var context = $(this);
		// hide edit controls
		$(this).parent('.edit_controls').hide();
		
		// query server to save changes
		var post_id = $(this).parents('.post').find('.post_id').html();
		var post_desc = $(this).parents('.post').find('.description').html();

		Market.save_edit(post_id, post_desc, function(res) {
			if(res.status == 'DX-OK') {
				if(res.message.nModified > 0) {
					window_message('Post updated!');
					console.log($(context).parent());
					$(context).parents('.post').find('.description').attr('contenteditable', 'false');
					$(context).parent('.edit_controls').remove();
				}
			}
		});
	});

	// cancel edit button
	$(document).on('click', '.post .cancel_edit', function() {
		// restore initial description
		$(this).parents('.post').find('.description').html(initial_description);
		$(this).parents('.post').find('.description').attr('contenteditable', 'false');
		$(this).parent('.edit_controls').remove();

	});

	// update post since every 15 seconds
	setInterval(function() {
		$('.post').find('.post_date').each(function() {
			$(this).html(time_since(new Date($(this).attr('value'))));
		});
	}, 15000);

});












function place_cursor_end(cursor) {
    cursor.focus();
    if (typeof window.getSelection != "undefined"
            && typeof document.createRange != "undefined") {
        var range = document.createRange();
        range.selectNodeContents(cursor);
        range.collapse(false);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    } else if (typeof document.body.createTextRange != "undefined") {
        var textRange = document.body.createTextRange();
        textRange.moveToElementText(cursor);
        textRange.collapse(false);
        textRange.select();
    }
}

// Display all posts inside of the feed array
Market.display = function() {
	var collection = this.feed;
	for(var message in collection) {
		$('#centerFeed').append(post_from_json(collection[message]));
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

Market.save_edit = function(post_id, desc, callback) {
	$.ajax({
		url: '/api/save_post_edit',
		data: {
			post_id: post_id,
			text: desc
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
				DOM +=
				"<span class='post_options' data-state='closed'></span>" +
				"<ul class='post_options_menu'>" +
					"<li class='edit_post'>Edit</li>" +
					"<li class='remove_post'>Remove</li>" +
				"</ul>";
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
			"<span class='commentImage'></span>" +
			"<div contenteditable='true' class='commentInput' type='text'></div>" +
		"</div>" +
	"</div>";
	
	return DOM;
}

function time_since(date) {

	var time = Math.floor((new Date() - date) / 1000);

	//var date_type = (time == 1) ? 'second' : 'seconds';
	var date_type = 's';

	// seconds -> minutes
	if(time > 60) {
		time = Math.floor(time / 60);
		//date_type = (time == 1) ? 'minute' : 'minutes';
		date_type = 'm';

		// minutes -> hours
		if(time > 60) {
			time = Math.floor(time / 60);
			//date_type = (time == 1) ? 'hour' : 'hours' ;
			date_type = 'h';

			// beyond 24 h return to regular date time format
			if(time > 24) {
				time = Math.floor(time / 24);
				//date_type = (time == 1) ? 'day' : 'days';
				date_type = '';

				// days -> weeks
				// divided by 7
			}
		}
	}



	return (date_type == '') ? string_to_date(date) : time + date_type + ' ago';
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























