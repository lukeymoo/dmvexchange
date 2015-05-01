'use strict';

var is_shift_pressed = false;

$(function() {

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
		if(key.which == 13) {
			if(is_shift_pressed) {
			} else {
				// prevent default newline
				key.preventDefault();
				// validate comment
				// submit comment to server
				var comment = {
					text: $(this).html()
				};
				if(validate_comment(comment.text)) {
					post_comment(comment, function(res) {
						if(res.status == 'DX-OK') {
							window_message(res.message);
						} else {
							window_message(res.message);
						}
					});
				} else {
					window_message('Comment must be 2-500 characters');
				}
			}
		}
	});

});

function post_comment(commentObj, callback) {
	$.ajax({
		url: '/api/post_comment',
		data: {
			text: commentObj.text
		},
		error: function(err) {
			var res = {
				status: 'DX-FAILED',
				message: 'Error: Request to post comment failed'
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



