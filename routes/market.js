'use strict';

var express = require('express');
var router = express.Router();

var formManager = require('../modules/form/form');
var databaseManger = require('../modules/database/database');
var sessionManager = require('../modules/session/session');
var ObjectID = require('mongodb').ObjectID;

var fs = require('fs');

router.get('/', function(req, res, next) {
	// load the feed
	res.render('market', { title: 'Market', USER: req.session });
});

router.post('/post', function(req, res, next) {
	// ensure the user is logged in
	if(!sessionManager.isLoggedIn(req.session)) {
		res.redirect('/signin');
		return;
	}

	// ensure we can assign an ID to the post
	if(!('USERNAME' in req.session) || !req.session.USERNAME.length) {
		res.redirect('/signin');
		return;
	}

	// ensure we recieved a description variable
	if(!('d' in req.body) || !req.body.d.length) {
		res.redirect('/market?err=no_description');
		return;
	}

	// validate description
	if(req.body.d.length < 1 || req.body.d.length > 360) {
		res.redirect('/market?err=invalid_description');
		return;
	}

	// check if we received any files
	var fieldnames = [];
	for(var i in req.files) {
		fieldnames.push(req.files[i][0].fieldname);
	}

	// if we recieved files
	var imageLinks = [];
	if(fieldnames.length) {

		// validate file mime-types
		for(var i in fieldnames) {
			
			var mime = req.files[fieldnames[i]][0].mimetype;
			var validMime = true;
			switch(mime) {
				case 'image/png':
				case 'image/jpg': // i think jpg -> image/jpeg so this may be un-needed
				case 'image/jpeg':
				case 'image/bmp':
				case 'image/gif':
					break;
				default:
					validMime = false;
					break;
			}
			if(!validMime) {
				res.redirect('/market?err=invalid_mimetype');
				return;
			}

			// log the filename for assignment to post link field
			imageLinks.push(req.files[fieldnames[i]][0].name);

		}

	}

	// insert post into database
	var db = databaseManger.getDB();
	var feed = db.collection('FEED');

	var post = {
		from: req.session.USERNAME,
		from_id: req.session.USER_ID,
		text: req.body.d,
		links: imageLinks
	};

	// insert into feed
	feed.insert(post);

	// finish up
	res.redirect('/market');
	return;
});

module.exports = router;