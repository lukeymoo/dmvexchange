'use strict';

var express = require('express');
var router = express.Router();

var formManager = require('../modules/form/form');
var databaseManger = require('../modules/database/database');
var sessionManager = require('../modules/session/session');
var ObjectID = require('mongodb').ObjectID;

var fs = require('fs');

router.get('/', function(req, res, next) {


	// Fetch some posts
	var db = databaseManger.getDB();
	var feed = db.collection('FEED');

	feed.find({
	}).sort({_id: -1}).limit(20).toArray(function(err, feedArr) {
		if(err) {
			console.log('[+] MongoDB error fetching market feed :: ' + err);
			res.send('Server error occurred...<a href="/">Click here to return</a>');
			return;
		}

		if(!feedArr) {
			feedArr = [];
		}

		// add timestamps
		for(var i = 0; i < feedArr.length; i++) {
			feedArr[i].timestamp = toDate(ObjectID(feedArr[i]._id).getTimestamp());
		}

		// render page
		res.render('market', { title: 'Market', USER: req.session, FEED: feedArr});
	});
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
			imageLinks.push({
				large_image: '/cdn/post_images/' + req.files[fieldnames[i]][0].name
			});

		}

	}

	// insert post into database
	var db = databaseManger.getDB();
	var feed = db.collection('FEED');

	var post = {
		creator_username: req.session.USERNAME,
		creator_id: req.session.USER_ID,
		text: req.body.d,
		subscribers: 0,
		visibility: 1,
		comments: 0,
		flags: 0,
		image_links: imageLinks
	};

	// insert into feed
	feed.insert(post);

	// finish up
	res.redirect('/market');
	return;
});

function toDate(timestamp) {
	var id = new Date(timestamp);
	var time = '';

	var period = 'am';

	var monthArr = [];
	monthArr[0] = 'Jan';
	monthArr[1] = 'Feb';
	monthArr[2] = 'Mar';
	monthArr[3] = 'Apr';
	monthArr[4] = 'May';
	monthArr[5] = 'Jun';
	monthArr[6] = 'Jul';
	monthArr[7] = 'Aug';
	monthArr[8] = 'Sept';
	monthArr[9] = 'Oct';
	monthArr[10] = 'Nov';
	monthArr[11] = 'Dec';

	var month = monthArr[id.getMonth()];
	var day = id.getDate();
	var hour = id.getHours();
	if(hour > 12) {
		period = 'pm';
		hour -= 12;
	}
	var minute = id.getMinutes();
	if(minute < 10) {
		minute = '0' + minute;
	}

	time = month + '. ' + day + '  ' + hour + ':' + minute + ' ' + period;

	return time;
};

module.exports = router;