'use strict';

var DB = require('mongodb').Db;
var MongoClient = require('mongodb').MongoClient;

var uuid = require('node-uuid');
var crypto = require('crypto');

var secret = require('../secret/secret');

// Will hold the connection socket
var _db;

var url = 'mongodb://' + secret._SECRET_USERNAME + ':' + secret._SECRET_MONGODB + '@72.47.237.205:27017/dmvexchange';

module.exports = {

	initMongo: function(callback) {
		console.log('Initializing MongoDB');
		MongoClient.connect(url, function(err, dbObj) {
			console.log('MongoDB connection callback started');
			if(err) {
				console.log('[-] MongoDB error :: ' + err);
			}
			if(dbObj) {
				_db = dbObj;
				console.log('[+] MongoDB Connected !');
				dbObj.collections(function(err, collections) {
					if(err) {
						console.log('[-] MongoDB error getting collections :: ' + err);
					}
					// Create collections as needed
					if(collections) {
						var colExist = {
							USERS: false,
							MAIL: false,
							FEED: false,
							EARLY_BIRD: false
						};
						for(var collection in collections) {
							if(collections[collection].namespace == 'dmvexchange.USERS') {
								colExist.USERS = true;
							}
							if(collections[collection].namespace == 'dmvexchange.MAIL') {
								colExist.MAIL = true;
							}
							if(collections[collection].namespace == 'dmvexchange.FEED') {
								colExist.FEED = true;
							}
							if(collections[collection].namespace == 'dmvexchange.EARLY_BIRD') {
								colExist.EARLY_BIRD = true;
							}
						}
						if(!colExist.USERS) {
							dbObj.createCollection('USERS', function(){});
							console.log('[+] MongoDB Created collection `USERS`');
						}
						if(!colExist.MAIL) {
							dbObj.createCollection('MAIL', function(){});
							console.log('[+] MongoDB Created collection `MAIL`');
						}
						if(!colExist.FEED) {
							dbObj.createCollection('FEED', function(){});
							dbObj.ensureIndex({post_text: 'text'}, function(){});
							console.log('[+] MongoDB Created collection `FEED`');
						}
						if(!colExist.EARLY_BIRD) {
							dbObj.createCollection('EARLY_BIRD', function(){});
							console.log('[+] MongoDB Created collection `EARLY_BIRD`');
						}
					}
				});
				// Callback
				callback();
			} else {
				console.log('No connection object returned');
			}
		});
	},

	doesUserExist: function(u, e, callback) {
		var db = _db;
		var usrCol = db.collection('USERS');

		usrCol.findOne({
			$or: [
				{ username: u },
				{ email: e }
			]
		}, function(err, col) {
			if(err) {
				console.log('[-] MongoDB error while checking if user exists :: ' + err);
			}
			
			// prepare for handling
			col = col || {username: '', email: ''};

			var retOne = (col.username == u) ? true : false;
			var retTwo = (col.email == e) ? true : false;
			callback(retOne, retTwo);
		});
	},

	findByUsernameOrEmail: function(string, callback) {
		var db = _db;
		var usrCol = db.collection('USERS');

		usrCol.findOne({
			username: string.toLowerCase()
		}, function(err, doc) {
			if(err) {
				console.log('[-] MongoDB error while finding by username :: ' + err);
			}
			callback(err, doc);
		});

	},

	findByLogin: function(userObj, callback) {
		var db = _db;
		var usrCol = db.collection('USERS');

		usrCol.findOne({
			$or: [
				{ username: userObj.username.toLowerCase() },
				{ email: userObj.email.toLowerCase() }
			],
			password: crypto.createHash('md5').update(String(userObj.password)).digest('hex')
		}, function(err, doc) {
			if(err) {
				console.log('[-] MongoDB error while finding by login :: ' + err);
			}
			callback(err, doc);
		});

	},

	saveAccount: function(userObj, callback) {
		var db = _db;
		var userCol = db.collection('USERS');

		var tokens = {
			good: uuid.v1(),
			bad: uuid.v1() + '-cancel'
		};

		// The user object
		var user = {
			name: {
				first: userObj.f,
				last: userObj.l
			},
			username: userObj.u,
			email: userObj.e,
			password: crypto.createHash('md5').update(String(userObj.p)).digest('hex'),
			activation: {
				token: tokens.good,
				cancel: tokens.bad,
				used: false
			}
		};

		// Insert object
		userCol.insert(user, function(err, doc) {
			callback(err, doc, tokens);
		});
	},

	getDB: function() {
		return _db;
	}

};;
