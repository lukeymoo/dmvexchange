'use strict';

var DB = require('mongodb').Db;
var MongoClient = require('mongodb').MongoClient;

var uuid = require('node-uuid');
var crypto = require('crypto');

// Will hold the connection
var _db;

var pwd = 'xbBfpNMWdNFvhe8t21W0HS+MPsFVIOClQ0a4P3QnAgqE+XFt4kHQ556uwAQLfvNu';

var url = 'mongodb://me:' + pwd + '@localhost:27017/dmvexchange';

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
							MAIL: false
						}
						for(var collection in collections) {
							if(collections[collection].namespace == 'dmvexchange.USERS') {
								colExist.USERS = true;
							}
							if(collections[collection].namespace == 'dmvexchange.MAIL') {
								colExist.MAIL = true;
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
				token: uuid.v1(),
				cancel: uuid.v1() + '-cancel',
				used: false
			}
		};

		// Insert object
		userCol.insert(user, function(err, doc) {
			callback(err, doc);
		});
	},

	getDB: function() {
		return _db;
	}

};;