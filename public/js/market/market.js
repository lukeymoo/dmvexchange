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

			// Add view more buttons where needed
			$('#centerFeed').find('.post').each(function() {
				if($(this).find('.description').html().length > 700) {
					parse_viewchanger($(this).find('.description'));
				}
				var pid = $(this).find('.post_id').html();
				var cid = ($(this).find('.comment').length) ? $(this).find('.comment')[0] : false;
				if(cid != false) {
					var first_comment = $(this).find('.comment')[0];
					cid = $(cid).find('.comment_id').html();
					is_more_comments(pid, cid, function(res) {
						if(res.status == 'DX-OK') {
							if(res.message != false) {
								var LOAD_MORE_COMMENTS =
								"<span class='load_older_comments'>" + res.message + " more comments</span>";
								$(LOAD_MORE_COMMENTS).insertBefore(first_comment);
							}
						}
					});
				}
			});
		} else {
			window_message(res.message);
		}
	});

	// Load more comments on click
	$(document).on('click', '.post .load_older_comments', function() {
		var view_more_elem = $(this);
		var pid = $(this).parents('.post').find('.post_id').html();
		var cid = ($(this).parents('.post').find('.comment').length) ? $(this).parents('.post').find('.comment')[0] : false;
		if(cid) {
			var cid = $(cid).find('.comment_id').html();
			console.log('old =>', cid);
			load_older_comments(pid, cid, function(res) {
				if(res.status == 'DX-OK') {
					// parse comments by prepending commentContainer for post_id
					if(res.message) {
						// remove view more button
						$(view_more_elem).remove();
						parse_loaded_comments(pid, res.message);
						var first_comment = '';
						$('.post').each(function() {
							if($(this).find('.post_id').html() == pid) {
								first_comment = $(this).find('.comment')[0];
							}
						});
						cid = $(first_comment).find('.comment_id').html();
						console.log('new => ', cid);
						is_more_comments(pid, cid, function(res) {
							if(res.status == 'DX-OK') {
								if(res.message != false) {
									var LOAD_MORE_COMMENTS =
									"<span class='load_older_comments'>" + res.message + " more comments</span>";
									$(LOAD_MORE_COMMENTS).insertBefore(first_comment);
								}
							}
						});
					}
				} else {
					window_message(res.message, 'high');
				}
			});
		} else {
			window_message('Cannot determine comment index', 'medium');
			return;
		}
	});

	// handle view more/less clicks
	$(document).on('click', '.view_change', function() {

		// Ensure there is no editing going on
		if($(this).attr('data-state') == 'less') {
			$(this).html('View less');
			expand_view($(this).parents('.post').find('.description'));
			$(this).attr('data-state', 'more');
			return;
		}

		if($(this).attr('data-state') == 'more') {
			if(!$(this).parents('.post').find('.edit_controls').length) {
				$(this).html('View more');
				compact_view($(this).parents('.post').find('.description'));
				$(this).attr('data-state', 'less');
				return;
			}
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

		// click the view more button first if it exists
		if($(this).parents('.post').find('.view_change')) {
			$(this).parents('.post').find('.view_change').click();
		}

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

		var post_elem = $(this).parents('.post');
		var date_elem = $(this).parents('.post').find('.post_date');
		var desc_elem = $(this).parents('.post').find('.description');
		var controls_elem = $(this).parent('.edit_controls');
		// hide edit controls
		//$(this).parent('.edit_controls').hide();
		
		// query server to save changes
		var post_id = $(this).parents('.post').find('.post_id').html();
		var post_desc = $(this).parents('.post').find('.description').html();

		// validate desc before attempting submission
		if(validate_post_description(post_desc)) {
			Market.save_edit(post_id, post_desc, function(res) {
				if(res.status == 'DX-OK') {
					if(parseInt(res.message.nModified) > 0) {
						window_message('Post updated!');
						$(desc_elem).attr('contenteditable', 'false');
						$(controls_elem).remove();
						if(!$(post_elem).find('.is_edited').length) {
							var DOM = "<span class='is_edited'>&#8627; Edited</span>";
							$(DOM).insertAfter(date_elem);
						}
					} else if(res.message == 'Description is unchanged') {
						$(desc_elem).attr('contenteditable', 'false');
						$(controls_elem).remove();
						window_message(res.message, 'medium');
					} else {
						window_message(res.message, 'medium');
					}
				} else {
					window_message(res.message, 'high');
				}
			});
		} else {
			window_message('Description must be 2-2500 characters', 'high');
		}
	});

	// cancel edit button
	$(document).on('click', '.post .cancel_edit', function() {
		// restore initial description
		$(this).parents('.post').find('.description').html(initial_description);
		$(this).parents('.post').find('.description').attr('contenteditable', 'false');
		$(this).parent('.edit_controls').remove();
	});

	// update post's time_since's every 29 seconds
	setInterval(function() {
		$('.post').find('.post_date').each(function() {
			$(this).html(time_since(new Date($(this).attr('value'))));
		});
	}, 29000);

});







function make_comment_from_json(json) {
	var COMMENT =
	"<div class='comment'>" +
			"<div class='comment_info'>" +
				"<span class='comment_id'>" + json._id + "</span>" +
				"<span class='comment_user_id'>" + json.poster_id + "</span>";
				if(json.poster_username == state.USERNAME) {
					COMMENT +=
					"<span class='comment_options' data-state='closed'></span>" +
					"<ul class='comment_options_menu'>" +
						"<li class='edit_comment'>Edit</li>" +
						"<li class='remove_comment'>Remove</li>" +
					"</ul>";
				}
				COMMENT += "<span class='username'>" + json.poster_username + "</span>" +
				"<span data-iso='" + date_from_objectid(json._id) + "' class='comment_date'>" + time_since(date_from_objectid(json._id)) + "</span>" +
			"</div>" +
			"<span class='comment_text' spellcheck='false'>" + document.createTextNode(json.text).data + "</span>";
			if(json.edited) {
				COMMENT += "<span class='is_edited'>&#8627; Edited</span>";
			}
	COMMENT += "</div>";
	return COMMENT;
}

/**
	Parses OLDER comments
*/
function parse_loaded_comments(post_id, json) {
	console.log(json);
	// remove the view more button
	var comments = '';
	for(var comment in json) {
		comments += make_comment_from_json(json[comment]);
	}
	if(comments) {
		$('.post').each(function() {
			if($(this).find('.post_id').html() == post_id) {
				$(this).find('.commentContainer').prepend(comments);
			}
		});
	}
	return;
}

function load_older_comments(post_id, comment_id, callback) {
	$.ajax({
		url: '/api/comments',
		data: {
			type: 'BEFORE',
			post_id: post_id,
			comment_id: comment_id
		},
		error: function(err) {
			var res = {
				status: 'DX-FAILED',
				message: 'Server error occurred'
			};
			if(err.status == 0) {
				res.message = 'Server is currently down';
			}
			callback(res);
		}
	}).done(function(res) {
		callback(res);
	});
	return;
}

function is_more_comments(post_id, comment_id, callback) {
	$.ajax({
		url: '/api/is_more_comments',
		data: {
			post_id: post_id,
			comment_id: comment_id
		},
		error: function(err) {
			var res = {
				status: 'DX-FAILED',
				message: 'Server error occurred'
			};
			if(err.status == 0) {
				res.message = 'Server is currently down';
			}
			callback(res);
		}
	}).done(function(res) {
		callback(res);
	});
}

function validate_post_description(string) {
	return (string.length >= 4 && string.length <= 2500) ? true : false;
}

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
		type: 'POST',
		url: '/api/save_post_edit',
		data: {
			post_id: post_id,
			text: desc
		},
		error: function(err) {
			var res = {
				status: 'DX-FAILED',
				message: 'Server error'
			};
			if(res.status == 0) {
				res.message = 'Server is currently down';
			}
			callback(res);
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
		"<span class='creatorID'>" + json.poster_id + "</span>" + 
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
			"</span>";
			if(json.edited) {
				DOM += "<span class='is_edited'>&#8627; Edited</span>";
			}
			DOM += "<span class='description' spellcheck='false'>" +
			document.createTextNode(json.post_text).data + "</span>";

	if(json.images.length) {
		DOM += 
		"<div class='thumbnail'>" +
			"<img src='" + json.images[0].large + "'>" +
		"</div>";
	}

	var comments = '';
	for(var comment in json.comments) {
		comments += make_comment_from_json(json.comments[comment]);
	}

	DOM +=
	"</div>" +
		"<div class='commentContainer'>" +
			comments +
			"<span class='commentImage'></span>" +
			"<div contenteditable='true' class='commentInput' type='text'></div>" +
		"</div>" +
	"</div>";
	
	return DOM;
}

function time_since(date) {
	date = (date instanceof Date) ? date : new Date(date);

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

	//time = month + ' ' + day + '   ' + hour + ':' + minute + ' ' + period;
	time = month + ' ' + day;

	return time;
}























