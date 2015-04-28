'use strict';

var express = require('express');
var router = express.Router();

var formManager = require('../modules/form/form');
var dbManager = require('../modules/database/database');
var sessionManager = require('../modules/session/session');
var ObjectID = require('mongodb').ObjectID;


var magicModule = require('mmmagic');
var Magic = magicModule.Magic;
var gm = require('gm');
var fs = require('fs');
var path = require('path');
var Q = require('q');
var async = require('async');

router.get('/', function(req, res, next) {
	sessionManager.isLoggedIn(req.session);
	res.render('market', { title: 'Market', USER: req.session });
});


/*
	ERROR CODES
	-------------
	DONE?
	[ ] no_type					=>		No post type specified (missing `t` field variable in form)
	[ ] invalid_type 			=>		Invalid `t` field (can only be [SALE] || [PURCHASE])
	[ ] no_description			=>		Missing description
	[ ] invalid_description		=>		Description length is not between 6-450
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
	if(req.body.t != 'general' && req.body.t != 'sale') {
		res.redirect('/market?err=invalid_type');
		return;
	}

	// ensure we recieved a description variable
	if(!('d' in req.body) || !req.body.d.length) {
		res.redirect('/market?err=no_description');
		return;
	}

	// validate description
	if(req.body.d.length < 4 || req.body.d.length > 2500) {
		res.redirect('/market?err=invalid_description');
		return;
	}

	//check if any photos were uploaded
	var photo = {
		one: 	(req.files['photo1']) ? req.files['photo1'][0] : false,
		two: 	(req.files['photo2']) ? req.files['photo2'][0] : false,
		three: 	(req.files['photo3']) ? req.files['photo3'][0] : false,
		four: 	(req.files['photo4']) ? req.files['photo4'][0] : false
	};
	
	// holds the post variables for insertion into database
	var post = {
		poster_id: req.session.USER_ID,
		poster_username: req.session.USERNAME,
		post_type: req.body.t,
		post_text: req.body.d,
		comment_count: 0,
		visibility: 1,
		images: []
	};

	// validate
	var neededIterations = 0;
	for(var img in photo) {

		if(photo[img]) {
			
			neededIterations ++;

			var large_path = photo[img].path.replace('__DEFAULT__', '__LARGE__');
			var large_name = photo[img].name.replace('__DEFAULT__', '__LARGE__');

			var small_path = photo[img].path.replace('__DEFAULT__', '__SMALL__');
			var small_name = photo[img].name.replace('__DEFAULT__', '__SMALL__');

			// Create large image
			gm(photo[img].path)
			.resize(800)
			.write(large_path, function(err) {
				if(err) {
					console.log('Error while creating large image :: ' + err);
				}
			});

			// Create small image
			gm(photo[img].path)
			.resize(350)
			.write(small_path, function(err) {
				if(err) {
					console.log('Error while creating small image :: ' + err);
				}
			});

			post.images.push({
				large: '/cdn/product/' + large_name,
				small: '/cdn/product/' + small_name
			});

		}
	}

	if(neededIterations == 0) {
		var db = dbManager.getDB();
		var feed = db.collection('FEED');
		feed.insert(post);
		res.redirect('/market');
		return;
	}

	// now iterate through image and validate mime-type
	var iteration = 0;
	for(var img in photo) {
		if(photo[img]) {

			var magic = new Magic(magicModule.MAGIC_MIME_TYPE);
			magic.detectFile(photo[img].path, function(err, mime) {
				iteration ++;
				if(err) {
					console.log('Error checking mime type :: ' + err);
				} else {
					switch(mime) {
						case 'image/png':
						case 'image/jpeg':
						case 'image/jpg':
						case 'image/gif':
						case 'image/bmp':
							insertPost(photo, res, post, iteration, neededIterations);
							break;
						default:
							res.redirect('/market?err=invalid_mimetype');
							return;
							break;
					}
				}
			});

		}
	}
});

// IGNORE GET FOR /market/post
router.get('/post', function(req, res, next) {
	res.redirect('/market');
	return;
});







function insertPost(photo, res, postObj, iteration, neededIterations) {
	if(iteration >= neededIterations) {
		var db = dbManager.getDB();
		var feed = db.collection('FEED');
		feed.insert(postObj);
		res.redirect('/market');
	}
	return;
}

function checkMime(filepath) {
	var deferred = Q.defer();

	var magic = new Magic(magicModule.MAGIC_MIME_TYPE);
	magic.detectFile(filepath, function(err, mime) {
		if(err) {
			deferred.reject(err);
		}
		var param = [filepath, mime];
		deferred.resolve(param);
	});

	return deferred.promise;
}


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