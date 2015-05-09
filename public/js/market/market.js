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
	1. Create product filters ( for views )
	2. Allow ability to create custom filters
*/

$(function() {

	/**
		To search if there is search parameter in URL, query the database with that

		Otherwise just query database for last `n` posts
	*/
	var search_query = (getParam('search') && getParam('search').length) ? 
		getParam('search') : null;
		
	/** Place search query in search field for easy edits **/
	if(search_query) {
		$('#searchContainer input').val(decodeURI(search_query));
	}
	Market.get(search_query, function(res) {
		if(res.status == 'DX-OK') {

			// save arrays for types of feed
			Market.minimumPostID = res.message[0];

			// Parse array into storage
			Market.parsePost(res.message);

			// Display messages
			Market.display();

			// Add view more buttons where needed
			$('#centerFeed').find('.post').each(function() {
				if($(this).find('.description').html().length > 700) {
					parseDescViewMore($(this).find('.description'));
				}
				var pid = $(this).find('.post_id').html();
				var cid = ($(this).find('.comment').length) ? $(this).find('.comment')[0] : false;
				if(cid != false) {
					var first_comment = $(this).find('.comment')[0];
					cid = $(cid).find('.comment_id').html();
					hasOlderComments(pid, cid, function(res) {
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
			createAlert(res.message);
		}
	});

	/**
		Search on enter key
	*/
	$('#searchContainer input').on('keydown', function(key) {
		if(key.which == 13) {
			$(this).parent('#searchContainer').find('button').click();
		}
	});

	/**
		Reload page with search query
	*/
	$(document).on('click', '#searchContainer button', function() {
		window.location.href = '/market?search=' + $(this).parent('#searchContainer').find('input[type=text]').val();
	});

	// Load more comments on click
	$(document).on('click', '.post .load_older_comments', function() {
		var view_more_elem = $(this);
		var pid = $(this).parents('.post').find('.post_id').html();
		var cid = ($(this).parents('.post').find('.comment').length) ? $(this).parents('.post').find('.comment')[0] : false;
		if(cid) {
			var cid = $(cid).find('.comment_id').html();
		} else {
			// When the server receives 0 it just loads the last 10 comments
			cid = 0;
		}
		getOlderComments(pid, cid, function(res) {
			if(res.status == 'DX-OK') {
				// parse comments by prepending commentContainer for post_id
				if(res.message) {
					// remove view more button
					$(view_more_elem).remove();
					parseOldComments(pid, res.message);
					var first_comment = '';
					$('.post').each(function() {
						if($(this).find('.post_id').html() == pid) {
							first_comment = $(this).find('.comment')[0];
						}
					});
					cid = $(first_comment).find('.comment_id').html();
					hasOlderComments(pid, cid, function(res) {
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
				createAlert(res.message, 'high');
			}
		});
	});

	// Handle view more/less clicks
	$(document).on('click', '.view_change', function() {

		// Ensure there is no editing going on
		if($(this).attr('data-state') == 'less') {
			$(this).html('View less');
			expandDescView($(this).parents('.post').find('.description'));
			$(this).attr('data-state', 'more');
			return;
		}

		if($(this).attr('data-state') == 'more') {
			if(!$(this).parents('.post').find('.edit_controls').length) {
				$(this).html('View more');
				contractDescView($(this).parents('.post').find('.description'));
				$(this).attr('data-state', 'less');
				return;
			}
		}
	});

	// Close options menu when click is outside element
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

	// Toggles post options menu on click
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
		placeCursorEnd($(this).parents('.post').find('.description').get(0));
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
		var controls_html = $(this).parent('.edit_controls')[0].outerHTML;

		// query server to save changes
		var post_id = $(this).parents('.post').find('.post_id').html();
		var post_desc = $(this).parents('.post').find('.description').html();

		// Remove edit controls
		$(this).parent('.edit_controls').remove();

		// validate desc before attempting submission
		if(validPostDesc(post_desc)) {
			Market.savePostEdit(post_id, post_desc, function(res) {
				if(res.status == 'DX-OK') {
					if(parseInt(res.message.nModified) > 0) {
						createAlert('Post updated!');
						$(desc_elem).attr('contenteditable', 'false');
						if(!$(post_elem).find('.is_edited').length) {
							var DOM = "<span class='is_edited'>&#8627; Edited</span>";
							$(DOM).insertAfter(date_elem);
						}
					} else if(res.message == 'Description is unchanged') {
						$(desc_elem).attr('contenteditable', 'false');
						createAlert(res.message, 'medium');
					} else {
						createAlert(res.message, 'medium');
					}
				} else {
					// Append edit controls
					$(controls_html).insertAfter(desc_elem);
					createAlert(res.message, 'high');
				}
			});
		} else {
			createAlert('Description must be 2-2500 characters', 'high');
		}
	});

	// cancel edit button
	$(document).on('click', '.post .cancel_edit', function() {
		// restore initial description
		$(this).parents('.post').find('.description').html(initial_description);
		$(this).parents('.post').find('.description').attr('contenteditable', 'false');
		$(this).parent('.edit_controls').remove();
	});

	// update post's timeSince's every 29 seconds
	setInterval(function() {
		$('.post').find('.post_date').each(function() {
			$(this).html(timeSince(new Date($(this).attr('value'))));
		});
	}, 29000);

});







function jsonToComment(json) {
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
				"<span data-iso='" + dateFromObjectID(json._id) + "' class='comment_date'>" + timeSince(dateFromObjectID(json._id)) + "</span>" +
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
function parseOldComments(post_id, json) {
	// remove the view more button
	var comments = '';
	for(var comment in json) {
		comments += jsonToComment(json[comment]);
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

function getOlderComments(post_id, comment_id, callback) {
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

function hasOlderComments(post_id, comment_id, callback) {
	$.ajax({
		url: '/api/is_older_comments',
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

function validPostDesc(string) {
	return (string.length >= 4 && string.length <= 2500) ? true : false;
}

function placeCursorEnd(cursor) {
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
		$('#centerFeed').append(jsonToPost(collection[message]));
	}
};

// Retrieve feed for current view
Market.get = function(search, callback) {
	$.ajax({
		url: '/api/get_feed',
		data: {
			si: this.saleIndex,
			gi: this.generalIndex,
			minID: this.minimumPostID,
			search: search
		}
	}).done(function(res) {
		callback(res);
	});
};

Market.savePostEdit = function(post_id, desc, callback) {
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

Market.parsePost = function(json_response) {

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





function parseDescViewMore(description_obj) {
	contractDescView(description_obj);
	var DOM = '<div class="view_change" data-state="less">View more</div>'
	$(DOM).insertAfter(description_obj)
	return;
}

function expandDescView(description_obj) {
	$(description_obj).css('overflow', 'initial');
	$(description_obj).css('max-height', 'initial');
	return;
}

function contractDescView(description_obj) {
	$(description_obj).css('overflow', 'hidden');
	$(description_obj).css('max-height', '140px');
	return;
}

function jsonToPost(json) {
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
			"<span value='" + dateFromObjectID(json._id) + "' class='post_date'>" + 
				timeSince(dateFromObjectID(json._id)) +
			"</span>";
			if(json.edited) {
				DOM += "<span class='is_edited'>&#8627; Edited</span>";
			}
			DOM += "<span class='description' spellcheck='false'>" +
			document.createTextNode(json.post_text).data + "</span>";

	if(json.images.length) {
		DOM += 
		"<div class='thumbnail'>" +
			"<img src='" + json.images[0].small + "'>" +
		"</div>";
	}

	var comments = '';
	for(var comment in json.comments) {
		comments += jsonToComment(json.comments[comment]);
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

function timeSince(date) {
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

			// If 24 h < time h > 48 h return `yesterday @ time`
			if(time >= 24 && time <= 47) {
				date_type = 'yesterday';
			}

			// 48 h or more return to regular date time format
			if(time >= 48) {
				time = Math.floor(time / 24);
				//date_type = (time == 1) ? 'day' : 'days';
				date_type = '';

				// days -> weeks
				// divided by 7
			}
		}
	}

	if(date_type == '') {
		return isoToString(date);
	}
	if(date_type == 'yesterday') {
		return date_type;
	}

	return time + date_type + ' ago';
}

function dateFromObjectID(object_id) {
	return new Date(parseInt(object_id.substring(0, 8), 16) * 1000);
}

function isoToString(iso_date) {
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

	time = month + ' ' + day;

	return time;
}























