'use strict';

define(['jquery'], function($) {
	var module = {};

	module = {
		changePassword: function(op, np, npa, callback) {
			$.ajax({
				url: '/api/changePassword',
				data: {
					oldP: op,
					newP: np,
					newPA: npa
				}
			}).done(function(data) {
				callback(data);
			});
		}
	};

	return module;
});