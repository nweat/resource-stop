var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
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


passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});
passport.use(new GoogleStrategy({ //define Google strategy
  clientID: '591455568599-i2dotrcqunl8l1r51robprf7r5d6bhmv.apps.googleusercontent.com',
  clientSecret: 'eyjl4uRVVREM7IlHzvjOPfov',
  callbackURL: "https://nikki-resource-stop.herokuapp.com/auth/google/callback"
   // returnURL: 'http://192.168.1.56:3000/auth/google/return',
    //realm: 'http://192.168.1.56:3000/'
  },
 function(accessToken, refreshToken, profile, done) {
    // asynchronous verification, for effect...
    process.nextTick(function () {
      
      // To keep the example simple, the user's Google profile is returned to
      // represent the logged-in user.  In a typical application, you would want
      // to associate the Google account with a user record in your database,
      // and return that user instead.
      return done(null, profile);
    });
  }
));