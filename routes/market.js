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

	var db = dbManager.getDB();
	var feed = db.collection('FEED');

	var sIndex = 1;
	var bIndex = 1;

	// see if we received a valid sale index
	if(!('s' in req.query) || parseInt(req.query.s) < 1) {
	} else {
		sIndex = parseInt(req.query.s);
	}

	// see if we receieved a valid buy index
	if(!('b' in req.query) || parseInt(req.query.b) < 1) {
	} else {
		bIndex = parseInt(req.query.b);
	}

	var pageLimit = 40;

	// fetch sales count
	feed.count({
		post_type: '[SELL_OFFER]',
		visibility: {
			$gt: 0
		}
	}, function(err, sellCount) {

		//fetch buy count
		feed.count({
			post_type: '[BUY_OFFER]',
			visibility: {
				$gt: 0
			}
		}, function(err, buyCount) {


			// fetch sales
			feed.find({
				post_type: '[SELL_OFFER]'
			}).sort({$natural: -1}).skip((sIndex - 1) * pageLimit).limit(pageLimit).toArray(function(err, saleArr) {
				
				// fetch buyer posts
				feed.find({
					post_type: '[BUY_OFFER]'
				}).sort({$natural: -1}).skip((bIndex - 1) * pageLimit).limit(pageLimit).toArray(function(err, buyArr) {

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
						BUY_FEED: buyArr,
						buyCount: buyCount,
						sellCount: sellCount,
						sp: sIndex,
						bp: bIndex,
						sMax: sellCount/pageLimit,
						bMax: buyCount/pageLimit
					});
				});
			});


		});
	});
});


/*
	ERROR CODES
	-------------
	DONE?
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
	if(req.body.d.length < 1 || req.body.d.length >= 361) {
		res.redirect('/market?err=invalid_description');
		return;
	}

	//check if any photos were uploaded
	var photo = {
		one: 	(req.files['photo1']) ? req.files['photo1'][0] : false,
		two: 	(req.files['photo2']) ? req.files['photo2'][0] : false,
		three: 	(req.files['photo3']) ? req.files['photo3'][0] : false,
		four: 	(req.files['photo4']) ? req.files['photo3'][0] : false
	};
	
	// holds the post variables for insertion into database
	var post = {
		poster_id: req.session.USER_ID,
		poster_username: req.session.USERNAME,
		post_text: req.body.d,
		visibility: 1,
		images: []
	};

	// Valdiate 
	var neededIterations = 0;
	for(var img in photo) {

		if(photo[img]) {
			
			neededIterations ++;
			var small_path = photo[img].path.replace('__LARGE__', '__SMALL__');
			var small_name = photo[img].name.replace('__LARGE__', '__SMALL__');

			// create smaller version of image
			gm(photo[img].path)
			.resize(350)
			.write(small_path, function(err) {
				if(err) {
					console.log('Error while minimizing image :: ' + err);
				}
			});

			post.images.push({
				large: '/cdn/product/' + photo[img].name,
				small: '/cdn/product/' + small_name
			});

		}
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
							insertPost(res, post, iteration, neededIterations);
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







function insertPost(res, postObj, iteration, neededIterations) {
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