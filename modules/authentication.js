'use strict';

var sessionManager = require('./session/session');

// 2 second cooldown for each comment
var COMMENT_COOLDOWN = 2 * 1000;

var modules = {
	/**	DOES NOT CHECK FOR EMAIL IN CASE USER ACTIVATION WAS REJECTED	**/
	/**
		And they are in fact LOGGED_IN
		this function ensures we can resolve the users ID
		Responses are JSON objects
	*/
	json_is_authenticated: function(req, res) {
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

	},
	// Determines if a user has reached comment limit/resets it if time
	// block has passed
	update_comment_rules: function(req, res) {
		if('COMMENT_COOLDOWN_START' in req.session) {
			if(Date.now() - req.session.COMMENT_COOLDOWN_START > COMMENT_COOLDOWN) {
				req.session.CAN_COMMENT = true;
			} else {
				req.session.CAN_COMMENT = false;
			}
		} else {
			req.session.CAN_COMMENT = true;
		}
		return req.session.CAN_COMMENT;
	},
	// Ensure the user hasn't already hit comment limit
	// and that cooldown period is over
	can_comment: function(req, res) {
		this.update_comment_rules(req, res);
		return req.session.CAN_COMMENT;
	},
	// update comment limiters/counters
	inc_comment: function(req) {
		req.session.COMMENT_COOLDOWN_START = Date.now();
		req.session.CAN_COMMENT = false;
		return;
	}
};

module.exports = modules;