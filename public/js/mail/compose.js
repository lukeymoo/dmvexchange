/**
	Contains methods that allow the user to
	interact with the compose message form
*/

'use strict';

// Contains our methods for Message manipulation
var Messenger = {
	isOpen: false,
	ctrlKey: false,
	allSelected: false, 
	messageRecipients: [],
	messageSubject: '',
	messageText: ''
};

Messenger.send = function(callback) {
	var status = true;

	// Ensure theres at least 1 valid recipient and none are invalid
	if(this.messageRecipients.length < 1) {
		status = false;
	} else {
		for(var name in this.messageRecipients) {
			if(!this.validateRecipient(this.messageRecipients[name])) {
				status = false;
			}
		}
	}

	this.messageSubject = $('#composeForm #messageSubject').val();
	this.messageText = $('#composeForm #messageText').val();

	// Ensure subject is valid
	status = (this.validateSubject()) ?
		status : false;

	// Ensure Message text is valid
	status = (this.validateMessage()) ?
		status : false;

	// Send if good
	if(status) {
		$.ajax({
			url: '/api/sendmail',
			data: {
				s: this.messageSubject,
				r: this.messageRecipients,
				m: this.messageText
			}
		}).done(function(res) {
			callback(res);
		});
	}
};

Messenger.toggleForm = function() {
	if(this.isOpen) {
		this.hideForm();
	} else {
		this.showForm();
	}
};

Messenger.showForm = function() {
	$('#composeForm').css('display', 'inline-block');
	$('#composeForm #messageTo').focus();
	this.isOpen = true;
};

Messenger.hideForm = function() {
	$('#composeForm').css('display', 'none');
	this.isOpen = false;
};

Messenger.addRecipient = function() {
	// Add input to recipients collection
	this.messageRecipients.push(this.getRecipientInput());

	// Parse DOM with appropriate style
	var DOM = this.parseRecipientInput(this.getRecipientInput());

	// Append to chips container
	$('#chipsContainer').append(DOM);

	// Resize Chips Container
	this.resizeChips();

	// Clear input field so we can prepare for new chip
	$('#messageTo').val('');
};

Messenger.removeRecipient = function() {
	// Remove last recipient in array
	this.messageRecipients.pop();

	// Remove last chipContainer child span
	$('#chipsContainer span').last().remove();

	// Resize Chips Container
	this.resizeChips();
};

Messenger.clearRecipients = function() {
	this.messageRecipients = [];

	$('#chipsContainer').empty();
};

// Must be 2-16 characters
Messenger.validateRecipient = function(string) {
	return (/^[A-Za-z0-9_]+$/.test(string)
		&& string.length > 1
		&& string.length < 17) ? true : false;
};

// Returns input and trims whitespace
Messenger.getRecipientInput = function() {
	return $('#messageTo').val().trim().toLowerCase();
};

Messenger.parseRecipientInput = function(string) {
	return (this.validateRecipient(string)) ?
		'<span class="goodChip">' + string + '</span>' :
		'<span class="badChip">' + string + '</span>';
};

Messenger.selectAllRecipients = function() {

	// Select all chips
	$('#chipsContainer').find('span').each(function() {
		if(!$(this).hasClass('selectedChip')) {
			$(this).addClass('selectedChip');
		}
	});

	// Remove input fields focus
	$('#messageTo').blur();

	// allSelected true
	this.allSelected = true;
};

Messenger.deselectAllRecipients = function() {
	// Remove selected chip styling
	$('#chipsContainer').find('span').each(function() {
		if($(this).hasClass('selectedChip')) {
			$(this).removeClass('selectedChip');
		}
	});

	// Set variable
	this.allSelected = false;
};

Messenger.validateSubject = function() {
	var string = this.messageSubject;
	return (string.length >= 0 && string.length < 32) ? 
		true : false;
};

Messenger.validateMessage = function() {
	var string = this.messageText;
	return (string.length > 1 && string.length < 360) ?
		true : false;
};

Messenger.goodStyle = function(obj) {
	$(obj).css('border-top', '1px solid rgba(90, 90, 90, 0.25)');
	$(obj).css('border-bottom', '1px solid rgba(90, 90, 90, 0.25)');
};

Messenger.badStyle = function(obj) {
	$(obj).css('border-top', '1px solid rgb(175, 0, 0)');
	$(obj).css('border-bottom', '1px solid rgb(175, 0, 0)');
};

// Set recipients to display block if too wide
Messenger.resizeChips = function() {
	if($('#chipsContainer').width() >= 335) {
		$('#chipsContainer').css('float', 'initial');
		$('#chipsContainer').css('display', 'block');
	} else {
		$('#chipsContainer').css('float', 'left');
		$('#chipsContainer').css('display', 'inline-block');
	}
};

Messenger.discard = function() {
	this.hideForm();
	this.clearRecipients();
	$('#messageSubject').val('');
	$('#messageText').val('');
};






$(function() {


	$('#composeForm #header').on('click', function() {
		Messenger.hideForm();
	});

	// Give focus to input on chipsClick
	$('#chipsContainer').on('click', function() {
		$('#messageTo').focus();
	});

	// Document -- Tab, Backspace, CTRL
	$(document).on('keyup', function(e) {
		if(Messenger.allSelected && e.which == 9) {
			e.preventDefault();

			// Give focus to messageTo
			$('#messageTo').focus();
		}

		// Control
		if(e.which == 17) {
			Messenger.ctrlKey = false;
		}
	});

	// Document -- Backspace
	$(document).on('keydown', function(e) {
		// Backspace
		if(Messenger.allSelected && e.which == 8) {
			e.preventDefault();

			Messenger.clearRecipients();

			// Give focus back to messageTo
			$('#messageTo').focus();
		}

		// Control key
		if(e.which == 17) {
			Messenger.ctrlKey = true;
		}
	});
	

	// Handle keydown within Recipients field
	$(document).on('keydown', '#composeForm #messageTo', function(e) {
		// Tab
		if(e.which == 9) {
			if($(this).val().length > 0) {
				Messenger.addRecipient();
			}
		}

		// Backspace -- Alone
		if(!Messenger.ctrlKey && e.which == 8) {
			if($(this).val().length == 0) {
				Messenger.removeRecipient();
			}
		}

		// CTRL + Backspace
		if(Messenger.ctrlKey && e.which == 8) {
			if($(this).val().length > 0) {
				e.preventDefault();
				$('#messageTo').val('');
			} else {
				Messenger.removeRecipient();
			}
		}

		// A key -- Select all
		if(Messenger.ctrlKey && e.which == 65) {
			// If input is empty
			if($(this).val().length == 0) {
				e.preventDefault();
				// Select all
				Messenger.selectAllRecipients();
			}
		}
	});

	// Handle Keyup within Recipients field
	$(document).on('keyup', '#composeForm #messageTo', function(e) {
		// Enter, Space, Tab
		if(e.which == 13 || e.which == 32) {
			if($(this).val().length > 0) {
				Messenger.addRecipient();
			}
		}
	});

	// When messageTo recieves focus
	$('#messageTo').focus(function() {
		// Remove select all
		Messenger.deselectAllRecipients();
	});

	// Validate message subject on blur
	$('#messageSubject').on('blur', function() {
		// Set the subject variable
		Messenger.messageSubject = $(this).val();

		if(Messenger.validateSubject()) {
			Messenger.goodStyle($(this));
		} else {
			Messenger.badStyle($(this));
		}
	});

	$('#composeForm #sendMessage').on('click', function() {
		Messenger.send(function() {
			// Close the form
			Messenger.discard();

			// Update view
			Main.get();
		});
	});

	$('#composeForm #cancelMessage').on('click', function() {
		Messenger.discard();
	});

});
