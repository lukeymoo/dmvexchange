'use strict';

var is_shift_pressed = false;

$(function() {

	// Update comment intervals every 10 seconds
	setInterval(function() {
		$(document).find('.comment').each(function() {
			var new_time_since = time_since($(this).find('.comment_date').attr('data-iso'));
			$(this).find('.comment_date').html(new_time_since);
		});
	}, 10000);

	// Allow selection of image for comments
	$(document).on('click', '.post .commentImage', function() {
	});

	// shift key up detection
	$(document).on('keyup', function(key) {
		if(key.which == 16) {
			is_shift_pressed = false;
		}
	});

	// shift key down detection
	$(document).on('keydown', function(key) {
		if(key.which == 16) {
			is_shift_pressed = true;
		}
	});

	// on enter key preventDefault unless shift is pressed
	$(document).on('keydown', '.post .commentInput', function(key) {
		var comment_field = $(this);
		if(key.which == 13) {
			if(is_shift_pressed) {
			} else {
				// prevent default newline
				key.preventDefault();
				// validate comment
				// submit comment to server
				var comment = {
					id: $(this).parents('.post').find('.post_id').html(),
					text: $(this).html()
				};
				if(validate_comment(comment.text)) {
					post_comments(comment, function(res) {
						if(res.status == 'DX-OK' && res.message.nModified > 0) {
							// Parse typed comment and append to container
							var post_id = $(comment_field).parents('.post').find('.post_id').html();
							update_comments(post_id, function(res) {
								parse_comments(comment_field, res);
							});
							// Remove focus from comment field
							$(comment_field).blur();
							// Clean comment field
							$(comment_field).html('');
						} else {
							window_message(res.message, 'high');
						}
					});
				} else {
					window_message('Comment must be 2-500 characters', 'medium');
				}
			}
		}
	});

});


function update_comments(post_id, callback) {
	$.ajax({
		url: '/api/get_post_comments',
		data: {
			post_id: post_id
		},
		error: function(err) {
			window_message(err, 'high');
		}
	}).done(function(res) {
		callback(res);
	});
	return;
}

function parse_comments(comment_input, res) {
	var json = res.message;
	var DOM = '';
	for(var comment in json) {
		// Check if message is already in container
		var added = false;
		$(comment_input).parents('.post').find('.comment').each(function() {
			if($(this).find('.comment_id').html() == json[comment]._id) {
				added = true;
				// update time since
				var new_time_since = time_since($(this).find('.comment_date').attr('data-iso'));
				$(this).find('.comment_date').html(new_time_since);
				// update text
				var new_text = json[comment].text;
				$(this).find('.comment_text').html(new_text);
			}
		});
		if(!added) {
			DOM +=
			"<div class='comment'>" +
				"<div class='comment_info'>" +
					"<span class='comment_id'>" + json[comment]._id + "</span>" +
					"<span class='comment_user_id'>" + json[comment].poster_id + "</span>" +
					"<span class='comment_options' data-state='closed'></span>" +
					"<ul class='comment_options_menu'>" +
						"<li class='edit_comment'>Edit</li>" +
						"<li class='remove_comment'>Remove</li>" +
					"</ul>" +
					"<span class='username'>" + json[comment].poster_username + "</span>" +
					"<span class='comment_date' data-iso='" + date_from_objectid(json[comment]._id) + "'>" + time_since(date_from_objectid(json[comment]._id)) + "</span>" +
				"</div>" +
				"<span class='comment_text'>" + json[comment].text + "</span>" +
			"</div>";
		}
	}
	$(DOM).insertBefore(comment_input);
	return;
}

function post_comments(commentObj, callback) {
	$.ajax({
		url: '/api/post_comment',
		data: {
			post_id: commentObj.id,
			text: commentObj.text
		},
		error: function(err) {
			var res = {
				status: 'DX-FAILED',
				message: err.status + ': ' + err.statusText
			};
			callback(res);
		}
	}).done(function(res) {
		callback(res);
	});
}

function validate_comment(string) {
	return (string.length >= 2 && string.length <= 500) ? true : false;
}



