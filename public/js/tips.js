'use strict'

$(function() {

	goodStyle($('#tipsForm textarea'));
	$('#tipsForm textarea').focus();

	$('#tipsContainer button').on('click', function() {
		if(validateInput($('#tipsForm textarea').val())) {
			goodStyle($('#tipsForm textarea'));
			submitTip(function(res) {
				window.location.href = '/';
			});
		} else {
			badStyle($('#tipsForm textarea'));
		}
	});

});

function submitTip(callback) {
	$.ajax({
		url: '/api/savetip',
		data: {
			message: $('#tipsForm textarea').val()
		}
	}).done(function(res) {
		callback(res);
	});
}

function validateInput(string) {
	return (string.length > 1 && string.length < 600) ? true : false;
}