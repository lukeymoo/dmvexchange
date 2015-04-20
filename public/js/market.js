'use strict';


var Market = {
	isOpen: false,
	images: [4],
	viewIndex: 0,
	viewType: '[SELL_OFFER]',
	postType: '[SELL_OFFER]'
};

$(function() {

	var photoButton = {
		blur: '/img/camera_blur.png',
		focus: '/img/camera_focus.png'
	};

	$('#handler1').attr('data-available', 'true');

	// convert all ISODates in products to more compact format
	$('.post').find('.timestamp').each(function() {
		$(this).html(Market.toDate($(this).html()));
	});

	/*
	// Grab feed
	Market.get(function(res) {
		if(res.status == 'DX-OK') {
			// Parse returned posts and update index
			for(var post in res.message) {
				$('#feedContainer').append('POST');
			}
		} else {
			spawnMessage(res.message, false);
		}
	});
	*/

	// handle post type tab clicks
	$(document).on('click', '.postType', function() {
		// get the type & set the post state to it
		switch($(this).attr('data-type')) {
			case '[SELL_OFFER]':
				Market.postType = '[SELL_OFFER]';
				break;
			case '[BUY_OFFER]':
				Market.postType = '[BUY_OFFER]';
				break;
		}

		// set all tabs to false
		$('.postType').each(function() {
			$(this).attr('data-active', 'false');
		});

		// set clicked tab to true
		$(this).attr('data-active', 'true');
	});

	// Send post data to the server for validation & postage
	$('#uploadForm').on('submit', function(e) {

		// Update form type
		$('#uploadForm #type').val(Market.postType);

		// Ensure they've entered some text
		if($('#inputContainer textarea').val().length <= 4
			|| $('#inputContainer textarea').val().length >= 361) {
			e.preventDefault();
			spawnMessage('Message text must be 6-360 characters', false);
			return false;
		}

		// Ensure [SALES] have at least 1 image file selected
		if(Market.postType == '[SELL_OFFER]') {
			// loop through market images ensure at least 1 is non false
			var amt = 0;
			for(var i in Market.images) {
				if(Market.images[i]) {
					amt++;
				}
			}
			if(amt == 0) {
				spawnMessage('Sales must have at least 1 image', false);
				return false;
			}
		}

		// Set inputcontainer textarea to hidden input field
		$('#uploadForm #description').val($('#inputContainer textarea').val());

		// Remove empty input fields
		$('#uploadForm').find('input[type=file]').each(function() {
			if(!$(this).val().length) {
				$(this).remove();
			}
		});
	});

	// Allow use of send button
	$('#inputContainer #post').on('click', function() {
		$('#uploadForm').submit();
	});

	// Events for camera buttons
	$(document).on({
		mouseenter: function() {
			if($(this).attr('data-image') == 'false') {
				$(this).find('img').attr('src', photoButton.focus);
			}
		},
		mouseleave: function() {
			if($(this).attr('data-image') == 'false') {
				$(this).find('img').attr('src', photoButton.blur);
			}
		},
		click: function(e) {
			// Ensure user didnt click the X button
			if(e.target.nodeName == 'DIV') {
				switch($(e.target).attr('data-for')) {
					case 'handler1':
						Market.removeImage('file1');
						break;
					case 'handler2':
						Market.removeImage('file2');
						break;
					case 'handler3':
						Market.removeImage('file3');
						break;
					case 'handler4':
						Market.removeImage('file4');
						break;
				}
				return;
			}
			// Click corresponding file #
			switch($(this).attr('id')) {
				case 'handler1':
					$('#file1').click(); // go to INPUT HANDLER
					break;
				case 'handler2':
					$('#file2').click();
					break;
				case 'handler3':
					$('#file3').click();
					break;
				case 'handler4':
					$('#file4').click();
					break;
			}
		}
	}, '.addPhoto');

	// Handle file selection -- INPUT HANDLER
	$(document).on('change', '.photoUpload', function() {
		// determine which file input it was
		Market.validateFile($(this).attr('id'));
	});

	// initialize images to false
	for(var i = 0; i < 4; i++) {
		Market.images[i] = false;
	}

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

// Discard and collapse input
Market.discard = function() {

	// reset post type
	$('#postType #sale').attr('data-active', 'true');
	$('#postType #purchase').attr('data-active', 'false');
	this.postType = '[SELL_OFFER]';

	var id = 1; // holds i in for which corresponds to handler || file id number

	// Clear textarea
	$('#inputContainer textarea').val('');

	// reset image variables
	this.images[0] = false;
	this.images[1] = false;
	this.images[2] = false;
	this.images[3] = false;

	for(var i = 1; i < 5; i++) {
		id = i;

		// restore handlers
		$('#handler' + String(id)).find('img').attr('src', '');
		// hide remove button
		$('#handler' + String(id)).find('#remove').hide();
		// restore default handler & image blur
		$('#handler' + String(id)).attr('data-image', 'false');
		$('#handler' + String(id)).find('img').attr('src', '/img/camera_blur.png');

		var isAvail = (i == 1) ? 'true' : 'false';

		// remove and restore handler1 to allow other images to slide down
		var temp = $('#handler' + String(id)).html();
		var DOM = "<div id='handler" + String(id) + "' class='addPhoto' data-available='" + isAvail + "' data-image='false'></div>";
		$('#handler' + String(id)).remove();
		$('#controls').append(DOM);
		$('#handler' + String(id)).html(temp);

		// restore file inputs
		$('#file' + String(id)).remove();
		var DOM = "<input type='file' class='photoUpload' name='photo' id='file" + String(id) + "' data-available='true'>";
		$('#uploadForm').append(DOM);
	}

	// replace inputcontainer with placeholder
	$('#inputContainer').hide();
	$('#createPlaceholder').show();

	this.isOpen = false;
};

Market.validateFile = function(inputID) {

	var image;
	var fname;

	switch(inputID) {

		case 'file1':
			// Grab uploaded file
			image = $('#file1').prop('files');
			fname = $('#file1').val().toLowerCase();
			// Validate extension
			if(!this.checkExt(fname)) {
				spawnMessage('Selected file must be image', false);
				return;
			}
			// Validate file stream data
			var reader = new FileReader();

			// execute this when finished reading file
			reader.onload = function(e) {

				// grab first 4 bytes to validate data type
				var good = false;
				var blob = reader.result.slice(1, 4).toLowerCase();
				switch(blob) {
					case 'png':
					case 'gif':
					case 'bmp':
					case 'jpeg':
					case 'jpg':
						good = true;
						break;
					default:
						break;
				}

				// did it pass test ? if not ensure image data is set to false
				if(!good) {
					spawnMessage('Selected file must be an image', false);
					Market.images[0] = false;
					return;
				}

				// if it passed base64 encode stream and parse for img element
				var data = 'data:image/*;base64,' + btoa(reader.result);

				// Store the data in variable images[0] <-- first image data var
				Market.images[0] = data;

				// call show image
				// iterates through all image data vars
				// displaying any non-false values
				Market.showImages();

			};

			// read the file as binary string
			reader.readAsBinaryString(image[0]);
			break;

		case 'file2':

			// Grab uploaded file
			image = $('#file2').prop('files');
			fname = $('#file2').val().toLowerCase();
			// Validate extension
			if(!this.checkExt(fname)) {
				spawnMessage('Selected file must be image', false);
				return;
			}
			// Validate file stream data
			var reader = new FileReader();

			// execute this when finished reading file
			reader.onload = function(e) {

				// grab first 4 bytes to validate data type
				var good = false;
				var blob = reader.result.slice(1, 4).toLowerCase();
				switch(blob) {
					case 'png':
					case 'gif':
					case 'bmp':
					case 'jpeg':
					case 'jpg':
						good = true;
						break;
					default:
						break;
				}

				// did it pass test ?
				if(!good) {
					spawnMessage('Selected file must be an image', false);
					Market.images[1] = false;
					return;
				}

				// if it passed base64 encode stream and parse for img element
				var data = 'data:image/*;base64,' + btoa(reader.result);

				// Store the data in variable images[0] <-- first image data var
				Market.images[1] = data;

				// call show image
				// iterates through all image data vars
				// displaying any non-false values
				Market.showImages();
			};

			// read the file as binary string
			reader.readAsBinaryString(image[0]);
			break;

		case 'file3':

			// Grab uploaded file
			image = $('#file3').prop('files');
			fname = $('#file3').val().toLowerCase();
			// Validate extension
			if(!this.checkExt(fname)) {
				spawnMessage('Selected file must be image', false);
				return;
			}
			// Validate file stream data
			var reader = new FileReader();

			// execute this when finished reading file
			reader.onload = function(e) {

				// grab first 4 bytes to validate data type
				var good = false;
				var blob = reader.result.slice(1, 4).toLowerCase();
				switch(blob) {
					case 'png':
					case 'gif':
					case 'bmp':
					case 'jpeg':
					case 'jpg':
						good = true;
						break;
					default:
						break;
				}

				// did it pass test ?
				if(!good) {
					spawnMessage('Selected file must be an image', false);
					Market.images[2] = false;
					return;
				}

				// if it passed base64 encode stream and parse for img element
				var data = 'data:image/*;base64,' + btoa(reader.result);

				// Store the data in variable images[0] <-- first image data var
				Market.images[2] = data;

				// call show image
				// iterates through all image data vars
				// displaying any non-false values
				Market.showImages();
			};

			// read the file as binary string
			reader.readAsBinaryString(image[0]);
			break;

		case 'file4':

			// Grab uploaded file
			image = $('#file4').prop('files');
			fname = $('#file4').val().toLowerCase();
			// Validate extension
			if(!this.checkExt(fname)) {
				spawnMessage('Selected file must be image', false);
				return;
			}
			// Validate file stream data
			var reader = new FileReader();

			// execute this when finished reading file
			reader.onload = function(e) {

				// grab first 4 bytes to validate data type
				var good = false;
				var blob = reader.result.slice(1, 4).toLowerCase();
				switch(blob) {
					case 'png':
					case 'gif':
					case 'bmp':
					case 'jpeg':
					case 'jpg':
						good = true;
						break;
					default:
						break;
				}

				// did it pass test ?
				if(!good) {
					spawnMessage('Selected file must be an image', false);
					Market.images[3] = false;
					return;
				}

				// if it passed base64 encode stream and parse for img element
				var data = 'data:image/*;base64,' + btoa(reader.result);

				// Store the data in variable images[0] <-- first image data var
				Market.images[3] = data;

				// call show image
				// iterates through all image data vars
				// displaying any non-false values
				Market.showImages();
			};

			// read the file as binary string
			reader.readAsBinaryString(image[0]);
			break;
	
	}

};

Market.showImages = function() {
	for(var i = 0; i < 4; i++) {
		if(this.images[i]) {
			switch(i) {
				case 0:
					// Disable default handler for image change
					$('#handler1').attr('data-image', 'true');
					// Display image 1
					$('#handler1').find('img').attr('src', this.images[i]);
					// display remove button
					$('#handler1').find('#remove').show();
					// make next handler avaiable
					$('#handler2').attr('data-available', 'true');
					break;
				case 1:
					$('#handler2').attr('data-image', 'true');
					$('#handler2').find('img').attr('src', this.images[i]);
					// display remove button
					$('#handler2').find('#remove').show();
					$('#handler3').attr('data-available', 'true');
					break;
				case 2:
					$('#handler3').attr('data-image', 'true');
					$('#handler3').find('img').attr('src', this.images[i]);
					// display remove button
					$('#handler3').find('#remove').show();
					$('#handler4').attr('data-available', 'true');
					break;
				case 3:
					$('#handler4').attr('data-image', 'true');
					$('#handler4').find('img').attr('src', this.images[i]);
					// display remove button
					$('#handler4').find('#remove').show();
					break;
			}
		} else {
			// if bad image data
			// reset image field
		}
	}
};

Market.removeImage = function(inputID) {
	switch(inputID) {
		case 'file1':
			// remove data in variable
			Market.images[0] = false;
			// remove and restore input field to clear input data
			$('#file1').remove();
			var DOM = "<input type='file' class='photoUpload' name='photo' id='file1' data-available='true'>";
			$('#photoForm').append(DOM);
			// clear src attr
			$('#handler1').find('img').attr('src', '');
			// hide remove button
			$('#handler1').find('#remove').hide();
			// restore default handler & image blur
			$('#handler1').attr('data-image', 'false');
			$('#handler1').find('img').attr('src', '/img/camera_blur.png');

			// remove and restore handler1 to allow other images to slide down
			var temp = $('#handler1').html();
			var DOM = "<div id='handler1' class='addPhoto' data-available='true' data-image='false'></div>";
			$('#handler1').remove();
			$('#controls').append(DOM);
			$('#handler1').html(temp);
			break;
		case 'file2':
			// remove data in variable
			Market.images[1] = false;
			// remove and restore input field to clear input data
			$('#file2').remove();
			var DOM = "<input type='file' class='photoUpload' name='photo' id='file2' data-available='true'>";
			$('#photoForm').append(DOM);
			// clear src attr
			$('#handler2').find('img').attr('src', '');
			// hide remove button
			$('#handler2').find('#remove').hide();
			// restore default handler & image blur
			$('#handler2').attr('data-image', 'false');
			$('#handler2').find('img').attr('src', '/img/camera_blur.png');

			// remove and restore handler to allow others to slide down
			var temp = $('#handler2').html();
			var DOM = "<div id='handler2' class='addPhoto' data-available='true' data-image='false'></div>";
			$('#handler2').remove();
			$('#controls').append(DOM);
			$('#handler2').html(temp);
			break;
		case 'file3':
			Market.images[2] = false;
			$('#file3').remove();
			var DOM = "<input type='file' class='photoUpload' name='photo' id='file3' data-available='true'>";
			$('#photoForm').append(DOM);
			$('#handler3').find('img').attr('src', '');
			$('#handler3').find('#remove').hide();
			$('#handler3').attr('data-image', 'false');
			$('#handler3').find('img').attr('src', '/img/camera_blur.png');

			// remove and restore handler to allow others to slide down
			var temp = $('#handler3').html();
			var DOM = "<div id='handler3' class='addPhoto' data-available='true' data-image='false'></div>";
			$('#handler3').remove();
			$('#controls').append(DOM);
			$('#handler3').html(temp);
			break;
		case 'file4':
			Market.images[3] = false;
			$('#file4').remove();
			var DOM = "<input type='file' class='photoUpload' name='photo' id='file4' data-available='true'>";
			$('#photoForm').append(DOM);
			$('#handler4').find('img').attr('src', '');
			$('#handler4').find('#remove').hide();
			$('#handler4').attr('data-image', 'false');
			$('#handler4').find('img').attr('src', '/img/camera_blur.png');

			// remove and restore handler to allow others to slide down
			var temp = $('#handler4').html();
			var DOM = "<div id='handler4' class='addPhoto' data-available='true' data-image='false'></div>";
			$('#handler4').remove();
			$('#controls').append(DOM);
			$('#handler4').html(temp);
			break;
	}
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




























