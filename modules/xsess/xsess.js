'use strict';

/**
	Iterates through configuration and determines
	if the current path matches any that have been listed
	if it has been listed, the server will determine if (a) specified
	variable(s) meets (a) requirement(s) and performs appropriate action(s).

	EX: session.LOGGED_IN == true || session.USERNAME == 'administrator'
	etc..

	Middleware
*/

/**
	Holds middleware configuration
*/
var config = {};

var exports = module.exports = function xsess(options, settings) {
	var opts = options || [];

	var settings = settings || {};

	// detect mis-spelled setting
	if('defaultKeyPair' in settings) {
		console.log('xsess: Found setting `defaultKeyPair`, did you mean `defaultKeyPairs`?');
	}

	// set config
	config.strict = settings.strict || false;
	config.sendTo = settings.sendTo || '/login';
	config.defaultKeyPairs = settings.defaultKeyPairs || settings.defaultKeyPair || '';

	// ensure paths/requirements were given
	if(opts.length < 1) {
		console.log('xsess: No logic given, all access granted');
		return function(req, res, next) { next(); };
	}

	/**
		Remove paths with no logic from config if no default
		key/value pair is specified, otherwise assign the default

		Assign default sendTo paths
	*/
	for(var i = 0; i < opts.length; i++) {
		// Key/value pair
		if(!opts[i].vars || opts[i].vars.length < 1) {

			if(config.defaultKeyPairs == '') {
				console.log('xsess: Path => `' + opts[i].path + '` has no assigned requirements, disregarding..');
				opts.splice(i, 1);
				i -= 1;
			} else {
				console.log('xsess: Path => `' + opts[i].path + '` has no assigned requirements, assigning given default ' + JSON.stringify(config.defaultKeyPairs));
				opts[i].vars = config.defaultKeyPairs;
			}
		} else {
			console.log('xsess: Path => `' + opts[i].path + '` requires ' + JSON.stringify(opts[i].vars));
		}
		// SendTo path
		if(!opts[i].sendTo || opts[i].sendTo.length < 1) {
			console.log('xsess: Path => `' + opts[i].path + '` has no redirect route, using default `/login`');
			opts[i].sendTo = config.sendTo;
		} else {
			console.log('xsess: Path => `' + opts[i].path + '` redirects to ' + opts[i].sendTo);
		}
	}

	for(var i in config.defaultKeyPairs) {
		console.log('Default key item: ' + i + ': ' + config.defaultKeyPairs[i]);
	}
	console.log('Default sendTo route: ' + config.sendTo);

	return function xsess(req, res, next) {
		// ensure sessions are enabled
		if(!'session' in req || !req.session) {
			console.log('xsess: Must enable sessions to use this middleware');
			next();
			return;
		}

		checkURL(req, opts, function(match) {
			if(typeof match === 'object') {
				
				// check the `vars` in session
				for(var key in match.options[match.index].vars) {
					// undefined in session
					if(!(key in req.session)
						|| 'undefined' === typeof req.session.key
						|| req.session.key.length < 1) {
						// redirect if strict mode
						// if not strict mode do nothing
						if(config.strict) {
							res.redirect(match.options[match.index].sendTo + '?xpath=' + req.path.substring(1));
							return;
						} else {
							console.log('xsess: Path `' +  match.options[match.index].path + '` failed, but did not redirect b/c strict mode is disabled(default=false)');
						}

					} else {
						// if its defined check its value
						if(req.session.key != match.options[match.index].vars[key]) {
							console.log('xsess: `' + key + '` in session != ' + match.options[match.index].vars[key]);
							res.redirect(match.options[match.index].sendTo + '?xpath=' + req.path.substring(1));
							return;
						}
					}

				}
			}
			next();
		});
	};
};

/**
	Returns config and matched index if found || empty object
	@param {Object}, {Object}
	@return {Object}
*/
function checkURL(req, options, callback) {
	var path = String(req.path);
	console.log('Path: ' + path);

	// disallow `/` as first char in regex for non-root paths
	if(path.length > 1) {
		if(path.substring(0, 1) == '/') {
			path = path.substring(1);
		}
	} else {
		// if there is one character `/`
		path = '^/$';
	}

	var regex = new RegExp(path, 'i');

	if(options.length > 0) {
		for(var i = 0; i < options.length; i++) {
			if(regex.test(options[i].path)) {
				console.log('xsess: Regex: ' + path + ' Matched: ' + req.path + ' with setting: ' + options[i].path);
				callback({ index: i, options: options });
				return;
			}
		}
		console.log('xsess: No match found');
	}
	callback(false);
};
