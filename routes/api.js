'use strict';


var express = require('express');
var router = express.Router();

var formManager = require('../modules/form/form');
var dbManager = require('../modules/database/database');
var sessionManager = require('../modules/session/session');
var authManager = require('../modules/authentication');
var ObjectID = require('mongodb').ObjectID;
var fs = require('fs');

var pmSystem = require('../modules/PM/pm');
var smtp = require('../modules/smtp/smtp');
var uuid = require('node-uuid');
var secret = require('../modules/secret/secret');
var magicModule = require('mmmagic');
var Magic = magicModule.Magic;
var gm = require('gm');

/**
	RESPONSE TYPES

	1. DX-OK -- Successful request
	2. DX-REJECTED -- Bad parameters for request/not authenticated
	3. DX-FAILED -- Server errors
*/


router.get('*', function(req, res, next) {
	if(!req.xhr && req.session.USERNAME != 'lukeymoo') {
		res.send({status: 'DX-REJECTED', message: 'Cannot use browser for API endpoints'});
		return;
	}
	next();
});







/**
	Return the users session state
*/
router.get('/session', function(req, res, next) {
	var sessionState = sessionManager.isLoggedInQuiet(req.session);
	if('r' in req.query && req.query.r == 'state') {
		// convert message to string type
		var msg = (sessionState == true) ? 'true' : 'false';
		res.send({status: 'DX-OK', message: msg});
		return;
	}
	// check if still logged without setting new LAST_ACTIVITY
	res.send({ state: {
		USERNAME: req.session.USERNAME || '',
		EMAIL: req.session.EMAIL || '',
		LOGGED_IN: req.session.LOGGED_IN || false
	}});
	return;
});






/**
	Get latest posts in feed
*/
router.get('/post', function(req, res, next) {
	var feed = dbManager.getDB().collection('FEED');
	feed.find({}, { comments: { $slice: -4 } }).sort({_id: -1}).limit(10).toArray(function(err, feed) {
		if(err) {
			smtp.report_error('Error while fetching feed :: ' + err, function(){});
			res.send({status: 'DX-FAILED', message: 'Error while fetching feed'});
			return;
		}
		res.send({status: 'DX-OK', message: feed});
		return;
	});
});














/**
	Get feed with search params
*/
router.get('/post/search', function(req, res, next) {
	var search = ('search' in req.query && req.query.search.length) ? decodeURI(req.query.search) : false;
	var feed = dbManager.getDB().collection('FEED');

	if(search) {
		feed.find({
			$text: {
				$search: req.query.search
			}
		}, { comments: { $slice: -4 } }).sort({_id: -1}).limit(10).toArray(function(err, feed) {
			if(err) {
				smtp.report_error('Error while fetching feed :: ' + err, function(){});
				res.send({status: 'DX-FAILED', message: 'Error while fetching feed'});
				return;
			}
			res.send({status: 'DX-OK', message: feed});
			return;
		});
	} else {
		feed.find({}, { comments: { $slice: -4 } }).sort({_id: -1}).limit(10).toArray(function(err, feed) {
			if(err) {
				smtp.report_error('Error while fetching feed :: ' + err, function(){});
				res.send({status: 'DX-FAILED', message: 'Error while fetching feed'});
				return;
			}
			res.send({status: 'DX-OK', message: feed});
			return;
		});
	}
});











/**
	Determine if there are more comments before specified timestamp
*/
router.get('/post/:post_id/comment/more/:timestamp', function(req, res, next) {
	var feed = dbManager.getDB().collection('FEED');
	feed.findOne({
		_id: ObjectID(req.params.post_id),
	}, function(err, doc) {
		if(err) {
			smtp.report_error('Error occurred while checking there are more comments :: ' + err, function(){});
			res.send({status: 'DX-FAILED', message: 'Server error occurred'});
			return;
		}
		var more = false;
		for(var i = 0; i < doc.comments.length; i++) {
			if(doc.comments[i].timestamp < parseInt(req.params.timestamp)) {
				if(more == false) {
					more = 1;
				} else {
					more ++;
				}
			}
		}
		res.send({status: 'DX-OK', message: more});
	});
});










/**
	Get posts before specified timestamp
*/
router.get('/post/before/:timestamp', function(req, res, next) {
	var feed = dbManager.getDB().collection('FEED');
	feed.find({
		timestamp: {
			$lt: parseInt(req.params.timestamp)
		}
	}, { comments: { $slice: -4 } }).sort({_id: -1}).limit(10).toArray(function(err, feed) {
		res.send({status: 'DX-OK', message: feed});
		return;
	});
});














/**
	Determine if there are more posts after the specified timestamp
*/
router.get('/post/more/:timestamp', function(req, res, next) {
	var feed = dbManager.getDB().collection('FEED');
	feed.find({
		timestamp: {
			$gt: parseInt(req.params.timestamp)
		}
	}).count(function(err, count) {
		res.send({status: 'DX-OK', message: count});
	});
});














/**
	* Must be owner of post *
	Edit a specified post's description
*/
router.post('/post/:post_id/edit', function(req, res, next) {
	// Handle all authentication and respond if necessary
	if(!authManager.json_is_authenticated(req, res)) {
		return;
	}

	// ensure received new description
	if(!('text') in req.body || !req.body.text.length) {
		res.send({status: 'DX-REJECTED', message:'No description specified'});
		return;
	}

	// ensure text is not already the same
	var feed = dbManager.getDB().collection('FEED');

	/** Determine if post already has specified text **/
	feed.findOne({
		post_text: req.body.text
	}, function(err, doc) {
		if(err) {
			smtp.report_error('Error checking if post is the same :: ' + err, function(){});
			res.send({status: 'DX-FAILED', message: 'Server error occurred'});
			return;
		}
		if(doc) {
			res.send({status: 'DX-OK', message: 'Description is unchanged'});
			return;
		}

		/** Description validation **/
		if(validate_post_description(req.body.text) == 'short') {
			res.send({status: 'DX-REJECTED', message: 'Description must be at least 4 characters'});
			return;
		}
		if(validate_post_description(req.body.text) == 'long') {
			res.send({status: 'DX-REJECTED', message: 'Description must not exceed 2,500 characters'});
			return;
		}

		/** Change the posts text **/
		feed.update({
			_id: ObjectID(req.params.post_id),
			poster_username: req.session.USERNAME.toLowerCase(),
			poster_id: req.session.USER_ID
		}, { $set: { post_text: req.body.text, edited: true } }, function(err, result) {
			if(err) {
				smtp.report_error('[-] MongoDB error while updating post' + err, function(){});
				res.send({status: 'DX-FAILED', message: 'Error occurred updating post'});
				return;
			}
			if(result) {
				res.send({status: 'DX-OK', message: result});
				return;
			} else {
				res.send({status: 'DX-REJECTED', message: 'Post not found'});
				return;
			}
		});


	});
});







/**
	* Must be owner of post *
	Remove a post specified by ID
*/
router.post('/post/:post_id/remove', function(req, res, next) {
	var feed = dbManager.getDB().collection('FEED');

	/** Ensure the post belongs to the user requesting removal **/
	feed.findOne({
		_id: ObjectID(req.params.post_id)
	}, function(err, doc) {
		if(err) {
			smtp.report_error('Error while removing post :: ' + err, function(){});
			res.send({status: 'DX-FAILED', message: 'Server error occurred'});
			return;
		}
		/** If the post was found, check if username matches session **/
		if(doc) {
			if(doc.poster_username.toLowerCase() != req.session.USERNAME.toLowerCase()) {
				res.send({stauts: 'DX-REJECTED', message: 'This post does not belong to you'});
				return;
			}
		} else {
			smtp.report_error('Error while removing post :: ' + err, function(){});
			res.send({status: 'DX-FAILED', message: 'Server error occurred'});
			return;
		}
		/** Remove the associated images with product **/
		for(var img in doc.images) {
			/** Check if the __DEFAULT__ image still exists **/
			fs.exists(secret._SECRET_PATH + doc.images[img].large.replace('__LARGE__', '__DEFAULT__'), function(exists) {
				if(exists) {
					fs.unlink(secret._SECRET_PATH + doc.images[img].large.replace('__LARGE__', '__DEFAULT__'), function(err) {
						if(err) {
							smtp.report_error('Error removing image ' + doc.images[img].large.replace('__LARGE__', '__DEFAULT__') + ' :: ' + err, function(){});
						}
					});
				}
			});
			if(doc.images[img].large) {
				fs.unlink(secret._SECRET_PATH + doc.images[img].large, function(err) {
					if(err) {
						smtp.report_error('Error removing image ' + doc.images[img].large + ' :: ' + err, function(){});
					}
				});
			}
			if(doc.images[img].small) {
				fs.unlink(secret._SECRET_PATH + doc.images[img].small, function(err) {
					if(err) {
						smtp.report_error('Error removing image ' + doc.images[img].large + ' :: ' + err, function(){});
					}
				});
			}
		}
		/** Remove the post **/
		feed.remove({
			_id: ObjectID(req.params.post_id),
			poster_username: req.session.USERNAME.toLowerCase(),
			poster_id: req.session.USER_ID
		}, function(err, result) {
			if(err) {
				smtp.report_error('Error while removing post :: ' + err, function(){});
				res.send({status: 'DX-FAILED', message: 'Server error occurred'});
				return;
			}
			res.send({status: 'DX-OK', message: result});
		});
	});
});













/**
	* Must be authenticated *
	Create a comment for specified post
*/
router.post('/post/:post_id/comment/create', function(req, res, next) {

	/**
		Decode and validate comment text
	*/
	if(!('text' in req.body) || !req.body.text.length) {
		res.send({status: 'DX-REJECTED', message: 'No comment text given'});
		return;
	}

	var text = decodeURI(req.body.text);

	// Limit posts per timeframe ( 2 seconds => 30 comments per minute )
	if(!authManager.can_comment(req, res)) {
		res.send({status: 'DX-REJECTED', message: 'Must wait 4 seconds before posting another comment'});
		return;
	}

	/** Validate the comment before doing continuing **/
	if(!validComment(text)) {
		res.send({status: 'DX-REJECTED', message: 'Comment must be 2-1000 characters'});
		return;
	}

	/**
		Capture attachment
	*/
	var image = null;
	
	if(req.files.image) {
		image = req.files['image'][0];

		/** Validate the mime-type **/
		var magic = new Magic(magicModule.MAGIC_MIME_TYPE);
		magic.detectFile(image.path, function(err, mime) {
			if(err) {
				smtp.report_error('Error checking mime type :: ' + err,function(){});
			} else {
				switch(mime) {
					case 'image/png':
					case 'image/jpeg':
					case 'image/jpg':
					case 'image/gif':
					case 'image/bmp':
						resizeComment(req, res, image);
						break;
					default:
						// bad mime => skip resizing
						image = null;
						createComment(req, res, image);
						return;
						break;
				}
			}
		});
	} else {
		createComment(req, res, image);
	}

	function resizeComment(req, res, image) {
		var small_path = image.path.replace('__LC__', '__SC__');
		// Create small version
		gm(image.path)
		.resize(null, 100)
		.write(small_path, function(err) {
			if(err) {
				image = null;
				smtp.report_error('Error occurred while resizing comment image -> small :: ' + err, function(){});
				createComment(req, res, image);
			}
			if(image != null) {
				// Create resize large version to max at 960x?
				gm(image.path)
				.resize(960)
				.write(image.path, function(err) {
					if(err) {
						image = null;
						smtp.report_error('Error occurred while resizing comment image -> large :: ' + err, function(){});
					}
					createComment(req, res, image);
				});
			}
		});
		return;
	}

	function createComment(req, res, image) {

		var images;

		if(image) {
			var small_name = image.name.replace('__LC__', '__SC__');
			images = [];
			images.push({
				large: '/cdn/comment/' + image.name,
				small: '/cdn/comment/' + small_name
			});
		} else {
			images = null;
		}

		var new_comment = {
			_id: new ObjectID(),
			poster_username: req.session.USERNAME,
			poster_id: req.session.USER_ID,
			text: text,
			timestamp: new Date().getTime(),
			images: images
		};

		// update post pushing this comment to `comments` array
		var feed  = dbManager.getDB().collection('FEED');

		feed.update({
			_id: ObjectID(req.params.post_id)
		}, { $push: { comments: new_comment } }, function(err, result) {
			if(err) {
				smtp.report_error('MongoDB Error occurred while posting comment :: ' + err, function(){});
				res.send({status: 'DX-FAILED', message: 'Error occurred while posting comment'});
				return;
			}
			authManager.startCooldown(req);
			res.send({status: 'DX-OK', message: result})
			return;
		});
	}
});










/**
	* Must be owner of comment *
	Edit a comment for specified post
*/
router.post('/post/:post_id/comment/edit/:comment_id', function(req, res, next) {
	// Ensure logged in
	if(!authManager.json_is_authenticated(req, res)) {
		return;
	}

	/**
		Ensure we received new comment text
	*/
	if(!('text' in req.body) || !req.body.text.length) {
		res.send({status: 'DX-REJECTED', message: 'No text given to replace comment with'});
		return;
	}

	// Validate text
	if(!validComment(req.body.text)) {
		res.send({status: 'DX-REJECTED', message: 'Comments must be 2-500 characters'});
		return;
	}

	/** Determine if comment had image and was removed **/
	// false -> remove image ~ remove image
	if('image' in req.body && req.body.image == 'remove_image') {
		// Removes comment image
		removeCommentImage(req.params.post_id, req.params.comment_id, function() {});
	}

	// ensure there was a change in text
	var feed = dbManager.getDB().collection('FEED');

	/** First `findOne` is to ensure the comment text isn't the same **/
	feed.findOne({
		_id: ObjectID(req.params.post_id),
		comments: {
			$elemMatch: {
				text: req.body.text
			}
		}
	}, { _id: 1 }, function(err, doc) {
		if(err) {
			smtp.report_error('Error checking if comment was unchanged :: ' + err, function(){});
			res.send({status: 'DX-FAILED', message: 'Server error occurred'});
			return;
		}
		if(doc) {
			res.send({status: 'DX-OK', message: 'Comment text is unchanged'});
			return;
		}

		/** If the comment isn't the same find comment again and this time edit it **/
		feed.update({
			_id: ObjectID(req.params.post_id),
			comments: {
				$elemMatch: {
					_id: ObjectID(req.params.comment_id),
					poster_username: req.session.USERNAME,
					poster_id: req.session.USER_ID
				}
			}
		}, { $set: { "comments.$.text": req.body.text, "comments.$.edited": true } }, function(err, result) {
			if(err) {
				smtp.report_error('Error occurred editing comment text :: ' + err, function(){});
				res.send({status: 'DX-FAILED', message: 'Server error'});
				return;
			}
			res.send({status: 'DX-OK', message: result});
			return;
		});
	});
});

function removeCommentImage(post_id, comment_id, callback) {
	var feed = dbManager.getDB().collection('FEED');
	feed.findOne({
		_id: ObjectID(post_id),
		comments: {
			$elemMatch: {
				_id: ObjectID(comment_id)
			}
		}
	}, function(err, doc) {
		if(err) {
			smtp.report_error('Error while getting comment image name from database for removal :: ' + err, function(){});
		}
		for(var comment in doc.comments) {
			if(String(doc.comments[comment]._id) == comment_id) {
				console.log('matched');
				if(doc.comments[comment].images) {
					if(doc.comments[comment].images[0].large) {
						fs.unlink(secret._SECRET_PATH + doc.comments[comment].images[0].large, function(err) {
							if(err) {
								console.log(err);
								smtp.report_error('Error unlinking comment image :: ' + err, function(){});
							}
						});
					}
					if(doc.comments[comment].images[0].small) {
						fs.unlink(secret._SECRET_PATH + doc.comments[comment].images[0].small, function(err) {
							if(err) {
								console.log(err);
								smtp.report_error('Error unlinking comment image :: ' + err, function(){});
							}
						});
					}
				}
			} else {
				console.log('no match');
			}
		}
		// Remove database entry
		feed.update({
			_id: ObjectID(post_id),
			comments: {
				$elemMatch: {
					_id: ObjectID(comment_id)
				}
			}
		}, { $set: { "comments.$.images": null, "comments.$.edited": true } }, function(err, result) {
			if(err) {
				smtp.report_error('Error removing comment image :: ' + err, function(){});
			}
			callback();
		});
	});
	return;
}







/**
	* Must be owner of comment *
	Remove a comment for specified post
*/
router.post('/post/:post_id/comment/remove/:comment_id', function(req, res, next) {
	if(!authManager.json_is_authenticated(req, res)) {
		return;
	}

	var feed = dbManager.getDB().collection('FEED');

	// If comment had image unlink it
	feed.findOne({
		_id: ObjectID(req.params.post_id),
		comments: {
			$elemMatch: {
				_id: ObjectID(req.params.comment_id),
				poster_username: req.session.USERNAME,
				poster_id: req.session.USER_ID
			}
		}
	}, function(err, doc) {
		
		for(var comment in doc.comments) {
			if(String(doc.comments[comment]._id) == req.params.comment_id) {
				// Remove comment images
				if(doc.comments[comment].images) {
					if(doc.comments[comment].images[0].large) {
						fs.unlink(secret._SECRET_PATH + doc.comments[comment].images[0].large, function(err) {
							if(err) {
								smtp.report_error('Error removing image attached with comment that\'s being deleted :: ' + err, function(){});
							}
						});
					}
					if(doc.comments[comment].images[0].small) {
						fs.unlink(secret._SECRET_PATH + doc.comments[comment].images[0].small, function(err) {
							if(err) {
								smtp.report_error('Error removing image attached with comment that\'s being deleted :: ' + err, function(){});
							}
						});
					}
				}
			}
		}

		// Remove comment from db
		feed.update({
			_id: ObjectID(req.params.post_id),
			comments: {
				$elemMatch: {
					_id: ObjectID(req.params.comment_id),
					poster_username: req.session.USERNAME,
					poster_id: req.session.USER_ID
				}
			}
		}, { $pull: { comments: { _id: ObjectID(req.params.comment_id) } } }, function(err, result) {
			if(err) {
				smtp.report_error('Error removing comment :: ' + err, function(){});
				res.send({status:'DX-FAILED', message: 'Server error occurred'});
				return;
			}
			res.send({status: 'DX-OK', message: result});
			return;
		});

	});
});





/**
	Get latest comments for specified post
*/
router.get('/post/:post_id/comment', function(req, res, next) {
	var feed = dbManager.getDB().collection('FEED');
	feed.findOne({
		_id: ObjectID(req.params.post_id)
	}, { comments: { $slice: -10 } }, function(err, doc) {
		if(err) {
			smtp.report_error('Error fetching lastest comments :: ' + err, function(){});
			res.send({status: 'DX-FAILED', message: 'Server error occurred'});
			return;
		}
		res.send({status: 'DX-OK', message: doc.comments});
		return;
	});
});











/**
	Get comments BEFORE specified timestamp for specified post_id
*/
router.get('/post/:post_id/comment/before/:timestamp', function(req, res, next) {
	var feed = dbManager.getDB().collection('FEED');
	feed.findOne({
		_id: ObjectID(req.params.post_id)
	}, { _id: 0, comments: 1 }, function(err, doc) {
		if(err) {
			smtp.report_error('Error fetching comments before timestamp :: ' + err, function(){});
			res.send({status: 'DX-FAILED', message: 'Server error occurred'});
			return;
		}
		var comments = [];
		var more = false;

		doc.comments.sort(cmpT);
		
		for(var i = doc.comments.length - 1; i >= 0; i--) {
			if(comments.length < 10) {
				if(doc.comments[i].timestamp < parseInt(req.params.timestamp)) {
					if(more == false) {
						more = i;
					}
					comments.push(doc.comments[i]);
				}
			} else {
				break;
			}
		}
		res.send({status: 'DX-OK', message: comments});
	});
});

// Custom sort function for message timestamps
function cmpT(a, b) {
	if(a.timestamp < b.timestamp) {
		return -1;
	} else if(a.timestamp > b.timestamp) {
		return 1;
	}
	return 0;
}












/**
	Get comments AFTER specified timestamp for specified post_id
*/
router.get('/post/:post_id/comment/after/:timestamp', function(req, res, next) {
	var feed = dbManager.getDB().collection('FEED');
	feed.findOne({
		_id: ObjectID(req.params.post_id)
	}, { _id: 0, comments: 1 }, function(err, doc) {
		if(err) {
			smtp.report_error('Error fetching comments before timestamp :: ' + err, function(){});
			res.send({status: 'DX-FAILED', message: 'Server error occurred'});
			return;
		}
		var comments = [];
		for(var i = doc.comments.length - 1; i >= 0; i--) {
			if(comments.length < 10) {
				if(doc.comments[i].timestamp > parseInt(req.params.timestamp)) {
					comments.push(doc.comments[i]);
				}
			} else {
				break;
			}
		}
		res.send({status: 'DX-OK', message: comments});
	});
});




































// save landing page emails
router.get('/save_landing_email', function(req, res, next) {
	var db = dbManager.getDB();
	var emailCol = db.collection('EARLY_BIRD');

	// ensure email is sent
	if(!('email' in req.query) || req.query.email.length == 0) {
		res.send({status: 'DX-REJECTED', message: 'No email specified'});
		return;
	}

	if(!formManager.validateEmail(req.query.email)) {
		res.send({status: 'DX-REJECTED', message: 'Invalid email'});
		return;
	}

	// check if email exists
	emailCol.findOne({
		email: req.query.email.toLowerCase()
	}, function(err, doc) {
		if(err) {
			smtp.report_error('[-] MongoDB error while saving landing page lead :: ' + err, function(){});
		}
		if(doc) {
				res.send({status: 'DX-OK', message: 'Already signed up! Thanks!'});
				return;
		} else {
			// if not insert it
			emailCol.insert({email: req.query.email.toLowerCase()});
			res.send({status: 'DX-OK', message: 'Thanks for signing up!'});
		}
	});
	return;
});









// Catch account cancellation confirmation
router.get('/confirm_account_canceled', function(req, res, next) {
	if(!('ACCOUNT_ID' in req.session) || req.session.ACCOUNT_ID.length == 0) {
		res.send({status: 'DX-REJECTED', message: 'No account ID specified, ensure the complete cancel link is in URL'});
		return;
	}

	// Find account with specified ID and remove it from the database
	var database = dbManager.getDB();
	var usrCol = database.collection('USERS');
	usrCol.update({
		_id: ObjectID(req.session.ACCOUNT_ID)
	}, { $unset: { email: '', activation: '' } });

	// Send PM to user notifying the unlinking of email
	// Point them to account settings page where they may set a new one
	pmSystem.serverSend(req.session.USERNAME, 'The email you registered with has been unlinked with account, please link a new email in the account settings page');

	delete req.session.ACCOUNT_ID;
	delete req.session.USERNAME;
	res.send({status: 'DX-OK', message: 'Email address unlinked'});
});









// Catch tip submissions
router.get('/savetip', function(req, res, next) {
	// Ensure we received the message
	if(!('message' in req.query) || req.query.message.length < 2) {
		// Drop the request
		res.send({status: 'DX-REJECTED', message: 'No message received'});
		return;
	}

	var message = '\n\n========\n\n' + req.query.message.toLowerCase();

	fs.appendFile('tip_submission', message, function(err) {
		res.send({status: 'DX-OK', message: 'Tip received'});
		return;
	});
	
});








// Change password
router.get('/chgpwd', function(req, res, next) {

	// Handle all authentication and respond if necessary
	if(!authManager.json_is_authenticated(req, res)) {
		return;
	}

	// Ensure we recieved the old password, the new password and a confirmation re-entry
	if(!('oldP' in req.query) || req.query.oldP.length == 0) {
		res.send({status: 'DX-REJECTED', message: 'Request incomplete :: Old password missing'});
		return;
	}
	if(!('newP' in req.query) || req.query.newP.length == 0) {
		res.send({status: 'DX-REJECTED', message: 'Request incomplete :: New password missing'});
		return;
	}
	if(!('newPA' in req.query) || req.query.newPA.length == 0) {
		res.send({status: 'DX-REJECTED', message: 'Request incomplete :: Confirm password missing'});
		return;
	}

	var elements = {};
	elements.oldP = formManager.validatePassword(req.query.oldP); // Must be true
	elements.newP = formManager.validatePassword(req.query.newP); // Must be true
	// Are they entering the same password in all fields ( Only acceptable FALSE )
	elements.sameP = (req.query.oldP == req.query.newP) ? true : false;
	// Do the new passwords match
	elements.newPM = (req.query.newP == req.query.newPA) ? true : false; // Must be true

	// Ensure we're doing already before investing in database check
	for(var elem in elements) {
		if(elements[elem]) {
			if(elem == 'sameP') {
				res.send({status: 'DX-REJECTED', message: 'Cannot use existing password for new password'});
				return;
			}
		}
	}

	// Find document check if current password is already the same
	var database = dbManager.getDB();
	var usrCol = database.collection('USERS');
	var crypto = require('crypto');

	var usrID = '';

	usrCol.findOne({
		username: req.session.USERNAME.toLowerCase(),
		password: crypto.createHash('md5').update(String(req.query.oldP)).digest('hex')
	}, function(err, doc) {
		if(err) {
			res.send({status: 'DX-FAILED', message: 'Error occurred'});
			smtp.report_error('[-] MongoDB error while updating password :: ' + err, function(){});
			return;
		}
		// Correct old password
		if(doc) {
			// Grab user ID and update
			usrID = ObjectID(doc._id);
			// Update
			usrCol.update({
				_id: usrID
			}, { $set: { password: crypto.createHash('md5').update(String(req.query.newP)).digest('hex') } });
			res.send({status: 'DX-OK', message: 'Password updated!'});
			return;
		} else {
			// incorrect current password
			res.send({status: 'DX-REJECTED', message: 'Incorrect password'});
			return;
		}
	});

});









/** Mail API calls **/
// Get unread message count
router.get('/unread', function(req, res, next) {
	// Handle all authentication and respond if necessary
	if(!authManager.json_is_authenticated(req, res)) {
		return;
	}

	var database = dbManager.getDB();
	var mailCol = database.collection('MAIL');

	mailCol.find({
		recipients: {
			$elemMatch: {
				username: req.session.USERNAME.toLowerCase(),
				label: '[INBOX]',
				read: false
			}
		}
	}).toArray(function(err, arr) {
			if(err) {
				smtp.report_error('[-] Failed to retrieve unread message count :: ' + err, function(){});
				res.send({status: 'DX-FAILED', message: 'Server error retreiving unread message count'});
				return;
			}

			res.send({status: 'DX-OK', message: arr.length});
			return;
	});
});



router.get('/mail', function(req, res, next) {

	// Handle all authentication and respond if necessary
	if(!authManager.json_is_authenticated(req, res)) {
		return;
	}

	// Ensure they've sent a request
	if(!('request' in req.query) || req.query.request.length == 0) {
		res.send({status: 'DX-REJECTED', message: 'Must have a valid request type'});
		return;
	}

	// Now ensure the request was valid
	switch(req.query.request) {
		case 'UPDATE':
			// ensure they sent update to
			if(!('to' in req.query) || req.query.to.length == 0) {
				res.send({status: 'DX-REJECTED', message: 'Must specify update `to`'});
				return;
			}

			//ensure they sent array of IDS
			if(!('messages' in req.query) || req.query.messages.length == 0) {
				res.send({status: 'DX-REJECTED', message: 'No messages specified'});
				return;
			}
			
			// validate ids
			var validatedIDs = [];
			for(var id in req.query.messages) {
				if(req.query.messages[id].length == 24) {
					validatedIDs.push(ObjectID(req.query.messages[id]));
				}
			}

			// update messages
			var database = dbManager.getDB();
			var mailCol = database.collection('MAIL');

			switch(req.query.to) {
				case 'READ':
					mailCol.update({
						_id: { $in: validatedIDs },
						recipients: {
							$elemMatch: { username: req.session.USERNAME }
						}
					}, { $set: { "recipients.$.read": true } }, {multi:true});
					res.send({status: 'DX-OK', message: 'Updated!'});
					return;
					break;
				case 'UNREAD':
					mailCol.update({
						_id: { $in: validatedIDs },
						recipients: {
							$elemMatch: { username: req.session.USERNAME }
						}
					}, { $set: { "recipients.$.read": false } }, {multi:true});
					res.send({status: 'DX-OK', message: 'Updated!'});
					return;
					break;
				case 'INBOX':
					mailCol.update({
						_id: { $in: validatedIDs },
						recipients: {
							$elemMatch: { username: req.session.USERNAME }
						}
					}, { $set: { "recipients.$.label": '[INBOX]' } }, {multi:true});
					res.send({status: 'DX-OK', message: 'Updated!'});
					return;
					break;
				case 'TRASH':
					mailCol.update({
						_id: { $in: validatedIDs },
						recipients: {
							$elemMatch: { username: req.session.USERNAME }
						}
					}, { $set: { "recipients.$.label": '[TRASH]' } }, {multi:true});
					res.send({status: 'DX-OK', message: 'Updated!'});
					return;
					break;
			}

			break;

		case 'DELETE':
			// Ensure they've sent messages
			if(!('messages') in req.query || req.query.messages.length == 0) {
				res.send({status: 'DX-REJECTED', message: 'Must specify messags'});
				return;
			}

			// get valid ids from array
			var validatedIDs = [];
			for(var i in req.query.messages) {
				if(req.query.messages[i].length == 24) {
					validatedIDs.push(ObjectID(req.query.messages[i]));
				}
			}
			if(validatedIDs.length == 0) {
				res.send({status: 'DX-REJECTED', message: 'No valid messages specified'});
				return;
			}

			// delete
			var database = dbManager.getDB();
			var mailCol = database.collection('MAIL');

			mailCol.update({
				_id: {
					$in: validatedIDs
				}
			}, { $pull: { recipients: { username: req.session.USERNAME.toLowerCase() } } }, {multi:true});
			res.send({status: 'DX-OK', message: 'Removed'});
			return;
			break;

		default:
			res.send({status: 'DX-REJECTED', message: 'Could not meet request'});
			return;
			break;
	}
});


// Account Settings page add new email
router.get('/add_email', function(req, res, next) {
	// Handle all authentication and respond if necessary
	if(!authManager.json_is_authenticated(req, res)) {
		return;
	}

	// Ensure they've sent the email
	if(!('email' in req.query) || req.query.email.length == 0) {
		res.send({status: 'DX-REJECTED', message: 'No new email specified'});
		return;
	}

	// Validate the email
	if(formManager.validateEmail(req.query.email)) {
		// Ensure this email isn't already present in database
		var database = dbManager.getDB();
		var usrCol = database.collection('USERS');

		usrCol.findOne({
			$or: [
				{ email: req.query.email.toLowerCase() },
				{ other_emails: req.query.email.toLowerCase() }
			]
		}, function(err, doc) {
			if(err) {
				smtp.report_error('[-] MongoDB error while adding new email :: ' + err, function(){});
				res.send({status: 'DX-FAILED', message: 'Error while adding email, please try again.'});
				return;
			}
			if(doc) {
				// Email in use
				res.send({status: 'DX-REJECTED', message: 'Email is already in use!'});
				return;
			} else {
				// Find the user by username
				usrCol.findOne({
					username: req.session.USERNAME
				}, function(err, doc) {
					// does the user have a primary email ?
					if(!('email' in doc) || doc.email.length == 0) {

						var activation = {
							token: uuid.v1(),
							cancel: uuid.v1() + '-cancel',
							used: false
						};

						// Make primary email
						usrCol.update({
							username: req.session.USERNAME
						}, { $set: { email: req.query.email.toLowerCase(), activation: activation } });

						// Set the session variable
						req.session.EMAIL = req.query.email.toLowerCase();

						// prepare to email activation for newly set primary email
						var message = {
							to: req.session.EMAIL,
							subject: 'DMV Exchange Registration',
							text: 'New primary email has been set. Activate it using the link below\r\n\
								http://dmv-exchange.com/account/ack?token='+activation.token+'\r\n\r\n\r\n\
								 If you want to cancel activation of this email use the following link\r\n\
								 http://dmv-exchange.com/account/ack?token='+activation.cancel
						};

						// Email the user activation code
						smtp.send(message, function(err, result) {
							// Send reminder to activate account through internal PM system
							pmSystem.serverSend(req.session.USERNAME, 'Don\'t forget to activate your account, activation link was sent to email ' + req.session.EMAIL);
							res.send({
								status: 'DX-OK',
								message: 'Email has been added',
								email: req.query.email,
								refresh: true
							});
							return;
						});
					} else {
						// if not push into other emails
						usrCol.update({
							username: req.session.USERNAME
						}, { $push: { other_emails: req.query.email.toLowerCase() } });

						// Tell the user to activate the new emails
						pmSystem.serverSend(req.session.USERNAME, 'New email ' + req.query.email + ' has been linked with account.');

						res.send({
							status: 'DX-OK',
							message: 'Email has been added',
							email: req.query.email
						});
						return;
					}
				});
			}
		});
	} else {
		res.send({status: 'DX-REJECTED', message: 'The email specified is not a valid email'});
		return;
	}
});

// Account Settings page add new email
router.get('/remove_email', function(req, res, next) {
	// Handle all authentication and respond if necessary
	if(!authManager.json_is_authenticated(req, res)) {
		return;
	}

	// Ensure they've sent the email
	if(!('email' in req.query) || req.query.email.length == 0) {
		res.send({status: 'DX-REJECTED', message: 'No new email specified'});
		return;
	}

	// Validate the email
	if(formManager.validateEmail(req.query.email)) {
		// Ensure this email isn't already present in database
		var database = dbManager.getDB();
		var usrCol = database.collection('USERS');

		usrCol.findOne({
			username: req.session.USERNAME,
			other_emails: req.query.email
		}, function(err, doc) {
			if(err) {
				smtp.report_error('[-] MongoDB error while removing email :: ' + err, function(){});
				res.send({status: 'DX-FAILED', message: 'Error occurred while removing email, please refresh page and try again'});
				return;
			}
			if(doc) {
				// Remove the email
				usrCol.update({
					username: req.session.USERNAME
				}, { $pull: { other_emails: req.query.email.toLowerCase() } });
				// Send PM
				pmSystem.serverSend(req.session.USERNAME, 'Email ' + req.query.email + ' has been removed from account.');
				res.send({status: 'DX-OK', message: 'Email removed'});
				return;
			} else {
				// Email not in collection
				res.send({status: 'DX-REJECTED', message: 'Email not found in account'});
				return;
			}
		});

	} else {
		res.send({status: 'DX-REJECTED', message: 'The email specified is not a valid email'});
		return;
	}
});

// Get PM's
router.get('/getmail', function(req, res, next) {

	// Handle all authentication and respond if necessary
	if(!authManager.json_is_authenticated(req, res)) {
		return;
	}

	// Query database for messages with matching username in targets
	var database = dbManager.getDB();
	var mailCol = database.collection('MAIL');

	mailCol.find({
		recipients: {
			$elemMatch: {
				username: req.session.USERNAME.toLowerCase()
			}
		}
	}).limit(500).sort({_id: -1}).toArray(function(err, arrayMail) {
		if(err) {
			smtp.report_error('[-] MongoDB error getting mail :: ' + JSON.stringify(err), function(){});
			res.send({status: 'DX-FAILED', message: 'Server error 500'});
			return;
		} else {
			var length;
			if(!arrayMail) {
				length = 0;
			} else {
				length = arrayMail.length;
			}
			// insert timestamp into each mail object
			for(var mail in arrayMail) {
				
				arrayMail[mail].timestamp = ObjectID(arrayMail[mail]._id).getTimestamp();
			}
			res.send({status: 'DX-OK', returned: length, message: arrayMail});
			return;
		}
	});
});

// Send PM's
router.get('/sendmail', function(req, res, next) {

	// Handle all authentication and respond if necessary
	if(!authManager.json_is_authenticated(req, res)) {
		return;
	}

	var s = ''; // subject
	var m = ''; // message text

	if(('s' in req.query) && pmSystem.validateSubject(req.query.s)) {
		s = req.query.s;
		if(s.length == 0) {
			s = 'No subject';
		}
	}

	if(('m' in req.query) && pmSystem.validateMessage(req.query.m)) {
		m = req.query.m;
	} else {
		// Bad message
		res.send({status: 'DX-REJECTED', message: 'Invalid message text'});
		return;
	}

	// create and parse message object
	var validTarget = [];
	for(var user in req.query.r) {

		// Ensure its not an empty target
		if(req.query.r[user].length == 0) {
			continue;
		}

		// ensure we don't send to the same user twice
		var added = false;

		for(var target in validTarget) {
			if(req.query.r[user] == validTarget[target].username) {
				added = true;
			}
		}

		// if not added, push to targets array
		if(!added) {
			validTarget.push({
				username: req.query.r[user],
				label: '[INBOX]',
				read: false
			});
		}

	}

	// Ensure we still have targets after validation
	if(validTarget.length == 0) {
		res.send({status: 'DX-REJECTED', message: 'No valid targets specified'});
		return;
	}


	// Holds the message
	var PM = {
		subject: s,
		message: m,
		from: req.session.USERNAME,
		recipients: validTarget
	};

	// Insert message
	var database = dbManager.getDB();
	var msgCol = database.collection('MAIL');

	msgCol.insert(PM);
	res.send({status: 'DX-OK', message: 'Sent!'});
});


module.exports = router;

// feedObj == Obj with 'sale' & 'general' properties which contain
// feed in array format
function returnFeed(res, feedObj, iteration) {
	if(iteration == 3) {
		res.send({status: 'DX-OK', message: feedObj});
	}
	return;
}

function validate_post_description(string) {
	// validate description
	if(string.length < 4) {
		return 'short';
	}
	if(string.length > 2500) {
		return 'long';
	}
	return true;
}

function validComment(string) {
	return (string.length >= 2 && string.length <= 1000) ? true : false;
}




















