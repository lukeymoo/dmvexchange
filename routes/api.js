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


/**
	RESPONSE TYPES

	1. DX-OK -- Successful request
	2. DX-REJECTED -- Bad parameters for request ( EX: Incorrect password )
	3. DX-FAILED -- Invalid request outright ( EX: Failed tests || Missing session values )
*/


router.get('*', function(req, res, next) {
	if(!req.xhr && req.session.USERNAME != 'lukeymoo') {
		res.send({status: 'DX-REJECTED', message: 'Cannot use browser for API endpoints'});
		return;
	}
	next();
});

router.post('/remove_comment', function(req, res, next) {
	if(!authManager.json_is_authenticated(req, res)) {
		return;
	}
	// Ensure we received a post_id and comment_id
	if(!('post_id' in req.body) || !req.body.post_id.length) {
		res.send({status: 'DX-REJECTED', message: 'No post ID specified'});
		return;
	}
	if(!('comment_id' in req.body) || !req.body.comment_id.length) {
		res.send({status: 'DX-REJECTED', message: 'No comment ID specified'});
		return;
	}

	var db = dbManager.getDB();
	var feed = db.collection('FEED');
	feed.update({
		_id: ObjectID(req.body.post_id),
		comments: {
			$elemMatch: {
				_id: ObjectID(req.body.comment_id)
			}
		}
	}, { $pull: { comments: { _id: ObjectID(req.body.comment_id) } } }, function(err, result) {
		if(err) {
			smtp.report_error('Error removing comment :: ' + err, function(){});
			res.send({status:'DX-FAILED', message: 'Server error occurred'});
			return;
		}
		res.send({status: 'DX-OK', message: result});
		return;
	});
});

router.post('/save_comment_edit', function(req, res, next) {
	// Ensure logged in
	if(!authManager.json_is_authenticated(req, res)) {
		return;
	}

	// Ensure we received a post_id, comment_id and text for
	// new comment
	if(!('post_id' in req.body) || !req.body.post_id.length) {
		res.send({status: 'DX-REJECTED', message: 'No post ID specified'});
		return;
	}
	if(!('comment_id' in req.body) || !req.body.comment_id.length) {
		res.send({status: 'DX-REJECTED', message: 'No comment ID specified'});
		return;
	}
	if(!('text' in req.body) || !req.body.text.length) {
		res.send({status: 'DX-REJECTED', message: 'No text given to replace comment with'});
		return;
	}
	// Validate text
	if(!validate_comment(req.body.text)) {
		res.send({status: 'DX-REJECTED', message: 'Comments must be 2-500 characters'});
		return;
	}

	// ensure there was a change in text
	var db = dbManager.getDB();
	var feed = db.collection('FEED');

	feed.findOne({
		_id: ObjectID(req.body.post_id),
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
			res.send({status: 'DX-OK', message: 'Comment is unchanged'});
			return;
		}

		// find post_id and comment id
		feed.update({
			_id: ObjectID(req.body.post_id),
			comments: {
				$elemMatch: { _id: ObjectID(req.body.comment_id) }
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

router.get('/is_more_comments', function(req, res, next) {
	// Ensure we've got a post_id and last comment id for indexing
	if(!('post_id' in req.query) || !req.query.post_id.length) {
		res.send({status: 'DX-REJECTED', message: 'No post ID specified'});
		return;
	}
	if(!('comment_id' in req.query) || !req.query.comment_id.length) {
		res.send({status: 'DX-REJECTED', message: 'No comment index specified'});
		return;
	}

	// Find comment in collection
	// get its index, if 0 return false

	var db = dbManager.getDB();
	var feed = db.collection('FEED');

	feed.findOne({
		_id: ObjectID(req.query.post_id),
		comments: {
			$elemMatch: {
				_id: ObjectID(req.query.comment_id)
			}
		}
	}, { comments: 1 }, function(err, doc) {
		for(var i = 0; i < doc.comments.length; i++) {
			if(doc.comments[i]._id == req.query.comment_id) {
				if(i == 0) {
					res.send({status: 'DX-OK', message: false});
					return;
				} else {
					// if there are more comments send the index of the comment
					res.send({status: 'DX-OK', message: i});
					return;
				}
			}
		}
		res.send({status: 'DX-REJECTED', message: 'No matching comment'});
		return;
	});
});

router.get('/load_older_comments', function(req, res, next) {
	// Ensure we recieved a post id and comment id for indexing
	if(!('post_id' in req.query) || !req.query.post_id.length) {
		res.send({status: 'DX-REJECTED', message: 'No post ID specified'});
		return;
	}
	if(!('comment_id' in req.query) || !req.query.comment_id.length) {
		res.send({status: 'DX-REJECTED', message: 'No comment ID specified'});
		return;
	}
	var db = dbManager.getDB();
	var feed = db.collection('FEED');

	// Grab comments determine index & perform slice query
	var comment_index = 0;
	feed.findOne({
		_id: ObjectID(req.query.post_id),
		comments: {
			$elemMatch: {
				_id: ObjectID(req.query.comment_id)
			}
		}
	}, { comments: 1 }, function(err, doc) {
		if(err) {
			smtp.report_error('Error fetching older comments ( Resolving index ) :: ' + err, function(){});
			res.send({status: 'DX-FAILED', message: 'Server error occurred'});
			return;
		}

		comment_index = 0;
		for(var i = 0; i < doc.comments.length; i++) {
			if(doc.comments[i]._id == req.query.comment_id) {
				comment_index = i;
			}
		}
		var start_index = comment_index;
		for(var i = 0; i < 10; i++) {
			if(start_index >= 0) {
				start_index--;
			} else {
				break;
			}
		}
		// Perform slice query
		feed.findOne({
			_id: ObjectID(req.query.post_id),
			comments: {
				$elemMatch: {
					_id: ObjectID(req.query.comment_id)
				}
			}
		}, { comments: { $slice: [start_index, comment_index] } }, function(err, sliced) {
			if(err) {
				console.log(err);
				smtp.report_error('Error fetching older comments ( Slicing ) :: ' + err, function(){});
				res.send({status: 'DX-FAILED', message: 'Server error occurred'});
				return;
			}
			res.send({status: 'DX-OK', message: sliced.comments});
			return;
		});
	});
});

/** New version of getting comments **/
router.get('/comments', function(req, res, next) {
	/**
		Types
		------
		1. Get comments prior to 	=>		BEFORE
		2. Get comments since		=>		AFTER
	*/
	/**
		Determine the type of request, if no type is present return error
	*/
	if(!('type' in req.query) || !req.query.type) {
		res.send({status: 'DX-REJECTED', message: 'No request type specified'});
		return;
	}
	/**
		Ensure we received a valid type of request
	*/
	if(req.query.type != 'BEFORE' && req.query.type != 'AFTER') {
		res.send({status: 'DX-REJECTED', message: 'Invalid request type'});
		return;
	}
	/**
		If request == BEFORE
	*/
	if(req.query.type == 'BEFORE') {
		/**
			Ensure we recieved a post_id to speed up database query
		*/
		if(!('post_id' in req.query) || !req.query.post_id.length) {
			res.send({status: 'DX-REJECTED', message: 'No post ID specified'});
			return;
		}
		/**
			Ensure we received a comment_id to use as start index
		*/
		if(!('comment_id' in req.query) || !req.query.comment_id.length) {
			res.send({status: 'DX-REJECTED', message: 'No comment ID specified to start from'});
			return;
		}
		/**
			Fetch last 10 comments before specified comment
		*/
		var feed = dbManager.getDB().collection('FEED');
		feed.findOne({
			_id: ObjectID(req.query.post_id),
			comments: {
				$elemMatch: {
					_id: ObjectID(req.query.comment_id)
				}
			}
		}, { comments: 1 }, function(err, doc) {
			if(err) {
				smtp.report_error('Error while fetching comments BEFORE :: ' + err, function(){});
				res.send({status: 'DX-FAILED', message: 'Server error occurred'});
				return;
			}
			if(!doc) {
				res.send({status: 'DX-FAILED', message: 'Failed to retrieve comments'});
				return;
			}
			/**
				Slice manually since MongoDB doesn't offer reverse-skip slicing
			*/
			/**
				Find the comment that was specified
			*/
			/** This will be our container for parsed comments **/
			var to_return = [];
			/** This variable maintains a distance of 10 if possible **/
			var last_comment = 0;
			for(var i = 0; i < doc.comments.length; i++) {
				if(i > 10) {
					last_comment ++;
				}
				if(String(doc.comments[i]._id) == req.query.comment_id) {
					/**
						Iterate through comments again starting at last_comment
						through to `i` and push comment into container `to_return`
					*/
					for(var t = last_comment; t < i; t++) {
						to_return.push(doc.comments[t]);
					}
					/**
						Return collection to user
					*/
					res.send({status: 'DX-OK', message: to_return});
					return;
				}
			}
			/**
				If we get this far something wrong occurred
			*/
			res.send({status: 'DX-FAILED', message: 'Server error occurred'});
			return;
		});
	} /** End of request type `BEFORE` **/
	if(req.query.type == 'AFTER') {
		/**
			Ensure we received a post_id to speed up query
		*/
		if(!('post_id' in req.query) || !req.query.post_id.length) {
			res.send({status: 'DX-REJECTED', message: 'No post ID specified'});
			return;
		}
		if(!('comment_id' in req.query) || !req.query.comment_id.length) {
			res.send({status: 'DX-REJECTED', message: 'No comment ID specified'});
			return;
		}
		var feed = dbManager.getDB().collection('FEED');
		feed.findOne({
			_id: ObjectID(req.query.post_id),
		}, function(err, doc) {
			console.log(doc);
			if(err) {
				smtp.report_error('Error occurred fetching comments AFTER :: ' + err, function(){});
				res.send({status: 'DX-FAILED', message: 'Server error occurred'});
				return;
			}
			if(!doc) {
				res.send({status: 'DX-FAILED', message: 'Failed to retrieve comments'});
				return;
			}
			if(!('comments' in doc) || !doc.comments.length) {
				res.send({status: 'DX-OK', message: null});
				return;
			}
			/**
				Splice comments manually returning the following comments of
				specified comment
			*/
			/** Collection of comments to return **/
			var to_return = [];
			/**
				Used to determine if we've passed the specified comment and should
				start adding comments to collection `to_return`
			*/
			var start_adding = (req.query.comment_id == 0) ? true : false;
			for(var i = 0; i < doc.comments.length; i++) {
				if(!start_adding) {
					if(String(doc.comments[i]._id) == req.query.comment_id) {
						start_adding = true;
						continue;
					}
				}
				if(start_adding) {
					to_return.push(doc.comments[i]);
				}
			}
			/**
				Return collected comments
			*/
			res.send({status: 'DX-OK', message: to_return});
			return;
		});
	} /** End of comment type `AFTER` **/
});




/*
	Soon to be deprecated version of getting post comments
*/
router.get('/get_post_comments', function(req, res, next) {
	// ensure we recieved a post_id
	if(!('post_id' in req.query) || !req.query.post_id.length) {
		res.send({status: 'DX-REJECTED', message: 'No post id specified'});
		return;
	}

	// fetch comments for specified post
	var db = dbManager.getDB();
	var feed = db.collection('FEED');
	feed.findOne({
		_id: ObjectID(req.query.post_id)
	}, { comments: { $slice: -4 } }, function(err, doc) {
		if(err) {
			smtp.report_error('Error occurred fetching comments :: ' + err, function(){});
			return;
		}
		res.send({status: 'DX-OK', message: doc.comments});
		return;
	});
});

router.post('/post_comment', function(req, res, next) {

	// Handle all authentication and respond if necessary
	if(!authManager.json_is_authenticated(req, res)) {
		return;
	}

	// Limit posts per timeframe ( 2 seconds => 30 comments per minute )
	if(!authManager.can_comment(req, res)) {
		res.send({status: 'DX-REJECTED', message: 'Must wait 2 seconds before posting another comment'});
		return;
	}
	
	// Ensure a post ID was given
	if(!('post_id' in req.body) || !req.body.post_id.length) {
		res.send({status: 'DX-REJECTED', message: 'No post specified'});
		return;
	}

	// Ensure comment text was given
	if(!('text' in req.body) || !req.body.text.length) {
		res.send({status: 'DX-REJECTED', message: 'Cannot post empty comments'});
		return;
	}
	var new_comment = {
		_id: new ObjectID(),
		poster_username: req.session.USERNAME,
		poster_id: req.session.USER_ID,
		text: req.body.text
	};
	// Validate the comment
	if(validate_comment(req.body.text)) {		
		// update post pushing this comment to array
		var db = dbManager.getDB();
		var feed = db.collection('FEED');
		feed.update({
			_id: ObjectID(req.body.post_id),
			poster_username: req.session.USERNAME,
			poster_id: req.session.USER_ID
		}, { $push: { comments: new_comment } }, function(err, result) {
			if(err) {
				smtp.report_error('MongoDB Error occurred while posting comment :: ' + err, function(){});
				res.send({status: 'DX-FAILED', message: 'Error occurred while posting comment'});
				return;
			}
			authManager.inc_comment(req);
			res.send({status: 'DX-OK', message: result})
			return;
		});
	}
});

router.post('/save_post_edit', function(req, res, next) {

	// Handle all authentication and respond if necessary
	if(!authManager.json_is_authenticated(req, res)) {
		return;
	}

	// ensure recieved post_id
	if(!('post_id' in req.body) || req.body.post_id.length != 24) {
		res.send({status: 'DX-REJECTED', message: 'No post ID specified'});
		return;
	}

	// ensure received new description
	if(!('text') in req.body || !req.body.text.length) {
		res.send({status: 'DX-REJECTED', message:'No description specified'});
		return;
	}

	// ensure text is not already the same
	var db = dbManager.getDB();
	var feed = db.collection('FEED');

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

		if(validate_post_description(req.body.text) == 'short') {
			res.send({status: 'DX-REJECTED', message: 'Description must be at least 4 characters'});
			return;
		}

		if(validate_post_description(req.body.text) == 'long') {
			res.send({status: 'DX-REJECTED', message: 'Description must not exceed 2,500 characters'});
			return;
		}

		feed.update({
			_id: ObjectID(req.body.post_id), // POST ID
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

// get market feed
router.get('/get_feed', function(req, res, next) {

	// Set sale filter index && general filter index
	var si = ('si' in req.query && parseInt(req.query.si) > 0) ? req.query.si : 0;
	var gi = ('gi' in req.query && parseInt(req.query.gi) > 0) ? req.query.gi : 0;
	var minID = ('minID' in req.query && req.query.minID.length == 24) ? req.query.minID : 0;

	// get feed data for each
	var db = dbManager.getDB();
	var feed = db.collection('FEED');

	var iteration = 0;

	var feedObj = {};

	// find by id sort descending, grab following 50 posts
	if(minID == 0) {
		feed.find({
		}, { comments: { $slice: -4 } }).sort({_id: -1}).limit(10).toArray(function(err, feed) {
			res.send({ status: 'DX-OK', message: feed });
			return;
		});
	} else {
		feed.find({
			_id: {
				$gt: ObjectID(minID)
			}
		}, { comments: { $slice: -4 } }).skip(1).sort({_id: -1}).limit(10).toArray(function(err, feed) {
			res.send({ status: 'DX-OK', message: feed });
			return;
		});
	}
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

// Catch state request
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

function validate_comment(string) {
	return (string.length >= 2 && string.length <= 500) ? true : false;
}




















