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
	Get latest posts in feed
*/
router.get('/', function(req, res, next) {
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
router.get('/search', function(req, res, next) {
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
router.get('/:post_id/comment/more/:timestamp', function(req, res, next) {
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
router.get('/before/:timestamp', function(req, res, next) {
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
router.get('/more/:timestamp', function(req, res, next) {
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
router.post('/:post_id/edit', function(req, res, next) {
	// Handle all authentication and respond if necessary
	if(!authManager.json_is_authenticated(req, res)) {
		return;
	}

	// ensure received new description
	if(!('text') in req.body || !req.body.text.length) {
		res.send({status: 'DX-REJECTED', message:'No description specified'});
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

	// ensure text is not already the same
	var feed = dbManager.getDB().collection('FEED');

	/** Determine if post text is unchanged **/
	feed.findOne({
		post_text: req.body.text
	}, function(err, doc) {
		if(err) {
			smtp.report_error('Error checking if post is the same :: ' + err, function(){});
			res.send({status: 'DX-FAILED', message: 'Server error occurred'});
			return;
		}
		/** If the post text is the same return **/
		if(doc) {
			res.send({status: 'DX-OK', message: 'Description is unchanged'});
			return;
		}

		/**
			Ensure ownership of post
		*/
		if(doc.poster_username.toLowerCase() != req.session.USERNAME.toLowerCase()) {
			res.send({status: 'DX-REJECTED', message: 'This post does not belong to you'});
			return;
		}
		if(doc.poster_id != req.session.USER_ID) {
			res.send({status: 'DX-REJECTED', message: 'This post does not belong to you'});
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
router.post('/:post_id/remove', function(req, res, next) {
	var feed = dbManager.getDB().collection('FEED');

	/** Find post for authentication **/
	feed.findOne({
		_id: ObjectID(req.params.post_id)
	}, function(err, doc) {
		if(err) {
			smtp.report_error('Error while removing post :: ' + err, function(){});
			res.send({status: 'DX-FAILED', message: 'Server error occurred'});
			return;
		}
		/** Ensure ownership of post **/
		if(doc) {
			if(doc.poster_username.toLowerCase() != req.session.USERNAME.toLowerCase()) {
				res.send({status: 'DX-REJECTED', message: 'This post does not belong to you'});
				return;
			}
			if(doc.poster_id != req.session.USER_ID) {
				res.send({status: 'DX-REJECTED', message: 'This post does not belong to you'});
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
router.post('/:post_id/comment/create', function(req, res, next) {

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
router.post('/:post_id/comment/edit/:comment_id', function(req, res, next) {
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
	if('image' in req.body && req.body.image == 'remove_image') {
		// Removes comment image
		removeCommentImage(req.params.post_id, req.params.comment_id, function() {
			editComment();
		});
	} else {
		editComment();
	}

	function editComment() {
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
				res.send({status: 'DX-OK', message: 'TEXT_NO_CHANGE'});
			} else {
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
			}
		});
	}


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
					if(doc.comments[comment].images) {
						if(doc.comments[comment].images[0].large) {
							fs.unlink(secret._SECRET_PATH + doc.comments[comment].images[0].large, function(err) {
								if(err) {
									smtp.report_error('Error unlinking comment image :: ' + err, function(){});
								}
							});
						}
						if(doc.comments[comment].images[0].small) {
							fs.unlink(secret._SECRET_PATH + doc.comments[comment].images[0].small, function(err) {
								if(err) {
									smtp.report_error('Error unlinking comment image :: ' + err, function(){});
								}
							});
						}
					}
				} else {
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
	}
});




















/**
	* Must be owner of comment *
	Remove a comment for specified post
*/
router.post('/:post_id/comment/remove/:comment_id', function(req, res, next) {
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
router.get('/:post_id/comment', function(req, res, next) {
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
router.get('/:post_id/comment/before/:timestamp', function(req, res, next) {
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
router.get('/:post_id/comment/after/:timestamp', function(req, res, next) {
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




















