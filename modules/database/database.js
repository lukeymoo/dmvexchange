'use strict';

var DB = require('mongodb').Db;
var MongoClient = require('mongodb').MongoClient;

var uuid = require('node-uuid');
var crypto = require('crypto');

// Will hold the connection
var _db;

var pwd = '9d9066cf90755496ec7ed3392e638fc111';

var url = 'mongodb://dxb:' + pwd + '@localhost:27017/dmvexchange';

module.exports = {

	initMongo: function() {
		MongoClient.connect(url, function(err, dbObj) {
			if(err) {
				console.log('[-] MongoDB error :: ' + err);
			}
			if(dbObj) {
				_db = dbObj;
				console.log('[+] MongoDB Connected !');
				dbObj.collections(function(err, collections) {
					if(err) {
						console.log('[-] MongoDB error getting collections');
					}
					// Create collections as needed
					if(collections) {
						var colExist = {
							USERS: false,
							MAIL: false,
							BAD_REQUESTS: false
						};
						for(var collection in collections) {
							if(collections[collection].namespace == 'dmvexchange.USERS') {
								colExist.USERS = true;
							}
							if(collections[collection].namespace == 'dmvexchange.MAIL') {
								colExist.MAIL = true;
							}
							if(collections[collection].namespace == 'dmvexchange.BAD_REQUESTS') {
								colExist.BAD_REQUESTS = true;
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
						if(!colExist.BAD_REQUESTS) {
							// Stores bad request to help identify bots
							dbObj.createCollection('BAD_REQUESTS', function(){});
							console.log('[+] MongoDB Created collection BAD_REQUESTS');
						}
					}
				});
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
				{ username: userObj.username },
				{ email: userObj.email }
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

	recordBadRequest: function(req) {
		var addr = req.ip || false;

		if(!addr) {
			console.log('[-] Failed to capture bad request');
			return;
		}

		var db = _db;
		var reqCol = db.collection('BAD_REQUESTS');

		// insert the IP and path requested
		reqCol.update({
			ip: addr
		}, { $push: { paths: req.originalUrl }}, {upsert: true});
		console.log('[+] Bad request has been logged');
	},

	findMail: function(sessionObj) {
		var db = _db;
		var mailCol = db.collection('MAIL');

		mailCol.find({
		}).sort(-1).limit(60).toArray();
	},

	getDB: function() {
		return _db;
	}

};;
