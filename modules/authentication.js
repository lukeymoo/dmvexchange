'use strict';

var sessionManager = require('./session/session');

var modules = {
	/**	DOES NOT CHECK FOR EMAIL IN CASE USER ACTIVATION WAS REJECTED	**/
	/**
		And they are in fact LOGGED_IN
		this function ensures we can resolve the users ID
		Responses are JSON objects
	*/
	json_is_authenticated: function(req) {
		// is the user logged in
		if(!sessionManager.isLoggedIn(req.session)) {
			res.send({status: 'DX-REJECTED', message: 'Must be logged in'});
			return;
		}
		// Ensure we can resolve an ID
		if(!('USERNAME' in req.session) || !req.session.USERNAME.length) {
			res.send({status: 'DX-REJECTED', message: 'Could not resole ID please try re-logging in'});
			return;
		}
		if(!('USER_ID' in req.session) || !req.session.USER_ID.length) {
			res.send({status: 'DX-REJECTED', message: 'Could not resole ID please try re-logging in'});
			return;
		}

	}
};

module.exports = modules;