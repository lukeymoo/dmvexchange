'use strict';

var ensureIntegrity = function(sessionObj) {
	if(!('LOGGED_IN' in sessionObj)
		|| sessionObj.LOGGED_IN.length == 0
		|| 'boolean' != typeof sessionObj.LOGGED_IN) {
		sessionObj.LOGGED_IN = false;
	}
	isTimedOut(sessionObj);
};

var isLoggedIn = function(sessionObj) {
	ensureIntegrity(sessionObj);
	if(sessionObj.LOGGED_IN) {
		return true;
	} else {
		return false;
	}
};

var isLoggedInQuiet = function(sessionObj) {
	if(sessionObj.LOGGED_IN) {
		if('LAST_ACTIVITY' in sessionObj) {
			if(Date.now() - sessionObj.LAST_ACTIVITY > 3600000) {
				// Log the user out
				sessionObj.LOGGED_IN = false;
				delete sessionObj.USERNAME;
				delete sessionObj.EMAIL;
				delete sessionObj.LAST_ACTIVITY;
			}
		} else {
			sessionObj.LAST_ACTIVITY = Date.now();
		}
	}
	return sessionObj.LOGGED_IN;
};

var isTimedOut = function(sessionObj) {
	if(sessionObj.LOGGED_IN) {
		if('LAST_ACTIVITY' in sessionObj) {
			if(Date.now() - sessionObj.LAST_ACTIVITY > 3600000) {
				// Log the user out
				sessionObj.LOGGED_IN = false;
				delete sessionObj.USERNAME;
				delete sessionObj.EMAIL;
				delete sessionObj.LAST_ACTIVITY;
			} else {
				// Update activity
				sessionObj.LAST_ACTIVITY = Date.now();
			}
		} else {
			sessionObj.LAST_ACTIVITY = Date.now();
		}
	}
};

module.exports = {
	isLoggedIn: isLoggedIn,
	ensureIntegrity: ensureIntegrity,
	isTimedOut: isTimedOut,
	isLoggedInQuiet: isLoggedInQuiet
};