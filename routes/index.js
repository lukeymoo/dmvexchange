'use strict';

var express = require('express');
var router = express.Router();

var formManager = require('../modules/form/form');
var databaseManager = require('../modules/database/database');
var sessionManager = require('../modules/session/session');

/**
	RESTRICT ACCESS TO THE FOLLOWING ROUTES ( Must be logged in )
	1. account
	2. account/mail
	3. bugreport
*/

/* GET home page. */
router.get('/', function(req, res, next) {
	sessionManager.isLoggedIn(req.session);
	res.render('index', { title: 'Home', USER: req.session });
});

/** GET Sign in page */
router.get('/signin', function(req, res, next) {
	// Redirect already authenticated users
	if(sessionManager.isLoggedIn(req.session)) {
		res.redirect('/');
		return;
	}
	res.render('index', { title: 'Sign in', USER: req.session });
});

/** GET Sign up page */
router.get('/signup', function(req, res, next) {
	// Redirect already authenticated users
	if(sessionManager.isLoggedIn(req.session)) {
		res.redirect('/');
		return;
	}
	res.render('index', { title: 'Sign up', USER: req.session });
});

/** POST Process login form **/
router.post('/auth', function(req, res, next) {
	// Redirect already authenticated users
	if(sessionManager.isLoggedIn(req.session)) {
		res.redirect('/');
		return;
	}

	var form = req.body;

	if(!formManager.isLoginProper(form)) {
		res.redirect('/signin?err=invalid_form');
		return;
	}
	/**
		Validate the username && password
	*/
	if(!formManager.validateUsername(req.body.u)) {
		if(!formManager.validateEmail(req.body.u)) {
			res.redirect('/signin?err=u_invalid')
			return;
		}
	}
	if(!formManager.validatePassword(req.body.p)) {
		res.redirect('/signin?err=p_invalid&u=' + req.body.u);
		return;
	}
	/**
		Check for username/email + password combo in database
	*/
	var database = databaseManager.getDB();
	var userCol = database.collection('USERS');

	var user = {
		username: req.body.u,
		email: req.body.u,
		password: req.body.p
	};

	databaseManager.findByLogin(user, function(err, doc) {
		if(err) {
			console.log('[-] MongoDB Error while authenticating :: ' + err);
			res.send('Error occurred while authenticating, <a href="/signin">please try again.</a>');
			return;
		}
		// If we find a match, set session variables accordingly
		if(doc) {
			req.session.LOGGED_IN = true;
			req.session.USERNAME = doc.username;
			req.session.EMAIL = doc.email;
			req.session.LAST_ACTIVITY = Date.now();
			res.redirect('/');
			return;
		} else {
			res.redirect('/signin?err=invalid_login&u=' + req.body.u);
			return;
		}
	});
});

/** POST Handle registration **/
router.post('/process', function(req, res, next) {
	// Redirect already authenticated users
	if(sessionManager.isLoggedIn(req.session)) {
		res.redirect('/');
		return;
	}

	var form = req.body;

	// ensure we got all the elements of a register form
	if(!formManager.isRegisterProper(form)) {
		res.redirect('/signup?err=invalid_form');
		return;
	}

	// Lowercase form ( Excluding passwords )
	req.body.f = req.body.f.toLowerCase();
	req.body.l = req.body.l.toLowerCase();
	req.body.e = req.body.e.toLowerCase();
	req.body.ea = req.body.ea.toLowerCase();
	req.body.u = req.body.u.toLowerCase();

	// Validate names
	var formElem = {};

	formElem.F = formManager.validateName(req.body.f);
	formElem.L = formManager.validateName(req.body.l);
	formElem.E = formManager.validateEmail(req.body.e);
	formElem.EA = formManager.validateEmail(req.body.ea);
	// Did emails match ?
	if(req.body.e.toLowerCase() != req.body.ea.toLowerCase()) {
		formElem.EM = false;
	}
	formElem.U = formManager.validateUsername(req.body.u);
	formElem.P = formManager.validatePassword(req.body.p);
	formElem.PA = formManager.validatePassword(req.body.pa);
	// Did passwords match ?
	if(req.body.p != req.body.pa) {
		formElem.PM = false;
	}

	var err = '';
	var query = '';
	for(var elem in formElem) {
		if(formElem[elem]) {
			if(elem != 'P' && elem != 'PA' && elem != 'EM' && elem != 'EA' && elem != 'PM') {
				query += '&' + elem.toLowerCase() + '=' + req.body[elem.toLowerCase()];
			}
		}
		if(!formElem[elem]) {
			err += elem + '|';
		}
	}

	if(err) {
		err = err.substring(0, err.length - 1);
		res.redirect('/signup?err=' + err + query);
		return;
	}

	databaseManager.doesUserExist(req.body.u, req.body.e, function(usrUsed, emailUsed) {
		if(usrUsed || emailUsed) {
			var err = '';
			if(usrUsed) {
				err += 'UIN|';
			}
			if(emailUsed) {
				err += 'EIN|';
			}
			err = err.substring(0, err.length - 1);
			res.redirect('/signup?err=' + err + query);
			return;
		} else {
			// Create account
			var user = {
				f: req.body.f,
				l: req.body.l,
				u: req.body.u,
				e: req.body.e,
				p: req.body.p,
			};
			databaseManager.saveAccount(user, function(err, doc) {
				if(err) {
					console.log('[-] MongoDB Error while creating account :: ' + err);
					res.send('Error occurred while creating account, <a href="/signup">please try again.</a>');
					return;
				}

				if(doc) {
					// Email the user activation code
					// Set session values and redirect
					req.session.LOGGED_IN = true;
					req.session.USERNAME = user.u;
					req.session.EMAIL = user.e;
					req.session.LAST_ACTIVITY = Date.now();
					res.redirect('/');
					return;
				} else {
					console.log('[-] MongoDB Error write failed :: ' + err);
					res.send('Error occurred while creating account, <a href="/signup">please try again.</a>');
					return;
				}

			});
		}
	});

});

/** GET forgot **/
router.get('/forgot', function(req, res, next) {
	res.send('This will be forgot password page');
});

/** GET Logout request **/
router.get('/logout', function(req, res, next) {
	if(!sessionManager.isLoggedIn(req.session)) {
		res.redirect('/');
		return;
	}
	req.session.LOGGED_IN = false;
	delete req.session.USERNAME;
	delete req.session.EMAIL;
	delete req.session.LAST_ACTIVITY;
	res.redirect('/');
});

module.exports = router;