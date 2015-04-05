'use strict';

var pageObj = {};

pageObj = {
	/**
		FORMS / MENUS
	*/
	headerLoginFormContainer: '#headerLoginFormContainer',
	headerLoginForm: '#headerLoginForm',
	headerMenu: '#headerMenu',
	accountCurrentPassword: '#accountPanel #currentPassword',
	accountNewPassword: '#accountPanel #newPassword',
	accountNewPasswordAgain: '#accountPanel #newPasswordAgain',
	accountChangePasswordButton: '#accountPanel button',
	loginFormContainer: '#loginFormContainer',
	loginForm: '#loginForm',

	/** FORM MESSAGES **/
		loginFormErrorContainer: '#loginFormErrorContainer',
		accountMessage: '#accountMessage',

	/** FORM ELEMENTS **/
		loginFormUsername: '#loginForm #username',
		loginFormPassword: '#loginForm #password',
		loginFormSubmitButton: '#loginFormContainer button',
	registerFormContainer: '#registerFormContainer',
	registerForm: '#registerForm',

	/** FORM ELEMENTS **/
		registerFormFirstname: '#registerForm #firstname',
		registerFormLastname: '#registerForm #lastname',
		registerFormEmail: '#registerForm #email',
		registerFormEmailAgain: '#registerForm #emailAgain',
		registerFormUsername: '#registerForm #username',
		registerFormPassword: '#registerForm #password',
		registerFormPasswordAgain: '#registerForm #passwordAgain',
		registerFormTOS: '#registerForm #tosContainer input',
		registerFormSubmitButton: '#registerFormContainer button',

	/** FORM ERROR FIELDS **/
		registerFormNameError: '#registerForm #nameError',
		registerFormEmailError: '#registerForm #emailError',
		registerFormEmailAgainError: '#registerForm #emailAgainError',
		registerFormUsernameError: '#registerForm #usernameError',
		registerFormPasswordError: '#registerForm #passwordError',
		registerFormTOSError: '#registerForm #tosError',
	/**
		BUTTONS
	*/
	headerHome: '#headerLogo',
	headerMenuButton: '#headerMenuButton',
	headerLoginButton: '#headerControls #left',
	headerSignupButton: '#headerControls #right',
	headerMailButton: this.headerLoginButton,
	headerProfileButton: this.headerSignup
};

define(['jquery', 'auth', 'accountPanel'], function($, common, acc) {
	var module = {};

	module = {
		
		isVisible: isVisible,
		handlePageClick: handlePageClick,
		toggleHeaderLogin: toggleHeaderLogin,
		toggleMenu: toggleMenu,
		/**
			Bind functions to objects depending on page & login status
		*/
		bindPage: function(page, isLogin) {
			
			/** TO BE ENABLED WHEN I HAVE TIME **/
			//$(document).on('click', pageObj.headerLoginButton, toggleHeaderLogin);

			// Give focus to Login / Register forms when presented
			module.giveFocus(page);
			// Bind events to header
			// Handles clicks outside specific elements
			$(document).on('click', handlePageClick);
			$(document).on('click', pageObj.headerMenuButton, toggleMenu);

			// Regularly query server for session status every 10 minutes
			if(isLogin) {
				setInterval(function() {
					common.isLoggedIn(function(res) {
						if(res.status == 'DX-OK') {
							if(res.message == 'false') {
								window.location.href = '/signin';
							} else {
								console.log(res);
							}
						}
					});
				}, 240000);
			}

			switch(page) {
				case 'Home':
					break;

				case 'Account':
					// Bind change password elements
					$(pageObj.accountCurrentPassword).on('keyup change', function() {
						if(!common.validatePassword($(this).val())) {
							common.setStyle($(pageObj.accountCurrentPassword), false);
						} else {
							common.setStyle($(pageObj.accountCurrentPassword), true);
						}
					});

					// new password
					$(pageObj.accountNewPassword).on('keyup change', function() {
						// Do new passwords match
						if($(pageObj.accountNewPassword).val() != $(pageObj.accountNewPasswordAgain).val()) {
							common.setStyle($(pageObj.accountNewPassword), false);
							common.setStyle($(pageObj.accountNewPasswordAgain), false);
						} else {
							common.setStyle($(pageObj.accountNewPassword), true);
							common.setStyle($(pageObj.accountNewPasswordAgain), true);
						}

						if(!common.validatePassword($(this).val())) {
							common.setStyle($(pageObj.accountNewPassword), false);
						} else {
							common.setStyle($(pageObj.accountNewPassword), true);
						}
					});
					// confirm new password
					$(pageObj.accountNewPasswordAgain).on('keyup change', function() {
						if(!common.validatePassword($(this).val())) {
							common.setStyle($(pageObj.accountNewPasswordAgain), false);
						} else {
							common.setStyle($(pageObj.accountNewPasswordAgain), true);
						}

						if($(pageObj.accountNewPassword).val().length > 0) {
							// Do new passwords match
							if($(pageObj.accountNewPassword).val() != $(pageObj.accountNewPasswordAgain).val()) {
								common.setStyle($(pageObj.accountNewPasswordAgain), false);
							} else {
								common.setStyle($(pageObj.accountNewPasswordAgain), true);
							}
						}
					});

					// Submit password change
					$(pageObj.accountChangePasswordButton).on('click', function() {
						if(common.validateChangePassword(pageObj)) {
							// If valid attempt, validate and send confirmation email
							var cp = $(pageObj.accountCurrentPassword).val();
							var np = $(pageObj.accountNewPassword).val();
							var npa = $(pageObj.accountNewPasswordAgain).val();
							acc.changePassword(cp, np, npa, function(res) {
								switch(res.status) {
									case 'DX-OK':
										// Clear all inputs
										$(pageObj.accountCurrentPassword).val('');
										$(pageObj.accountNewPassword).val('');
										$(pageObj.accountNewPasswordAgain).val('');

										// set the message
										$(pageObj.accountMessage).html(res.message);

										// show message -- animation will remove itself
										module.showAccountMessage(pageObj, true); // True adds good colors

										break;

									case 'DX-REJECTED':

										// Clear all inputs
										$(pageObj.accountCurrentPassword).val('');
										$(pageObj.accountNewPassword).val('');
										$(pageObj.accountNewPasswordAgain).val('');

										// Set the message
										$(pageObj.accountMessage).html(res.message);

										// show message -- animation will remove itself
										module.showAccountMessage(pageObj, false); // False adds bad colors
										break;

									case 'DX-FAILED':

										// Clear all inputs
										$(pageObj.accountCurrentPassword).val('');
										$(pageObj.accountNewPassword).val('');
										$(pageObj.accountNewPasswordAgain).val('');

										// Set the message
										$(pageObj.accountMessage).html(res.message);

										// show message -- animation will remove itself
										module.showAccountMessage(pageObj, false); // false adds bad colors
										break;
								}
							});
						}
					});
					break;

				case 'Sign in':
					// Detect errors and fill fields with returned values
					if(this.getUrlParam('err')) {
						// Set username display error
						$(pageObj.loginFormUsername).val(this.getUrlParam('u'));
						switch(this.getUrlParam('err')) {
							case 'invalid_login':
								this.showLoginError('Invalid login credentials');
								break;
							case 'invalid_username':
								this.showLoginError('Username did not meet format requirements');
								break;
							case 'invalid_password':
								this.showLoginError('Password did not meet format requirements');
								break;
						}
						// Bind event handler for message container
						$(pageObj.loginFormErrorContainer).on('click', function() {
							module.hideLoginError();
						});
					}

					// Bind event handlers to login form validation etc..
					$(pageObj.loginFormUsername).on('keyup change', function(e) {
						if(e.which == 13) {
							$(pageObj.loginFormSubmitButton).click();
						}
						if(!common.validateEmail($(pageObj.loginFormUsername).val())) {
							if(!common.validateUsername($(pageObj.loginFormUsername).val())) {
								common.setStyle($(pageObj.loginFormUsername), false);
							} else {
								common.setStyle($(pageObj.loginFormUsername), true);
							}
						} else {
							common.setStyle($(pageObj.loginFormUsername), true);
						}
					});
					$(pageObj.loginFormPassword).on('keyup change', function(e) {
						if(e.which == 13) {
							$(pageObj.loginFormSubmitButton).click();
						}
						if(!common.validatePassword($(pageObj.loginFormPassword).val())) {
							common.setStyle($(pageObj.loginFormPassword), false);
						} else {
							common.setStyle($(pageObj.loginFormPassword), true);
						}
					});
					$(pageObj.loginFormSubmitButton).on('click', function() {
						if(common.validateLoginForm(pageObj)) {
							$(pageObj.loginForm).submit();
						}
					});
					break;

				case 'Sign up':

					// Detect errors and present them
					if(this.getUrlParam('err')) {
						// Fill in all the fields with values returned
						$(pageObj.registerFormFirstname).val(this.getUrlParam('f'));
						$(pageObj.registerFormLastname).val(this.getUrlParam('l'));
						$(pageObj.registerFormEmail).val(this.getUrlParam('e'));
						$(pageObj.registerFormEmailAgain).val(this.getUrlParam('e'));
						$(pageObj.registerFormUsername).val(this.getUrlParam('u'));

						var errors = this.getUrlParam('err').split('|');
						for(var error in errors) {
							switch(errors[error]) {
								case 'F': // Invalid firstname
									$(pageObj.registerFormFirstname).val('');
									$(pageObj.registerFormNameError).html('Invalid name');
									showError($(pageObj.registerFormNameError));
									break;
								case 'L': // Invalid lastname
									$(pageObj.registerFormLastname).val('');
									$(pageObj.registerFormNameError).html('Invalid name');
									$(pageObj.registerFormNameError)
									break;
								case 'U': // Invalid username
									$(pageObj.registerFormUsername).val('');
									$(pageObj.registerFormUsernameError).html('Invalid username');
									showError($(pageObj.registerFormUsernameError));
									break;
								case 'E': // Invalid email
									$(pageObj.registerFormEmail).val('');
									$(pageObj.registerFormEmailAgain).val('');
									$(pageObj.registerFormEmailError).html('Invalid email address');
									showError($(pageObj.registerFormEmailError));
									break;
								case 'EM': // Emails didn't match
									$(pageObj.registerFormEmail).val('');
									$(pageObj.registerFormEmailAgain).val('');
									$(pageObj.registerFormEmailError).html('Emails did not match');
									showError($(pageObj.registerFormEmailError));
									break;
								case 'P': // Invalid password
									common.setStyle($(pageObj.registerFormPassword), false);
									$(pageObj.registerFormPasswordError).html('Invalid password');
									showError($(pageObj.registerFormPasswordError));
									break;
								case 'PM': // Passwords didn't match
									common.setStyle($(pageObj.registerFormPassword), false);
									common.setStyle($(pageObj.registerFormPasswordAgain), false);
									$(pageObj.registerFormPasswordError).html('Passwords did not match');
									showError($(pageObj.registerFormPasswordError));
									break;
								case 'EIN': // Email in use
									$(pageObj.registerFormEmail).val('');
									$(pageObj.registerFormEmailAgain).val('');
									common.setStyle($(pageObj.registerFormEmail), false);
									$(pageObj.registerFormEmailError).html('Email is already in use');
									showError($(pageObj.registerFormEmailError));
									break;
								case 'UIN': // Username in use
									$(pageObj.registerFormUsername).val('');
									common.setStyle($(pageObj.registerFormUsername), false);
									$(pageObj.registerFormUsernameError).html('Username is already in use');
									showError($(pageObj.registerFormUsernameError));
									break;
							}
						}
					}

					// Bind first/lastname event handlers
					// First
					$(pageObj.registerFormFirstname).on('keyup change', function(e) {
						if(e.which == 13) {
							$(pageObj.registerFormSubmitButton).click();
						}
						if(!common.validateName($(pageObj.registerFormFirstname).val())) {
							common.setStyle($(pageObj.registerFormFirstname), false);
						} else {
							common.setStyle($(pageObj.registerFormFirstname), true);
						}
					});

					// Last
					$(pageObj.registerFormLastname).on('keyup change', function(e) {
						if(e.which == 13) {
							$(pageObj.registerFormSubmitButton).click();
						}
						if(!common.validateName($(pageObj.registerFormLastname).val())) {
							common.setStyle($(pageObj.registerFormLastname), false);
						} else {
							common.setStyle($(pageObj.registerFormLastname), true);
						}
					});

					// Validate emails
					// First entry
					$(pageObj.registerFormEmail).on('keyup change', function(e) {
						if(e.which == 13) {
							$(pageObj.registerFormSubmitButton).click();
						}

						if($(pageObj.registerFormEmailAgain).val().length > 0) {
							// do emails match ?
							if($(pageObj.registerFormEmail).val().toLowerCase() != $(pageObj.registerFormEmailAgain).val().toLowerCase()) {
								common.setStyle($(pageObj.registerFormEmail), false);
								common.setStyle($(pageObj.registerFormEmailAgain), false);
							} else {
								common.setStyle($(pageObj.registerFormEmail), true);
								common.setStyle($(pageObj.registerFormEmailAgain), true);
							}
						} else {
							common.setStyle($(pageObj.registerFormEmailAgain), true);
						}

						if(!common.validateEmail($(pageObj.registerFormEmail).val())) {
							common.setStyle($(pageObj.registerFormEmail), false);
						} else {
							common.setStyle($(pageObj.registerFormEmail), true);
						}
					});
					// Confirmation entry
					$(pageObj.registerFormEmailAgain).on('keyup change', function(e) {
						if(e.which == 13) {
							$(pageObj.registerFormSubmitButton).click();
						}

						if($(pageObj.registerFormEmail).val().length > 0) {
							// do emails match ?
							if($(pageObj.registerFormEmail).val().toLowerCase() != $(pageObj.registerFormEmailAgain).val().toLowerCase()) {
								common.setStyle($(pageObj.registerFormEmail), false);
								common.setStyle($(pageObj.registerFormEmailAgain), false);
							}  else {
								common.setStyle($(pageObj.registerFormEmail), true);
								common.setStyle($(pageObj.registerFormEmailAgain), true);
							}
						}

						if(!common.validateEmail($(pageObj.registerFormEmailAgain).val())) {
							common.setStyle($(pageObj.registerFormEmailAgain), false);
						} else {
							common.setStyle($(pageObj.registerFormEmailAgain), true);
						}
					});
					// validate username
					$(pageObj.registerFormUsername).on('keyup change', function(e) {
						if(e.which == 13) {
							$(pageObj.registerFormSubmitButton).click();
						}
						if(!common.validateUsername($(pageObj.registerFormUsername).val())) {
							common.setStyle($(pageObj.registerFormUsername), false);
						} else {
							common.setStyle($(pageObj.registerFormUsername), true);
						}
					});
					// Validate passwords
					// first entry
					$(pageObj.registerFormPassword).on('keyup change', function(e) {
						if(e.which == 13) {
							$(pageObj.registerFormSubmitButton).click();
						}
						// do passwords match
						if($(pageObj.registerFormPasswordAgain).val().length > 0) {
							if($(pageObj.registerFormPassword).val() != $(pageObj.registerFormPasswordAgain).val()) {
								common.setStyle($(pageObj.registerFormPassword), false);
								common.setStyle($(pageObj.registerFormPasswordAgain), false);
							} else {
								common.setStyle($(pageObj.registerFormPassword), true);
								common.setStyle($(pageObj.registerFormPasswordAgain), true);
							}
						}

						if(!common.validatePassword($(pageObj.registerFormPassword).val())) {
							common.setStyle($(pageObj.registerFormPassword), false);
						} else {
							common.setStyle($(pageObj.registerFormPassword), true);
						}
					});
					// Confirmation entry
					$(pageObj.registerFormPasswordAgain).on('keyup change', function(e) {
						if(e.which == 13) {
							$(pageObj.registerFormSubmitButton).click();
						}

						// do passwords match
						if($(pageObj.registerFormPassword).val().length > 0) {
							if($(pageObj.registerFormPassword).val() != $(pageObj.registerFormPasswordAgain).val()) {
								common.setStyle($(pageObj.registerFormPassword), false);
								common.setStyle($(pageObj.registerFormPasswordAgain), false);
							} else {
								common.setStyle($(pageObj.registerFormPassword), true);
								common.setStyle($(pageObj.registerFormPasswordAgain), true);
							}
						}

						if(!common.validatePassword($(pageObj.registerFormPasswordAgain).val())) {
							common.setStyle($(pageObj.registerFormPasswordAgain), false);
						} else {
							common.setStyle($(pageObj.registerFormPasswordAgain), true);
						}
					});
					// on TOS agreement
					$(pageObj.registerFormTOS).on('click', function() {
						if($(pageObj.registerFormTOS).is(':checked')) {
							$(pageObj.registerFormTOS).css('outline', 'none');
						}
					});
					// On submit validate then submit or present errors
					$(pageObj.registerFormSubmitButton).on('click', function() {
						if(common.validateRegisterForm(pageObj)) {
							$(pageObj.registerForm).submit();
						}
					});
					break;
			}
		},
		showAccountMessage: function(pageObj, type) {
			if(type) {
				$(pageObj.accountMessage).css('background-color', 'rgb(0, 200, 200)');
				$(pageObj.accountMessage).css('color', 'black');
			} else {
				$(pageObj.accountMessage).css('background-color', 'rgb(175, 0, 0)');
				$(pageObj.accountMessage).css('color', 'white');
			}

			// remove animation class
			$(pageObj.accountMessage).removeClass('showAccountMessage');

			// Wait 250 ms , allowing element to reset, add the animation
			setTimeout(function() {
				$(pageObj.accountMessage).addClass('showAccountMessage');
			}, 250);
			return;
		},
		hideAccountMessage: function(pageObj) {
			if($(pageObj.accountMessage).hasClass('showAccountMessage')) {
				$(pageObj.accountMessage).removeClass('showAccountMessage');
			}
			if(!$(pageObj.accountMessage).hasClass('showAccountMessage-reverse')) {
				$(pageObj.accountMessage).addClass('showAccountMessage-reverse');
			}
			return;
		},
		showError: function(obj) {
			$(obj).css('display', 'inline-block');
		},
		hideError: function(obj) {
			$(obj).css('display', 'none');
		},
		showLoginError: function(string) {
			$(pageObj.loginFormErrorContainer).html(string);

			if($(pageObj.loginFormErrorContainer).hasClass('showLoginErrors-reverse')) {
				$(pageObj.loginFormErrorContainer).removeClass('showLoginErrors-reverse');
			}
			if(!$(pageObj.loginFormErrorContainer).hasClass('showLoginErrors')) {
				$(pageObj.loginFormErrorContainer).addClass('showLoginErrors');
			}
		},
		hideLoginError: function() {
			$(pageObj.loginFormErrorContainer).html('');
			if($(pageObj.loginFormErrorContainer).hasClass('showLoginErrors')) {
				$(pageObj.loginFormErrorContainer).removeClass('showLoginErrors');
			}
			if(!$(pageObj.loginFormErrorContainer).hasClass('showLoginErrors-reverse')) {
				$(pageObj.loginFormErrorContainer).addClass('showLoginErrors-reverse');
			}
		},
		getUrlParam: getUrlParam,
		giveFocus: function(page) {
			switch(page) {
				case 'Sign in':
					$(pageObj.loginForm).find($(pageObj.loginFormUsername)).focus();
					break;
				case 'Sign up':
					$(pageObj.registerForm).find($(pageObj.registerFormFirstname)).focus();
					break;
			}
		}
	};

	return module;
});



/**
	Check if menu/form is visible
	equivalent to data-selected == true casted to boolean
*/
var isVisible = function(obj) {
	var status = false;
	if($(obj).attr('data-selected') === 'true') {
		status = true;
	}
	return status;
};


/**
	Handles clicks outside binded elements ( Closes any open overlays )
*/
var handlePageClick = function() {
	$(document).click(function(event) {
		if(!$(event.target).closest(pageObj.headerMenuButton).length) {
			if(!$(event.target).closest(pageObj.headerMenu).length) {
				if(isVisible(pageObj.headerMenu)) {
					toggleMenu();
				}
			}
		}
	})
};

/**
	Toggle animation type and state
*/
var toggleHeaderLogin = function() {
	var state = $(pageObj.headerLoginFormContainer).prop('data-selected');

	if(state === 'true') {
		if($(pageObj.headerLoginFormContainer).hasClass('showHeaderLogin')) {
			$(pageObj.headerLoginFormContainer).removeClass('showHeaderLogin');
		}
		if(!$(pageObj.headerLoginFormContainer).hasClass('showHeaderLogin-reverse')) {
			$(pageObj.headerLoginFormContainer).addClass('showHeaderLogin-reverse');
		}
		state = 'false';
	} else if(state === 'false') {
		if($(pageObj.headerLoginFormContainer).hasClass('showHeaderLogin-reverse')) {
			$(pageObj.headerLoginFormContainer).removeClass('showHeaderLogin-reverse');
		}
		if(!$(pageObj.headerLoginFormContainer).hasClass('showHeaderLogin')) {
			$(pageObj.headerLoginFormContainer).addClass('showHeaderLogin');
		}
		state = 'true';
	}

	$(pageObj.headerLoginFormContainer).prop('data-selected', state);
	return;
};


/**
	Toggle the header menu button
*/
var toggleMenu = function() {
	var state = $(pageObj.headerMenu).attr('data-selected');

	if(state === 'true') {
		if($(pageObj.headerMenu).hasClass('showHeaderMenu')) {
			$(pageObj.headerMenu).removeClass('showHeaderMenu');
		}
		if(!$(pageObj.headerMenu).hasClass('showHeaderMenu-reverse')) {
			$(pageObj.headerMenu).addClass('showHeaderMenu-reverse');
		}
		state = 'false';
	} else if(state === 'false') {
		if($(pageObj.headerMenu).hasClass('showHeaderMenu-reverse')) {
			$(pageObj.headerMenu).removeClass('showHeaderMenu-reverse');
		}
		if(!$(pageObj.headerMenu).hasClass('showHeaderMenu')) {
			$(pageObj.headerMenu).addClass('showHeaderMenu');
		}
		state = 'true';
	}

	$(pageObj.headerMenu).attr('data-selected', state);
	return;
};

// Get URL parameter
var getUrlParam = function(sParam) {
	var sPageURL = window.location.search.substring(1);
	var sURLVariables = sPageURL.split('&');
	for(var i = 0; i < sURLVariables.length; i++) {
		var sParameterName = sURLVariables[i].split('=');
		if (sParameterName[0] == sParam) {
			return sParameterName[1];
		}
	}
};