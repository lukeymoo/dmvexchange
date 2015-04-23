'use strict';


var Market = {
	isOpen: false,
	viewIndex: 0,
	viewType: 'sale',
	postType: 'sale'
};

$(function() {

	var photoButton = {
		blur: '/img/camera_blur.png',
		focus: '/img/camera_focus.png'
	};

	Market.handlers();

	// convert all ISODates in products to more compact format
	$('.post').find('.timestamp').each(function() {
		$(this).html(Market.toDate($(this).html()));
	});

	// set handler images
	$('.photoHandler').each(function() {
		$(this).attr('src', '/img/camera_blur.png');
	});

	Market.hideAll();

	// determine view from URL
	if(getParam('v')) {
		switch(getParam('v')) {
			case 'sales':
				Market.showSell();
				break;
			case 'requests':
				Market.showBuy();
				break;
			default:
				Market.showSell();
				break;
		}
	} else {
		Market.showSell();
	}

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
		if($('#uploadForm #description').val().length < 1 || $('#uploadForm #description').val().length > 360) {
			e.preventDefault();
			spawnMessage('Post must be 1-360 characters', false);
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
				spawnMessage('To post a sale you must have at least 1 image', false);
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

	// photoHandler event handler
	$('.photoHandler').on({
		mouseenter: function() {
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
	})

	// handle view tab clicks
	$(document).on('click', '.viewType', function() {

		switch($(this).attr('data-type')) {
			case '[FOR_SALE]':
				if(Market.viewType == 'general') {
					Market.hideAll();
					Market.showSell();
				}
				Market.viewType = 'sale';
				break;
			case '[REQUESTS]':
				if(Market.viewType == 'sale') {
					Market.hideAll();
					Market.showBuy();
				}
				Market.viewType = 'general';
				break;
		}

		// set all tabs false
		$('.viewType').each(function() {
			$(this).attr('data-active', 'false');
		});

		$(this).attr('data-active', 'true');
	});

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
	});

	// Expand create post on click
	$(document).on('click', '#createPlaceholder', function() {
		if(state.LOGGED_IN) {
			Market.expand();
		} else {
			window.location.href = '/signin';
		}

	});

	// Discard post on click
	$(document).on('click', '#inputContainer #cancelButton', function() {
		Market.discard();
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











Market.handlers = function() {
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
	if(!this.checkExt($(inputID).val())) {
		var DOM = $(inputID)[0].outerHTML;
		var parent = $(inputID).parent();
		$(inputID).remove();
		$(parent).append(DOM);
		spawnMessage('You did not select an image', false);
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
				spawnMessage('Image too small', false);
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
			spawnMessage('You did not select an image', false);
			$('#handler' + inputID.split('file')[1]).attr('src', '/img/camera_blur.png');
			$('#handler' + inputID.split('file')[1]).attr('data-active', 'false');
			// clear validator src
			$('#validator').attr('src', '');
		};

		image.src = $('#validator').attr('src');
	};

	reader.readAsDataURL(file[0]);
};





Market.showBuy = function() {
	$('#feedContainer #buyContainer').show();
	$('#buyPageControls').show();
	$('#feedContainer #tabs #buy').attr('data-active', 'true');
	this.viewType = 'general';
};

Market.showSell = function() {
	$('#feedContainer #sellContainer').show();
	$('#sellPageControls').show();
	$('#feedContainer #tabs #sale').attr('data-active', 'true');
	this.viewType = 'sale';
};

Market.hideAll = function() {
	// hide both views
	$('#feedContainer #buyContainer').hide();
	$('#feedContainer #sellContainer').hide();

	// hide both page controls
	$('#buyPageControls').hide();
	$('#sellPageControls').hide();
};

Market.toDate = function(ISODate) {
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
};


// Retrieve feed for current view
Market.get = function(callback) {
	$.ajax({
		url: '/api/get_feed',
		data: {
			t: this.viewType,
			i: this.viewIndex
		}
	}).done(function(res) {
		callback(res);
	});
};

// expand input area for creation of listing
Market.expand = function() {
	$('#createPlaceholder').hide();
	$('#inputContainer').show();
	$('#inputContainer textarea').focus();

	this.isOpen = true;
};

Market.discard = function() {
	$('#inputContainer').hide();
	$('#inputContainer textarea').val('');
	$('#createPlaceholder').show();

	// clear all description in form
	$('#uploadForm #description').val('');

	// clear files
	$('.image').each(function() {
		var DOM = $(this)[0].outerHTML;
		var parent = $(this).parent();
		$(this).remove();
		$(parent).append(DOM);
	});

	this.isOpen = false;
};

// Helper function
Market.checkExt = function(filename) {

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
};




























