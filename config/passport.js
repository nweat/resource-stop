var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var mongoose = require('mongoose');
var User = mongoose.model('User');

/*
 * Here we create a new LocalStrategy where we have our logic on how to authenticate a user given a username and password. 
 * Note that this function calls the validPassword() function that we just created. 
 * 
 * 
 * 
 * */


passport.use(new LocalStrategy( //must define strategy before use

  function(username, password, done) {
    User.findOne({ username: username }, function (err, user) { //get user
      if (err) { return done(err); }
      if (!user) {
        return done(null, false, { message: 'Incorrect username' }); // check if user exists
      }
      if (!user.validPassword(password)) {
        return done(null, false, { message: 'Incorrect password' }); //validate password for user
      }
      return done(null, user);
    });
  }
  
));
