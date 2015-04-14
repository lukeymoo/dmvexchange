/**
	Contains methods for message viewer
	Searching message, tagging words within message, escaping message etc..
*/

'use strict';

var Viewer = {};

Viewer.show = function(id) {
	if(!$('#viewerContainer').hasClass('showViewer')) {
		$('#viewerContainer').addClass('showViewer');
	}
};

Viewer.hide = function() {
};

$(function() {

	// Show message on click
	$(document).on('click', '.message', function() {
		Viewer.show($(this).find('#messageid').html());
	});

});