'use strict';

define(['md5'], function(crypto) {
	return {
		md5: function(string) {
			return crypto.md5(string);
		}
	};
});