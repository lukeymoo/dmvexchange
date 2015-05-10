'use strict';

// pointer to interval func that updates comment section
// of post you recently commented on
var comment_updater;

// pointer to timeout func that cancels updater interval
var cancel_comment_updater;
var initial_comment = '';

$(function() {

	/**
		Updates time since post date for all comments
	*/
	setInterval(function() {
		$(document).find('.comment').each(function() {
			var new_timeSince = timeSince($(this).find('.comment_date').attr('data-iso'));
			$(this).find('.comment_date').html(new_timeSince);
		});
	}, 11000);

	/**
		Toggle comment options menu
	*/
	$(document).on('click', '.comment_options', function() {
		if($(this).attr('data-state') == 'closed') {
			showCommentOptions($(this).parent('.comment_info').find('.comment_id').html());
		} else {
			hideCommentOptions($(this).parent('.comment_info').find('.comment_id').html());
		}
	});

	/**
		Close comment options menu if click is outside `.comment_options` element
	*/
	$(document).on('click', function(e) {
		$(document).find('.comment_options').each(function() {
			if(!$(e.target).is($(this))) {
				if($(this).attr('data-state') == 'opened') {
					hideCommentOptions($(this).parent('.comment_info').find('.comment_id').html());
				}
			}
		});
	});

	/**
		Removes comment when comment options menu `.remove_comment` button
		is clicked
	*/
	$(document).on('click', '.remove_comment', function() {
		var pid = $(this).parents('.post').find('.post_id').html();
		var cid = $(this).parents('.comment').find('.comment_id').html();
		// Ask to confirm comment removal
		confirmRemoveComment(pid, cid);
	});

	
	/**
		Confirm button for comment removal
	*/
	$(document).on('click', '.dialog_box .confirm_dialog', function() {
		var pid = $(this).parents('.dialog_box').find('.for_post_id').html();
		var cid = $(this).parents('.dialog_box').find('.for_comment_id').html();
		removeComment(pid, cid, function(res) {
			if(res.status == 'DX-OK') {
				if(parseInt(res.message.nModified) > 0) {
					// Remove dialog and background blur
					$(document).find('.dialog_box').remove();
					$(document).find('.dialog_blur').remove();
					// Remove comment by id
					$(document).find('.post').each(function() {
						if($(this).find('.post_id').html() == pid) {
							$(this).find('.comment').each(function() {
								if($(this).find('.comment_id').html() == cid) {
									$(this).remove();
								}
							});
						}
					});
				} else {
					/** If no comment was removed by the back-end **/
					// Remove dialog and background blur
					$(document).find('.dialog_box').remove();
					$(document).find('.dialog_blur').remove();
					createAlert('Seems like something went wrong...', 'medium');
				}
			} else {
				/** If something bad happened on the back-end **/
				// Remove dialog and blur
				$(document).find('.dialog_box').remove();
				$(document).find('.dialog_blur').remove();
				createAlert(res.message, 'high');
			}
		});
	});

	/**
		Cancel button for remove comment dialog
	*/
	$(document).on('click', '.dialog_box .cancel_dialog', function() {
		$(document).find('.dialog_box').remove();
		$(document).find('.dialog_blur').remove();
	});

	/**
		Edits comment when comment options menu `.edit_comment` button
		is clicked
	*/
	$(document).on('click', '.edit_comment', function() {
		// close other edits & post edit
		$(document).find('.comment').each(function() {
			if($(this).find('.comment_edit_controls').length) {
				var pid = $(this).parents('.post').find('.post_id').html();
				var cid = $(this).find('.comment_id').html();
				cancelEditComment(pid, cid);
			}
		});
		var cid = $(this).parents('.comment').find('.comment_id').html();
		var pid = $(this).parents('.post').find('.post_id').html();
		editComment(pid, cid);
	});

	/**
		When editing comment we need to change default html insertions
		for proper formatting in database
	*/
	$(document).on('keydown', '.comment_text[contenteditable="true"]', function(key) {
		if(key.which == 13) {
			document.execCommand('insertHTML', false, '<br><br>');
			return false;
		}
	});

	/**
		Saves comment edits when comment options menu `.comment_submit_edit` button
		is clicked
	*/
	$(document).on('click', '.comment_submit_edit', function() {

		var pid = $(this).parents('.post').find('.post_id').html();
		var cid = $(this).parents('.comment').find('.comment_id').html();
		var new_comment = $(this).parents('.comment').find('.comment_text').html();
		/**
			Escape user entries of [+n]
		*/
		new_comment = new_comment.replace(/\[\+n\]/g, '[||||||+special_n||||||]');
		/**
			Replace <br> with custom symbol [/+n+]
		*/
		new_comment = new_comment.replace(/<br\s*(\s+[^>]+)*[\/]?>/gi, '[+n]');

		// Ensure comment is valid
		if(isValidComment(new_comment)) {
			// Hide edit controls
			var comment_controls = $(this).parent('.comment_edit_controls');
			var comment_elem = $(this).parents('.comment');
			var comment_text_elem = $(this).parents('.comment').find('.comment_text');
			$(comment_controls).hide();

			/** Post comment to server **/
			saveComment(pid, cid, new_comment, function(res) {
				if(res.status == 'DX-OK') {
					/** If successful request **/
					if(parseInt(res.message.nModified) > 0) {
						// Remove `.edit_controls` and contenteditable attr
						$(comment_controls).remove();
						$(comment_text_elem).attr('contenteditable', 'false');
						if(!$(comment_elem).find('.is_edited').length) {
							var edited = "<span class='is_edited'>&#8627; Edited</span>";
							$(edited).insertAfter(comment_text_elem);
						}
						// Present user with success message
						createAlert('Updated!');
					} else if(res.message == 'Comment is unchanged') {
						/** If submitted comment matches original **/
						$(comment_controls).remove();
						$(comment_text_elem).attr('contenteditable', 'false');
						// Present no change message to user
						createAlert(res.message, 'medium');
					}
				} else {
					/** If we received bad response **/
					$(comment_controls).show();
					// Present error message to user
					createAlert('Failed to update comment', 'high');
				}
			});
		} else {
			/** If the comment was not valid present error message **/
			createAlert('Cannot save changes, comment must be 2-1000 characters', 'high');
		}
	});

	/**
		Cancels comment edits and restores original text when
		`.comment_cancel_edit` is clicked
	*/
	$(document).on('click', '.comment_cancel_edit', function() {
		var pid = $(this).parents('.post').find('.post_id').html();
		var cid = $(this).parents('.comment').find('.comment_id').html();
		cancelEditComment(pid, cid);
	});

	/**
		Post comment to server on enter key ( keycode == 13 )
		Clears comment input and removes focus on escape ( keycode == 27 )
	*/
	$(document).on('keydown', '.post .commentInput', function(key) {
		if(key.which == 27) {
			$(this).html('');
			$(this).blur();
		}
		if(key.which == 13) {
			// Prevent creation of newline in div
			key.preventDefault();
			var comment_field = $(this);
			var comment_input = $(this);
			var comment = {
				id: $(this).parents('.post').find('.post_id').html(),
				text: $(this).text()
			};
			// Ensure valid comment
			if(isValidComment(comment.text)) {
				// Posts comment to server
				createComment(comment, function(res) {
					if(res.status == 'DX-OK') {
						/** If successful request **/
						if(parseInt(res.message.nModified) > 0) {
							// Cancel function that stops interval comment update function
							cancel_comment_updater = null;
							// Cancel interval comment update function
							comment_updater = null;

							// Parse typed comment and append to container
							var post_id = $(comment_field).parents('.post').find('.post_id').html();
							var post_elem = $(comment_field).parents('.post');
							var timestamp = null;
							timestamp = ($(comment_field).parents('.commentContainer').find('.comment').length) ?
								$(comment_field).parents('.commentContainer').find('.comment')[0] : null;
							if(timestamp) {
								timestamp = $(timestamp).attr('timestamp');
							}
							// Create comment placeholder and append it to `.commentContainer`
							var FAKE_COMMENT = 
							"<div class='fake comment'>" +
								"<div class='comment_info'>" +
									"<span class='username'>" + state.USERNAME + "</span>" +
								"</div>" +
								"<span class='comment_text' spellcheck='false'>Posting...</span>" +
							"</div>";
							$(FAKE_COMMENT).insertBefore(comment_input);

							/**
								Retreive post comments after 1.75 seconds
								we delay because the comment may not be inserted into database
								in time if we request immediately
							*/
							setTimeout(function() {
								getNewComments(post_id, timestamp, function(upres) {
									if(upres.status == 'DX-OK') {
										if(upres.message.length) {
											parseComments(post_elem, upres.message);
										} else {
											// Null response means no comments for specified post
										}
									} else {
										/** If bad request present error message **/
										createAlert(upres.message, 'high');
									}
								});
							}, 1750)

							// Remove focus from comment input field
							$(comment_field).blur();

							// Clear comment input field
							$(comment_field).html('');

							/**
								Create timeout that cancels update function
								( 1 minute timeout )
							*/
							cancel_comment_updater = setTimeout(function() {
								clearInterval(comment_updater);
								comment_updater = null;
							}, 60000);

							/**
								Updates and retrieves comments for post at intervals
								( 6 second intervals )
							*/
							comment_updater = intervalCommentUpdate(timestamp, post_id, post_elem);
						} else {
							/** If good response but no server action **/
							// Present user with response
							createAlert(res.message, 'medium');
						}
					} else {
						/** If bad response present error message to user **/
						createAlert(res.message, 'high');
					}
				});
			} else {
				/** If not valid comment present user with error message **/
				createAlert('Comment must be 2-1000 characters', 'medium');
			}
		}
	});

});



/**
	Updates existing comments & retrieves new comments
	since last comment in view
*/
function getNewComments(post_id, timestamp, callback) {
	var param = '';
	if(timestamp) {
		param = '/AFTER/' + timestamp;
	}
	$.ajax({
		type: 'GET',
		url: '/api/post/' + post_id + '/comment' + param,
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

function confirmRemoveComment(pid, cid) {
	// Display confirmation dialog
	var BLUR = "<div class='dialog_blur'></div>";
	var DIALOG = 
	"<div class='dialog_box'>" +
		"<span class='for_post_id'>" + pid + "</span>" +
		"<span class='for_comment_id'>" + cid + "</span>" +
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

function removeComment(post_id, comment_id, callback) {
	$.ajax({
		type: 'POST',
		url: '/api/post/' + post_id + '/comment/remove/' + comment_id,
		error: function(err) {
			var res = {
				status: 'DX-FAILED',
				message: 'Server error'
			};
			if(parseInt(err.status) == 0) {
				res.message = 'Server is currently down';
			}
			callback(res);
		}
	}).done(function(res) {
		callback(res);
	});
	return;
}

function showCommentOptions(comment_id) {
	$('#centerFeed').find('.comment_id').each(function() {
		if($(this).html() == comment_id) {
			// open this
			$(this).parent('.comment_info').find('.comment_options').attr('data-state', 'opened');
			$(this).parent('.comment_info').find('.comment_options_menu').show();
		}
	});
	return;
}

function hideCommentOptions(comment_id) {
	$('#centerFeed').find('.comment_id').each(function() {
		if($(this).html() == comment_id) {
			// close this
			$(this).parent('.comment_info').find('.comment_options').attr('data-state', 'closed');
			$(this).parent('.comment_info').find('.comment_options_menu').hide();
		}
	});
	return;
}

function editComment(post_id, comment_id) {
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
					placeCursorEnd($(this).find('.comment_text').get(0));
				}
			});
			return;
		}
	});
	return;
}

function saveComment(post_id, comment_id, text, callback) {
	// clear initial comment variable
	$.ajax({
		type: 'POST',
		url: '/api/post/' + post_id + '/comment/edit/' + comment_id,
		data: {
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

function cancelEditComment(post_id, comment_id) {
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


function intervalCommentUpdate(timestamp, post_id, post_elem) {
	// update comments every 6 seconds
	var auto_update_comments = setInterval(function() {
		getNewComments(post_id, timestamp, function(upres) {
			if(upres.status == 'DX-OK') {
				if(upres.message.length) {
					parseComments(post_elem, upres.message);
				} else {
					// null response
				}
			} else {
				createAlert(upres.message, 'high');
			}
		});
	}, 6000);
	return auto_update_comments
}

/**
	1. Loop through res & create comment from json & insert into commentContainer
	
	2. Remove `.fake` class comments

	3. If the comment is already in `.commentContainer` update text of comment
		to detect edits
*/
function parseComments(post, json) {
	var comments = '';
	for(var comment in json) {
		// Determine if comment is already in `.commentContainer`
		var added = false;
		$(post).find('.comment').each(function() {
			/**
				Ensure we remove `.fake` comments
			*/
			if($(this).hasClass('fake')) {
				$(this).remove();
				return true;
			}
			if($(this).find('.comment_id').html() == json[comment]._id) {
				/**
					If comment is in container, update its text and don't parse
				*/
				added = true;
				var ct = document.createTextNode(json[comment].text).data.replace(/\[\+n\]/g, '<br>').replace('[||||||+special_n||||||]', '[+n]');
				$(this).find('.comment_text').html(ct);
			}
		});
		if(!added) {
			// create comments from json response
			comments += jsonToComment(json[comment]);
		}
	}
	/**
		Append comments
	*/
	$(comments).insertBefore($(post).find('.commentInput'));
	return;
}

function createComment(commentObj, callback) {
	$.ajax({
		type: 'POST',
		url: '/api/post/' + commentObj.id + '/comment/create',
		data: {
			text: encodeURI(commentObj.text)
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

function isValidComment(string) {
	return (string.length >= 2 && string.length <= 1000) ? true : false;
}



