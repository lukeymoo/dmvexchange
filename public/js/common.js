/**
	Top-level script used to concat
	and launch code
*/
'use strict';

requirejs.config({
	baseUrl: '/js',
	paths: {
		jquery: [
			// Google CDN version
			'//ajax.googleapis.com/ajax/libs/jquery/2.1.3/jquery.min',
			'lib/vendor/jquery-1.11.2.min'
		],
		'auth': 'lib/auth/auth',
		'binder': 'lib/events/binder',
		'page': 'lib/page/objects',
		'accountPanel': 'lib/account/accountPanel',
		'md5': 'lib/vendor/md5',
		'config': '/lib/config'
	}
});

require(['auth', 'binder'], function(common, binder) {
	common.getState(function(state) {

		var page = common.getPage();
		
		binder.bindPage(page, state.LOGGED_IN);

		if(page == 'Mail') {

			// pageObj from events/binder.js

			// Data values that will store misc values ( Messages are stored by ID )
			var parsedMessages = []; // What has been recieved
			var selectedMessages = []; // What has been selected

			// Bind select button clicks
		}

	});
});