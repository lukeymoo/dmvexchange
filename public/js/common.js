'use strict';

$(function() {

	// General click handler
	$(document).on('click', function(e) {
		if(isMenu()) {
			if(!$('#headerMenu').is(e.target)
				&& $('#headerMenu').has(e.target).length === 0
				&& !$('#menuButton').is(e.target)) {
				toggleMenu();
			}
		}
	});

	// MenuButton - on click
	$('#pageHeader #menuButton').on('click', function() {
		toggleMenu();
	});

});

function goodStyle(obj) {
	$(obj).css('border', '2px solid rgb(200, 200, 200)');
}

function badStyle(obj) {
	$(obj).css('border', '2px solid rgb(175, 0, 0)');
	return;
}

function clickHandler() {
	return;
}

function isMenu() {
	return ($('#headerMenu').attr('data-selected') == 'true') ? true : false;
}

function toggleMenu() {
	if($('#headerMenu').attr('data-selected') == 'true') {
		if($('#headerMenu').hasClass('showHeaderMenu')) {
			$('#headerMenu').removeClass('showHeaderMenu');
		}
		if(!$('#headerMenu').hasClass('showHeaderMenu-reverse')) {
			$('#headerMenu').addClass('showHeaderMenu-reverse');
		}
		$('#headerMenu').attr('data-selected', 'false');

	} else if($('#headerMenu').attr('data-selected') == 'false') {

		if($('#headerMenu').hasClass('showHeaderMenu-reverse')) {
			$('#headerMenu').removeClass('showHeaderMenu-reverse');
		}
		if(!$('#headerMenu').hasClass('showHeaderMenu')) {
			$('#headerMenu').addClass('showHeaderMenu');
		}
		$('#headerMenu').attr('data-selected', 'true');
	}
	return;
}

function getParam(sParam) {
	var sPageURL = window.location.search.substring(1);
	var sURLVariables = sPageURL.split('&');
	for(var i = 0; i < sURLVariables.length; i++) {
		var sParameterName = sURLVariables[i].split('=');
		if (sParameterName[0] == sParam) {
			return sParameterName[1];
		}
	}
}

function spawnMessage(string, type) {

	if(type) {
		$('#pageMessage').css('color', 'black');
		$('#pageMessage').css('background-color', 'rgb(0, 175, 200)');
	} else {
		$('#pageMessage').css('color', 'white');
		$('#pageMessage').css('background-color', 'rgb(175, 0, 0)');
	}

	$('#pageMessage').html(string);

	if($('#pageMessage').hasClass('showPageMessage')) {
		$('#pageMessage').removeClass('showPageMessage');
	}

	setTimeout(function() {
		if(!$('#pageMessage').hasClass('showPageMessage')) {
			$('#pageMessage').addClass('showPageMessage');
		}
	}, 50);
	return;
}