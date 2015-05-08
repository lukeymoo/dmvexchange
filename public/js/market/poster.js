'use strict';

$(function() {
	var photoButton = {
		blur: '/img/camera_blur.png',
		focus: '/img/camera_focus.png',
	};

	var start_scroll_height = parseInt($('#inputContainer #placeholderInput')[0].scrollHeight);

	Market.handlers();

	// set handler images
	$('.photoHandler').each(function() {
		$(this).attr('src', '/img/camera_blur.png');
	});

	// when an image is loaded, validate it
	$(document).on('change', '.photoUpload', function() {
		// validate the image
		var files = $(this)[0].files;
		Market.validateUpload(files, '#' + $(this).attr('id'));
	});

	// submit on send click
	$('#inputContainer #post').on('click', function() {
		// submit
		$('#uploadForm').submit();
	});

	// on submit
	$('#uploadForm').on('submit', function(e) {
		// update description field
		$('#uploadForm #description').val($('#inputContainer textarea').val());
		// validate description
		if($('#uploadForm #description').val().length < 4) {
			e.preventDefault();
			window_message('Post must be at least 4 characters', 'high');
			return false;
		}
		if($('#uploadForm #description').val().length > 2500) {
			e.preventDefault();
			window_message('Post length must not exceed 2,500 characters', 'high');
			return false;
		}
		// update post type
		$('#uploadForm #type').val(Market.postType);

		// ensure sales have at least 1 image
		if($('#uploadForm #type').val() == 'sale') {
			var counter = 0;
			$('.image').each(function() {
				if($(this).val().length > 0) {
					counter ++;
				}
			});
			if(counter == 0) {
				window_message('To post a sale you must have at least 1 image', 'high');
				e.preventDefault();
				return false;
			} else {
				$('.image').each(function() {
					if($(this).val().length == 0) {
						$(this).remove();
					}
				});
			}
		}
	});

	// handler controls
	$('.photoControls').on({
		mouseenter: function() {
			if($(this).find('.photoHandler').attr('data-active') == 'true') {
				$(this).find('.remove').css('opacity', '1');
			}
		},
		mouseleave: function() {
			if($(this).find('.photoHandler').attr('data-active') == 'true') {
				$(this).find('.remove').css('opacity', '0');
			}
		}
	});

	// photoHandler event handler
	$('.photoHandler').on({
		mouseenter: function() {
			// show hover img
			if($(this).attr('data-active') == 'false') {
				$(this).attr('src', '/img/camera_focus.png');
			}
		},
		mouseleave: function() {
			if($(this).attr('data-active') == 'false') {
				$(this).attr('src', '/img/camera_blur.png');
			}
		},
		click: function() {
			$($(this).attr('data-for')).click();
		}
	});

	// Remove image handler
	$(document).on({
		click: function() {
			// get obj using this.data-for and replace it
			// clear input
			var handlerID = '#handler' + $(this).parent().attr('id').replace('controls', '');
			var inputID = '#file' + $(this).parent().attr('id').replace('controls', '');
			var inputField = $(inputID)[0].outerHTML;
			// replace input element
			$(inputID).remove();
			$('#uploadForm').append(inputField);

			// default handler
			$(handlerID).attr('src', '/img/camera_blur.png');
			$(handlerID).attr('data-active', 'false');
			Market.handlers();
		}
	}, '.photoControls .remove');

	// handle post type tab clicks
	$(document).on('click', '.postType', function() {
		// get the type & set the post state to it
		switch($(this).attr('data-type')) {
			case 'sale':
				Market.postType = 'sale';
				break;
			case 'general':
				Market.postType = 'general';
				break;
		}

		// set all tabs to false
		$('.postType').each(function() {
			$(this).attr('data-active', 'false');
		});

		// set clicked tab to true
		$(this).attr('data-active', 'true');

		// give focus back to textarea
		$('#inputContainer textarea').focus();
	});

	// Expand create post on click
	$(document).on('click', '#inputContainer', function(e) {
		if($(e.target).attr('id') == 'cancelButton') {
		} else {
			if(state.LOGGED_IN) {
				Market.expand();
			} else {
				window.location.href = '/signin';
			}
		}
	});

	// Discard post on click
	$(document).on('click', '#inputContainer #cancelButton', function() {
		if(Market.isOpen) {
			Market.discard();
		}
	});

	// Discard post on ESCAPE
	$(document).on('keydown', function(e) {
		if(e.which == 27) {
			if(Market.isOpen) {
				Market.discard();
			}
		}
	});
});
















// expand input area for creation of listing
Market.expand = function() {

	// hide the placeholder camera
	$('#inputContainer #placeholderCamera').hide();

	if($('#inputContainer').hasClass('showInputContainer-reverse')) {
		$('#inputContainer').removeClass('showInputContainer-reverse');
	}
	if(!$('#inputContainer').hasClass('showInputContainer')) {
		$('#inputContainer').addClass('showInputContainer');
	}
	$('#inputContainer textarea').focus();

	this.isOpen = true;
};

Market.discard = function() {

	// show the placeholder camera
	setTimeout(function() {
		$('#inputContainer #placeholderCamera').show();
	}, 475);

	// remove focus from textarea
	$('#inputContainer textarea').blur();

	if($('#inputContainer').hasClass('showInputContainer')) {
		$('#inputContainer').removeClass('showInputContainer');
	}
	if(!$('#inputContainer').hasClass('showInputContainer-reverse')) {
		$('#inputContainer').addClass('showInputContainer-reverse');
	}

	$('#inputContainer textarea').val('');

	// clear all description in form
	$('#uploadForm #description').val('');

	// clear files ( input fields )
	$('.photoUpload').each(function() {
		var DOM = $(this)[0].outerHTML;
		var parent = $(this).parent();
		$(this).remove();
		$(parent).append(DOM);
	});

	var count = 0;
	$('.photoHandler').each(function() {
		// hide em all
		$(this).hide();

		// make em all inactive and default src
		$(this).attr('src', '/img/camera_blur.png');
		$(this).attr('data-active', 'false');
	});

	// remove all image remove buttons
	$(document).find('.remove').remove();

	// clear handlers
	$('.photoHandler').each(function() {
		// if its inactive see if we've already activated 1
		if($(this).attr('data-active') == 'false') {
			if(count == 0) {
				$(this).show();
				count++;
			}
		}
		// if its active - show it
		if($(this).attr('data-active') == 'true') {
			$(this).show();
		}
	});

	this.isOpen = false;
};

Market.handlers = function() {
	// remove all image remove buttons
	$(document).find('.remove').remove();

	// count visible inactive handlers
	// allow only 1 to be visible at a time
	var count = 0;
	$('.photoHandler').each(function() {
		// hide them all
		$(this).hide();
	});

	$('.photoHandler').each(function() {
		// if its inactive see if we've already activated 1
		if($(this).attr('data-active') == 'false') {
			if(count == 0) {
				$(this).show();
				count++;
			}
		}
		// if its active - show it
		if($(this).attr('data-active') == 'true') {
			// give it a remove button
			$(this).parent().prepend("<span class='remove'>&times;</span>");
			$(this).show();
		}
	});
};

Market.validateUpload = function(file, inputID) {

	// did they cancel ?
	if(!$(inputID).val().length) {
		// clear input
		var DOM = $(inputID)[0].outerHTML;
		var parent = $(inputID).parent();
		$(inputID).remove();
		$(parent).append(DOM);
		$('#handler' + inputID.split('file')[1]).attr('src', '/img/camera_blur.png');
		$('#handler' + inputID.split('file')[1]).attr('data-active', 'false');
		this.handlers();
		return false;
	}

	// check extension
	if(!valid_image_extension($(inputID).val())) {
		var DOM = $(inputID)[0].outerHTML;
		var parent = $(inputID).parent();
		$(inputID).remove();
		$(parent).append(DOM);
		window_message('You did not select an image', 'high');
		// clear current handler
		$('#handler' + inputID.split('file')[1]).attr('src', '/img/camera_blur.png');
		$('#handler' + inputID.split('file')[1]).attr('data-active', 'false');
		return false;
	}


	var reader = new FileReader();

	reader.onload = function(e) {
		// place stream into control img
		$('#validator').attr('src', e.target.result);

		var image = new Image();

		image.onload = function() {
			// clear input if smaller than 100 x 100
			if(this.width < 100 || this.height < 100) {
				var DOM = $(inputID)[0].outerHTML;
				var parent = $(inputID).parent();
				$(inputID).remove();
				$(parent).append(DOM);
				$('#handler' + inputID.split('file')[1]).attr('src', '/img/camera_blur.png');
				$('#handler' + inputID.split('file')[1]).attr('data-active', 'false');
				window_message('Image too small', 'high');
				return;
			}
			$('#handler' + inputID.split('file')[1]).attr('data-active', 'true');
			// preview image
			$('#handler' + inputID.split('file')[1]).attr('src', e.target.result);
			// clear validator src
			$('#validator').attr('src', '');
			// update visible handlers
			Market.handlers();
		};

		image.onerror = function() {
			// clear input if error
			var DOM = $(inputID)[0].outerHTML;
			var parent = $(inputID).parent();
			$(inputID).remove();
			$(parent).append(DOM);
			window_message('You did not select an image', 'high');
			$('#handler' + inputID.split('file')[1]).attr('src', '/img/camera_blur.png');
			$('#handler' + inputID.split('file')[1]).attr('data-active', 'false');
			// clear validator src
			$('#validator').attr('src', '');
		};

		image.src = $('#validator').attr('src');
	};

	reader.readAsDataURL(file[0]);
};

function valid_image_extension(filename) {
	var filename_parts = filename.split('.');
	var partToCheck = filename_parts[filename_parts.length - 1];
	
	switch(partToCheck) {
		case 'jpg':
		case 'jpeg':
		case 'png':
		case 'bmp':
		case 'gif':
			return true;
			break;
		default:
			return false;
			break;
	}
}









