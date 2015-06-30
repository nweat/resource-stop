var mongoose=require('mongoose');
var passport = require('passport');
var express = require('express');
var jwt = require('jsonwebtoken');
var jwtt = require('express-jwt');

var Post = mongoose.model('Post');
var Comment = mongoose.model('Comment');
var User = mongoose.model('User');
var auth = jwtt({secret: 'SECRET', userProperty: 'payload'}); //middleware for authenticating users
/*
 * The userPropery option specifies which property on req to put our payload from our tokens.
 *  By default it's set on user but we're using payload instead to avoid any conflicts with passport 
 * (it shouldn't be an issue since we aren't using both methods of authentication in the same request). 
 * This also avoids confusion since the payload isn't an instance of our User model.
 * 
 * 
 * 
 * Now we can use the middleware we just defined to require authentication on specific routes. 
 * In our case, we'd want to authenticate users whenever they try to write to our application, 
 * such as when they're posting or commenting.
 * */

var router = express.Router();




/* http://mongoosejs.com/docs/queries.html
 * Here we see that the query was executed immediately and the results passed to our callback. 
 * All callbacks in Mongoose use the pattern: callback(error, result). 
 * If an error occurs executing the query, the error parameter will contain an error document, and result will be null. 
 * If the query is successful, the error parameter will be null, and the result will be populated with the results of the query.
 * 
*/

/*
 * 
 * When defining routes with Express.js, two variables will get passed to the handler function. 
 * req, which stands for "request", contains all the information about the request that was made 
 * to the server including data fields. res, which stands for "response", is the object used to respond to the client.
 * */


router.get('/posts', function(req, res, next) {  //next is a callback function //implemented
  Post.find(function(err, posts){  //posts will contain the results
    if(err){ return next(err); }

   res.json(posts); //same as res.send(), pass json formatted results to response object which is sent to angular
  }); 
});


router.post('/posts', auth, function(req, res, next) {  //implemented
  var post = new Post(req.body);
  post.author = req.payload.username; //access username from payload 
  //or 
  //post.title = req.body.title;
  //post.link = req.body.link;
  
    Post.count({link: req.body.link}, function(err, count){ 
    if(err){ return next(err); }

    if(count == 0){ //if resource link doesnt already exist then save it
    post.save(function(err, post){
    if(err){ return next(err); }

    res.json(post);
  });
    }
   else{
      return res.status(400).json({message: 'Resource already exists'}); //pass error to client
    } 
  })


});



/*
 * 
 * Now when we define a route URL with :post in it, this function will be run first. 
 * Assuming the :post parameter contains an ID, our function will retrieve the post object 
 * from the database and attach it to the req object after which the route handler function will be called.
 * 
 * */
 
router.param('post', function(req, res, next, id) {
  var query = Post.findById(id);

  query.exec(function (err, post){
    if (err) { return next(err); }
    if (!post) { return next(new Error('can\'t find post')); }

    req.post = post;
    return next();
  });
});



router.param('comment', function(req, res, next, id) { //automatically retreive comments based on parameter
  var query = Comment.findById(id);

  query.exec(function (err, comment){
    if (err) { return next(err); }
    if (!comment) { return next(new Error('can\'t find post')); }

    req.comment = comment;
    return next();
  });
});



//http://mongoosejs.com/docs/populate.html
router.get('/posts/:post', function(req, res, next) {   //implemented
  req.post.populate('comments', function(err, post) { //req.post has the post we want to work with so for this post also get the comments
    if (err) { return next(err); }

    res.json(post);
  });
});



router.put('/posts/:post/upvote', auth, function(req, res, next) {  //implemented
  req.post.upvote(function(err, post){
    if (err) { return next(err); }
    
    res.json(post);
  });
});



router.put('/posts/:post/update', auth, function(req, res, next) {  //implemented
  Post.findByIdAndUpdate(req.post._id, { $set: { title: req.body.title, category: req.body.category, link: req.body.link, info: req.body.info }}, function (err, updated) {
  if (err) return next(err);

  res.status(200).json({message: 'Success!'}); //200 is success // 400 is error
});
});


router.put('/posts/:post/delete', auth, function(req, res, next) {  //implemented
  Post.remove({_id: req.post._id},function(err){ //remove the post
    if (err) return next(err);

    Comment.remove({post: req.post._id},function(err){ //remove comments as well
       if (err) return next(err);

       res.status(200).json({post: req.post._id});
    })

    

  })
});



router.post('/posts/:post/comments', auth, function(req, res, next) {
  var comment = new Comment(req.body);
  comment.post = req.post; //get param with id
  comment.author = req.payload.username;

  comment.save(function(err, comment){
    if(err){ return next(err); }

    req.post.comments.push(comment); //save reference in posts table so there exists a link between posts and comments
    req.post.save(function(err, post) {
     if(err){ return next(err); }

      res.json(comment);
    });
  });
});

router.put('/posts/:post/comments/:comment/upvote', auth, function(req, res, next) {  //implemented
  req.comment.upvoteCom(function(err, comment){ //upvote comment only for select post and comment
    if (err) { return next(err); }
    
    res.json(comment);
  });
});

router.put('/posts/:post/comments/:comment/downvote', auth, function(req, res, next) {  //implemented
  req.comment.downvoteCom(function(err, comment){ //upvote comment only for select post and comment
    if (err) { return next(err); }
    
    res.json(comment);
  });
});



//==================ROUTES FOR HANDLING LOGIN AND REGISTRATION

router.post('/register', function(req, res, next){
  if(!req.body.username || !req.body.password){
    return res.status(400).json({message: 'Please fill out all fields'});
  }

  var user = new User();

  user.local.username = req.body.username;

  user.setPassword(req.body.password);

  User.count({'local.username': req.body.username}, function(err, count){ //check if user already exists
    if(err){ console.log('err '+ err); }

    if(count == 0){ //if username doesnt already exist then save it
    user.save(function (err){
    if(err){ return next(err); }

    return res.json({token: user.generateJWT()}) //generate token for user and send back to front end for use
  });
    }
   else{
    return res.status(400).json({message: 'Username already exists'});
    }
   
  }) 
});



/*
 * 
 * The passport.authenticate('local') middleware uses the LocalStrategy we created earlier. 
 * We're using a custom callback for the authenticate middleware so we can return error messages to the client. 
 * If authentication is successful we want to return a JWT token to the client just like our register route does.
 * 
 * */

router.post('/login', function(req, res, next){
  if(!req.body.username || !req.body.password){
    return res.status(400).json({message: 'Please fill out all fields'});
  }
 //passportjs.org/guide/authenticate
  passport.authenticate('local', function(err, user, info){  // will authenticate against localstrategy in passport.js, using custom function here
    if(err){ return next(err); }

    if(user){
      return res.json({token: user.generateJWT()}); //if logged in successful generate a signed token and return it to the client
    } else {
      return res.status(401).json(info); // return info messages if error
    }
  })(req, res, next);
});




router.get('/auth/google', passport.authenticate('google', { scope: [
       'https://www.googleapis.com/auth/plus.login'] 
}));


router.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect to index.ejs.
  res.redirect('/');
  });



 router.get('/googleuser',function(req,res,next){
 // console.log('results: ' + req.user.displayName+ req.user._json.image.url);

  if(req.user){
   return res.status(200).json({token: setjwtGoogle(req.user.id,req.user.displayName,req.user._json.image.url)});
  }
  else{
   return res.status(200).json({token: false});
  }

 });


 router.get('/logout', function(req, res) {
        req.logout();
        res.redirect('/');
 });


/* GET home page. */
router.get('/', function(req, res, next) {
   var googletoken = '';

  if(req.user){
    res.render('index', { user: req.user, token: setjwtGoogle(req.user.id,req.user.displayName,req.user._json.image.url) })
    }
  else{
    res.render('index', { user: false, token: false});
  }

  
});


// route middleware to make sure a user is logged in
function isLoggedIn(req, res, next) {

    // if user is authenticated in the session, carry on
    if (req.isAuthenticated())
        return next();

    // if they aren't redirect them to the home page
    res.redirect('/');
}

function setjwtGoogle(id,username,image){
  var today = new Date();
  var exp = new Date(today);
  exp.setDate(today.getDate() + 60);

  return jwt.sign({
    _id: id,
    username: username,
    image:image,
    exp: parseInt(exp.getTime() / 1000),
  }, 'SECRET');
}


module.exports = router;
