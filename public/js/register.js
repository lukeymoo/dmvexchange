'use strict';

$(function() {
});

function validateName(string) {
	return (/^[A-Za-z]+(([\'-])?[A-Za-z]+$)/.test(string)
		&& string.length >= 2 && string.length < 32) ? true : false;
}

function validateEmail(string) {
	return (/^([a-zA-Z0-9_.+-])+\@(([a-zA-Z0-9-])+\.)+([a-zA-Z0-9]{2,4})+$/.test(string)
		&& string.length < 64) ? true : false;
}

function validateUsername(string) {
	return (/^[A-Za-z0-9_]+$/.test(string)
		&& string.length >= 2
		&& string.length < 16) ? true : false;
}

function validatePassword(string) {
	return (string.length > 2 && string.length < 32) ? true : false;
}