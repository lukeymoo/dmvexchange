'use strict';

var express = require('express');
var router = express.Router();

var formManager = require('../modules/form/form');
var databaseManger = require('../modules/database/database');
var sessionManager = require('../modules/session/session');
var ObjectID = require('mongodb').ObjectID;

var fs = require('fs');

router.get('/', function(req, res, next) {
	res.render('market', { title: 'Market', USER: req.session });
});

router.post('/post', function(req, res, next) {
	if(!sessionManager.isLoggedIn(req.session)) {
		res.redirect('/signin');
		return;
	}

	var text = '';

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
		text += 'key: ' + i + '\n';
		fieldnames.push(req.files[i][0].fieldname);
	}

	// if we recieved files
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

		}

	}

	// insert post into database
	var db = databaseManger.getDB();
	var feed = db.collection('FEED');


	// temp function
	for(var i in fieldnames) {
		fs.unlink(req.files[fieldnames[i]][0].path, function(){});
	}

	// Validate description
	text += '-- ' + req.body.d;

	res.writeHead({'Content-Type': 'text/plain'});
	res.end(text);
});

module.exports = router;