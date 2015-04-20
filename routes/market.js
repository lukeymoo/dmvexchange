'use strict';

var express = require('express');
var router = express.Router();

var formManager = require('../modules/form/form');
var dbManager = require('../modules/database/database');
var sessionManager = require('../modules/session/session');
var ObjectID = require('mongodb').ObjectID;

var fs = require('fs');

router.get('/', function(req, res, next) {

	var db = dbManager.getDB();
	var feed = db.collection('FEED');

	var sIndex = 0;
	var bIndex = 0;

	// see if we received a valid sale index
	if(!('si' in req.query) || parseInt(req.query.si) < 0) {
	} else {
		sIndex = parseInt(req.query.si);
	}

	// see if we receieved a valid buy index
	if(!('bi' in req.query) || parseInt(req.query.bi) < 0) {
	} else {
		bIndex = parseInt(req.query.bi);
	}

	// fetch sales
	feed.find({
		post_type: '[SELL_OFFER]'
	}).sort({_id: -1}).skip(sIndex).limit(25).toArray(function(err, saleArr) {
		
		// fetch buyer posts
		feed.find({
			post_type: '[BUY_OFFER]'
		}).sort({_id: -1}).skip(bIndex).limit(25).toArray(function(err, buyArr) {

			// turn ObjectID's into timestamps so browsers can parse dates
			for(var i = 0; i < saleArr.length; i++) {
				saleArr[i].timestamp = ObjectID(saleArr[i]._id).getTimestamp();
			}
			for(var i = 0; i < buyArr.length; i++) {
				buyArr[i].timestamp = ObjectID(buyArr[i]._id).getTimestamp();
			}

			res.render('market', {
				title: 'Market',
				USER: req.session,
				SELL_FEED: saleArr,
				BUY_FEED: buyArr
			});
		});
	});
});


/*
	ERROR CODES
	-------------
	DONE? (X == ADDED TO ERROR CHECKING)
	[ ] no_type					=>		No post type specified (missing `t` field variable in form)
	[ ] invalid_type 			=>		Invalid `t` field (can only be [SALE] || [PURCHASE])
	[ ] no_description			=>		Missing description
	[ ] invalid_description		=>		Description length is not between 6-360
	[ ] sale_no_images			=>		Post type is a sale but it has no images of product...(sketchy)
	[ ] invalid_mimetype		=> 		Uploaded file has a non-image mimetype...(Prob a virus payload)
*/

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

	if(!('USER_ID' in req.session) || !req.session.USER_ID.length) {
		res.redirect('/signin');
		return;
	}

	// Ensure we've recieved a post type
	if(!('t' in req.body) || !req.body.t.length) {
		res.redirect('/market?err=no_type');
		return;
	}

	// Validate the type
	if(req.body.t != '[BUY_OFFER]' && req.body.t != '[SELL_OFFER]') {
		res.redirect('/market?err=invalid_type');
		return;
	}

	// ensure we recieved a description variable
	if(!('d' in req.body) || !req.body.d.length) {
		res.redirect('/market?err=no_description');
		return;
	}

	// validate description
	if(req.body.d.length <= 4 || req.body.d.length >= 361) {
		res.redirect('/market?err=invalid_description');
		return;
	}

	// check if we received any files
	var fieldnames = [];
	for(var i in req.files) {
		fieldnames.push(req.files[i][0].fieldname);
	}

	// Check if we NEEDED ( Sales ) the images
	if(req.body.t == '[SELL_OFFER]') {
		if(fieldnames.length == 0) {
			res.redirect('/market?err=sale_no_images');
			return;
		}
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
				large: '/cdn/post_images/' + req.files[fieldnames[i]][0].name || ''
			});

		}

		var hasImages = false;

		if(imageLinks.length > 0) {
			hasImages = true;
		}

	}

	// insert post into database
	var db = dbManager.getDB();
	var feed = db.collection('FEED');

	var post = {
		creator_username: req.session.USERNAME,
		creator_id: req.session.USER_ID,
		post_type: req.body.t,
		text: req.body.d,
		subscribers: 0,
		visibility: 1,
		comments: 0,
		flags: 0,
		has_images: hasImages,
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