'use strict';

define(['jquery'], function($) {
	var module = {};
	module = {
		// Get the current users state
		getState: function(callback) {
			$.ajax({
				url: '/api/session'
			}).done(function(res) {
				if(res.state) {
					callback(res.state);
				}
			});
		},
		isLoggedIn: function(callback) {
			$.ajax({
				url: '/api/session',
				data: {
					r: 'state'
				}
			}).done(function(data) {
				callback(data);
			});
		},
		// Returns the current page title ( Excluding `DX - ` )
		getPage: function() {
			var title = $(document).find('title').html();
			return title.substring(5);
		},
		setStyle: function(element, type) {
			switch(type) {
				case true:
					element.css('outline', 'none');
					break;
				case false:
					element.css('outline', '2px solid rgb(175, 0, 0)');
					break;
			}
		},
		lower: function(obj) {
			obj.val(obj.val().toLowerCase());
		},
		validateChangePassword: function(pageObj) {
			var status = true;

			// confirmation password check by equality
			if($(pageObj.accountNewPassword).val() != $(pageObj.accountNewPasswordAgain).val()) {
				this.setStyle($(pageObj.accountNewPassword), false);
				this.setStyle($(pageObj.accountNewPasswordAgain), false);
				status = false;
			} else {
				this.setStyle($(pageObj.accountNewPassword), true);
				this.setStyle($(pageObj.accountNewPasswordAgain), true);
			}

			// current password
			if(!this.validatePassword($(pageObj.accountCurrentPassword).val())) {
				this.setStyle($(pageObj.accountCurrentPassword), false);
				status = false;
			} else {
				this.setStyle($(pageObj.accountCurrentPassword), true);
			}
			// new password
			if(!this.validatePassword($(pageObj.accountNewPassword).val())) {
				this.setStyle($(pageObj.accountNewPassword), false);
				status = false;
			} else {
				this.setStyle($(pageObj.accountNewPassword), true);
			}

			return status;
		},
		validateRegisterForm: function(pageObj, binderFunc) {
			var status = true;
			// Lower case names/email/username
			this.lower($(pageObj.registerFormFirstname));
			this.lower($(pageObj.registerFormLastname));
			this.lower($(pageObj.registerFormEmail));
			this.lower($(pageObj.registerFormEmailAgain));
			this.lower($(pageObj.registerFormUsername));

			// Validate names
			if(!this.validateName($(pageObj.registerFormFirstname).val())) {
				this.setStyle($(pageObj.registerFormFirstname), false);
				status = false;
			} else {
				this.setStyle($(pageObj.registerFormFirstname), true);
			}
			if(!this.validateName($(pageObj.registerFormLastname).val())) {
				this.setStyle($(pageObj.registerFormLastname), false);
				status = false;
			} else {
				this.setStyle($(pageObj.registerFormLastname), true);
			}

			// Validate emails
			if(!this.validateEmail($(pageObj.registerFormEmail).val())) {
				this.setStyle($(pageObj.registerFormEmail), false);
				status = false;
			} else {
				this.setStyle($(pageObj.registerFormEmail), true);
			}
			if(!this.validateEmail($(pageObj.registerFormEmailAgain).val())) {
				this.setStyle($(pageObj.registerFormEmailAgain), false);
				status = false;
			} else {
				this.setStyle($(pageObj.registerFormEmailAgain), true);
			}
			if($(pageObj.registerFormEmail).val() != $(pageObj.registerFormEmailAgain).val()) {
				status = false;
				this.setStyle($(pageObj.registerFormEmail), false);
				this.setStyle($(pageObj.registerFormEmailAgain), false);
			}

			// Validate username
			if(!this.validateUsername($(pageObj.registerFormUsername).val())) {
				this.setStyle($(pageObj.registerFormUsername), false);
				status = false;
			} else {
				this.setStyle($(pageObj.registerFormUsername), true);
			}

			// Validate passwords
			if(!this.validatePassword($(pageObj.registerFormPassword).val())) {
				this.setStyle($(pageObj.registerFormPassword), false);
				status = false;
			} else {
				this.setStyle($(pageObj.registerFormPassword), true);
			}
			if(!this.validatePassword($(pageObj.registerFormPasswordAgain).val())) {
				this.setStyle($(pageObj.registerFormPasswordAgain), false);
				status = false;
			} else {
				this.setStyle($(pageObj.registerFormPasswordAgain), true);
			}
			if($(pageObj.registerFormPassword).val() != $(pageObj.registerFormPasswordAgain).val()) {
				status = false;
				this.setStyle($(pageObj.registerFormPassword), false);
				this.setStyle($(pageObj.registerFormPasswordAgain), false);
			}

			// Ensure TOS checkbox is checked
			if(!$(pageObj.registerFormTOS).is(':checked')) {
				status = false;
				$(pageObj.registerFormTOS).css('outline', '1px solid rgb(175, 0, 0)');
				$(pageObj.registerFormTOSError).html('Must agree to register');
				this.showError($(pageObj.registerFormTOSError));
			} else {
				$(pageObj.registerFormTOS).css('outline', 'none');
				$(pageObj.registerFormTOSError).html('');
				this.hideError($(pageObj.registerFormTOSError));
			}

			return status;
		},
		showError: function(obj) {
			$(obj).css('display', 'inline-block');
		},
		hideError: function(obj) {
			$(obj).css('display', 'none');
		},
		validateLoginForm: function(pageObj) {
			var status = true;
			// Lower username/email
			this.lower($(pageObj.loginFormUsername));
			// Validate Email
			if(!this.validateUsername($(pageObj.loginFormUsername).val())) {
				// Validate username
				if(!this.validateEmail($(pageObj.loginFormUsername).val())) {
					this.setStyle($(pageObj.loginFormUsername), false);
					status = false;
				} else {
					this.setStyle($(pageObj.loginFormUsername), true);
				}
			} else {
				this.setStyle($(pageObj.loginFormUsername), true);
			}
			// Validate password
			if(!this.validatePassword($(pageObj.loginFormPassword).val())) {
				this.setStyle($(pageObj.loginFormPassword), false);
				status = false;
			} else {
				this.setStyle($(pageObj.loginFormPassword), true);
			}
			return status;
		},
		validateName: function(string) {
			var status = true;
			var reg = /^[A-Za-z]+(([\'-])?[A-Za-z]+$)/;
			if(!reg.test(string) || string.length < 2 || string.length > 32) {
				status = false;
			}
			return status;
		},
		validateEmail: function(string) {
			var status = true;
			var reg = /^([a-zA-Z0-9_.+-])+\@(([a-zA-Z0-9-])+\.)+([a-zA-Z0-9]{2,4})+$/;
			if(!reg.test(string)) {
				status = false;
			}
			return status;
		},
		validateUsername: function(string) {
			var status = true;
			var reg = /^[A-Za-z0-9_]+$/;
			if(!reg.test(string) || string.length < 2 || string.length > 15) {
				status = false;
			}
			return status;
		},
		validatePassword: function(string) {
			var status = true;
			if(string.length < 2 || string.length > 32) {
				status = false;
			}
			return status;
		}
	};
	return module;
});