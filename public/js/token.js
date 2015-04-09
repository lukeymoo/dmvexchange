'use strict';

$(function() {
	$('#overlayMessage #confirmLink').on('click', function() {
		confirmCancel(function(res) {
			if(res.status == 'DX-OK') {
				alert('Account deleted');
				window.location.href = '/logout';
			} else {
				alert(res.message);
				window.location.href='/logout';
			}
		});
	});
});

function confirmCancel(callback) {

	$.ajax({
		url: '/api/confirm_account_canceled',
	}).done(function(res) {
		callback(res);
	});

	return;
}