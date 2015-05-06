'use strict';

var is_shift_pressed = false;

// pointer to interval func that updates comment section
// of post you recently commented on
var comment_updater;

// pointer to timeout func that cancels updater interval
var cancel_comment_updater;
var initial_comment = '';

$(function() {

	// Update ALL comment time_since's every 9 seconds
	setInterval(function() {
		$(document).find('.comment').each(function() {
			var new_time_since = time_since($(this).find('.comment_date').attr('data-iso'));
			$(this).find('.comment_date').html(new_time_since);
		});
	}, 9000);

	// close comment options menu if clicked outside
	$(document).on('click', function(e) {
		$(document).find('.comment_options').each(function() {
			if(!$(e.target).is($(this))) {
				if($(this).attr('data-state') == 'opened') {
					hide_comment_options($(this).parent('.comment_info').find('.comment_id').html());
				}
			}
		});
	});

	// comment options menu
	$(document).on('click', '.comment_options', function() {
		if($(this).attr('data-state') == 'closed') {
			show_comment_options($(this).parent('.comment_info').find('.comment_id').html());
		} else {
			hide_comment_options($(this).parent('.comment_info').find('.comment_id').html());
		}
	});

	// remove comment click
	$(document).on('click', '.remove_comment', function() {
		var pid = $(this).parents('.post').find('.post_id').html();
		var cid = $(this).find('.comment_id').html();
		// Ask to confirm
		confirmation_remove_comment();
	});

	// Confirm remove comment
	$(document).on('click', '.dialog_box .cancel_dialog', function() {
	});

	// Cancel remove comment
	$(document).on('click', '.dialog_box .confirm_dialog', function() {
	});

	// edit comment click
	$(document).on('click', '.edit_comment', function() {
		// close other edits & post edit
		$(document).find('.comment').each(function() {
			if($(this).find('.comment_edit_controls').length) {
				var pid = $(this).parents('.post').find('.post_id').html();
				var cid = $(this).find('.comment_id').html();
				cancel_comment_edit(pid, cid);
			}
		});
		var cid = $(this).parents('.comment').find('.comment_id').html();
		var pid = $(this).parents('.post').find('.post_id').html();
		edit_comment(pid, cid);
	});

	// submit comment edit
	$(document).on('click', '.comment_submit_edit', function() {

		var pid = $(this).parents('.post').find('.post_id').html();
		var cid = $(this).parents('.comment').find('.comment_id').html();
		var new_comment = $(this).parents('.comment').find('.comment_text').html();

		// validate comment on client then send to server
		if(validate_comment(new_comment)) {
			// hide edit controls
			var comment_controls = $(this).parent('.comment_edit_controls');
			var comment_elem = $(this).parents('.comment');
			var comment_text_elem = $(this).parents('.comment').find('.comment_text');
			$(comment_controls).hide();

			submit_comment_edit(pid, cid, new_comment, function(res) {
				if(res.status == 'DX-OK' && parseInt(res.message.nModified) > 0) {
					// Remove edit controls and contenteditable attr
					$(comment_controls).remove();
					$(comment_text_elem).attr('contenteditable', 'false');
					window_message('Updated!');
					if(!$(comment_elem).find('.is_edited').length) {
						var edited = "<span class='is_edited'>&#8627; Edited</span>";
						$(edited).insertAfter(comment_text_elem);
					}
				} else {
					$(comment_controls).show();
					window_message('Failed to update comment', 'high');
				}
			});
		} else {
			window_message('Cannot save changes, comment must be 2-500 characters', 'high');
		}
	});

	// cancel comment edit
	$(document).on('click', '.comment_cancel_edit', function() {
		var pid = $(this).parents('.post').find('.post_id').html();
		var cid = $(this).parents('.comment').find('.comment_id').html();
		cancel_comment_edit(pid, cid);
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
							// cancel comment timeout func
							cancel_comment_updater = null;
							// cancel comment interval func
							comment_updater = null;

							// Parse typed comment and append to container
							var post_id = $(comment_field).parents('.post').find('.post_id').html();
							update_comments(post_id, function(res) {
								if(res.status == 'DX-OK') {
									parse_comments(comment_field, res.message);
								} else {
									window_message(res.message, 'high');
								}
							});

							// Remove focus from comment field
							$(comment_field).blur();

							// Clean comment field
							$(comment_field).html('');

							// re-init comment timeout func ( 2 minute timeout )
							cancel_comment_updater = setTimeout(function() {
								comment_updater = null;
							}, 120000);

							// re-init comment interval func ( 6 second intervals )
							comment_updater = interval_comment_update(comment_field, post_id);

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





function confirmation_remove_comment() {
	// Display confirmation dialog
	var BLUR = "<div class='dialog_blur'></div>";
	var DIALOG = 
	"<div class='dialog_box'>" +
		"<span class='dialog_text'>Are you sure you want to delete this comment ?</span>" +
		"<div class='dialog_controls'>" +
			"<span class='cancel_dialog'>Cancel</span>" +
			"<span class='confirm_dialog'>Confirm</span>" +
		"</div>" +
	"</div>";
	$(BLUR).appendTo('#wrapper');
	$(DIALOG).appendTo('#wrapper');
	return;
}

function remove_comment(post_id, comment_id, callback) {
	return;
}

function show_comment_options(comment_id) {
	$('#centerFeed').find('.comment_id').each(function() {
		if($(this).html() == comment_id) {
			// open this
			$(this).parent('.comment_info').find('.comment_options').attr('data-state', 'opened');
			$(this).parent('.comment_info').find('.comment_options_menu').show();
		}
	});
	return;
}

function hide_comment_options(comment_id) {
	$('#centerFeed').find('.comment_id').each(function() {
		if($(this).html() == comment_id) {
			// close this
			$(this).parent('.comment_info').find('.comment_options').attr('data-state', 'closed');
			$(this).parent('.comment_info').find('.comment_options_menu').hide();
		}
	});
	return;
}

function edit_comment(post_id, comment_id) {
	$(document).find('.post').each(function() {
		if($(this).find('.post_id').html() == post_id) {
			$(this).find('.comment').each(function() {
				if($(this).find('.comment_id').html() == comment_id) {
					// Create cancel/submit edit buttons
					var DOM = 
					"<div class='comment_edit_controls'>" +
						"<span class='comment_cancel_edit'>Cancel</span>" +
						"<span class='comment_submit_edit'>Submit</span>" +
					"</div>";
					$(this).append(DOM);
					// Save inital comment text
					initial_comment = $(this).find('.comment_text').html();
					// Make contenteditable & give focus
					$(this).find('.comment_text').attr('contenteditable', 'true');
					place_cursor_end($(this).find('.comment_text').get(0));
				}
			});
			return;
		}
	});
	return;
}

function submit_comment_edit(post_id, comment_id, text, callback) {
	// clear initial comment variable
	$.ajax({
		url: '/api/save_comment_edit',
		data: {
			post_id: post_id,
			comment_id: comment_id,
			text: text
		},
		error: function(err) {
			var res = {
				status: 'DX-FAILED',
				message: (parseInt(err.status) == 0) ? 'Server is currently down' : 'Server error'
			};
			callback(res);
		}
	}).done(function(res) {
		callback(res);
	});
	return;
}

function cancel_comment_edit(post_id, comment_id) {
	$(document).find('.post').each(function() {
		if($(this).find('.post_id').html() == post_id) {
			$(this).find('.comment').each(function() {
				if($(this).find('.comment_id').html() == comment_id) {
					// restore initial comment
					$(this).find('.comment_text').html(initial_comment);
					// remove edit controls
					$(this).find('.comment_edit_controls').remove();
					// reset contenteditable
					$(this).find('.comment_text').attr('contenteditable', 'false');
				}
			});
		}
	});
	// clear initial comment variable
	initial_comment = '';
	return;
}


function interval_comment_update(comment_field, post_id) {
	// update comments every 6 seconds
	var auto_update_comments = setInterval(function() {
		update_comments(post_id, function(res) {
			parse_comments(comment_field, res);
		});
	}, 6000);
	return auto_update_comments
}

function update_comments(post_id, callback) {
	$.ajax({
		url: '/api/get_post_comments',
		data: {
			post_id: post_id
		},
		error: function(err) {
			var res = {
				status: 'DX-FAILED',
				message: (err.status == 0) ? 'Server is currently down' : 'Server error'
			};
			callback(res);
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



