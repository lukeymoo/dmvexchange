'use strict';


var Market = {
	isOpen: false
};

// Ajax data to server for creation of post
Market.create = function() {
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
	$('#inputContainer').hide();
	$('#createPlaceholder').show();

	this.isOpen = false;
};


$(function() {

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