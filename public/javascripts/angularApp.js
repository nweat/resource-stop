var app = angular.module('flapperNews', ['ui.router', 'ngDialog', 'ngAnimate']);

app.config([
'$stateProvider',
'$urlRouterProvider',
function($stateProvider, $urlRouterProvider) {

  $stateProvider
    .state('home', {
      url: '/home',
      templateUrl: '/home.html',
      controller: 'MainCtrl',
       resolve: { //call function when appropriate, call here on resolve
    postPromise: ['posts','auth', function(posts,auth){ //pass posts service
     //if user has logged in with google, set the local storage with google profile details
      return posts.getAll();
    }]
  }, onEnter: ['auth', function(auth){
      auth.isGoogleUser(); 
  }]}).    
    
    /*
     * 
     * The Angular ui-router detects we are entering the posts state and will then automatically query the server 
     * for the full post object, including comments. Only after the request has returned will the state finish loading.
       To get access to the post object we just retrieved in the PostsCtrl, instead of going through the posts service,  
     * the specific object will be directly injected into our PostsCtrl. 
     * */
    state('posts', {
      url: '/posts/{id}',
      templateUrl: '/posts.html',
      controller: 'PostsCtrl',
      resolve: {
    post: ['$stateParams', 'posts', function($stateParams, posts) { //inject post object into posts controller
      return posts.get($stateParams.id);
    }]
  }
    }).state('login', {
  url: '/login',
  templateUrl: '/login.html',
  controller: 'AuthCtrl',
  onEnter: ['$state', 'auth', function($state, auth){
    if(auth.isLoggedIn()){
      $state.go('home');
    }
  }]
})
.state('register', {
  url: '/register',
  templateUrl: '/register.html',
  controller: 'AuthCtrl',
  onEnter: ['$state', 'auth', function($state, auth){
    if(auth.isLoggedIn()){
      $state.go('home');
    }
  }]
})

  $urlRouterProvider.otherwise('home');
}]);



app.factory('auth', ['$http', '$window', function($http, $window){
var auth = {};

auth.saveToken = function (token){
  $window.localStorage['flapper-news-token'] = token;
};

auth.getToken = function (){
  return $window.localStorage['flapper-news-token'];
};

//logged in with google
auth.isGoogleUser = function(){ //redirect to home and get googleuser details to show in nav ctrl
 $http.get('googleuser').success(function(data){
  if(data.token != false){
   auth.saveToken(data.token);
  }
  });
};

/*
 * 
 * If a token exists, we'll need to check the payload to see if the token has expired, 
 * otherwise we can assume the user is logged out. The payload is the middle part of 
 * the token between the two .s. It's a JSON object that has been base64'd. 
 * We can get it back to a stringified JSON by using $window.atob(), and then back to a 
 * javascript object with JSON.parse.
 *  
 **/
auth.isLoggedIn = function(){
  var token = auth.getToken();

  if(token){
    var payload = JSON.parse($window.atob(token.split('.')[1]));

    return payload.exp > Date.now() / 1000;
  } else {
    return false;
  }
};

auth.currentUser = function(){
  if(auth.isLoggedIn()){
    var token = auth.getToken();
    var payload = JSON.parse($window.atob(token.split('.')[1]));

    return payload.username;
  }
};

auth.currentUserImage = function(){
  if(auth.isLoggedIn()){
    var token = auth.getToken();
    var payload = JSON.parse($window.atob(token.split('.')[1]));

if(payload.image){
   return payload.image;
}
  }
};


auth.register = function(user){
  return $http.post('/register', user).success(function(data){
    auth.saveToken(data.token); //saves token in storage
  });
};


auth.logIn = function(user){
  return $http.post('/login', user).success(function(data){
    auth.saveToken(data.token);
  });
};


auth.logOut = function(){ //call server side as well if using google
   $http.get('logout').success(function(){ 
    $window.localStorage.removeItem('flapper-news-token');
  });
  $window.localStorage.removeItem('flapper-news-token');
};

  return auth;
}]);


//service that will handle the data and processing of data, better to have in a central service rather than repeating
/*
 * Since our routes that write to the database now require authentication, 
 * let's update our posts service to send the JWT token to the server on authenticated requests.
 *  
 * */
app.factory('posts', ['$http', 'auth', function($http,auth){
var o = {
 posts:[{}]
};

o.getAll = function() { //get posts
    return $http.get('/posts').success(function(data){
      angular.copy(data, o.posts); //copy returned results to posts object defined above, angular copy will make UI update properly when getAll function is called
    });
};
  
o.create = function(post) {
  return $http.post('/posts', post, {headers: {Authorization: 'Bearer '+auth.getToken()} 
  }).success(function(data){
    o.posts.push(data);
  });
};

o.update = function(post) {
  return $http.put('/posts/' + post._id + '/update', post, {headers: {Authorization: 'Bearer '+auth.getToken()} 
  }).success(function(data){
   // o.posts.push(data);
  }); //when this function is called, check if success or error then output message to user
};

o.delete = function(post){
   return $http.put('/posts/' + post._id + '/delete',null, {headers: {Authorization: 'Bearer '+auth.getToken()} 
  }).success(function(data){
   o.posts.forEach(function(element, index, array){
    if(element._id === data.post){
    o.posts.splice(index,1);
     //console.log(element._id +' '+ index +' '+element.title + ' data:'+ data.post);
   }
   })
   
  });
}


o.upvote = function(post) {
  return $http.put('/posts/' + post._id + '/upvote', null, {
    headers: {Authorization: 'Bearer '+auth.getToken()}
  }).success(function(data){
    post.upvotes += 1; //access post object and increment it by 1
  });
};


o.downvoteComment = function(post,comment){ //pass object and then access it properties
	return $http.put('/posts/' + post._id + '/comments/'+ comment._id + '/downvote', null, {
    headers: {Authorization: 'Bearer '+auth.getToken()}
  }).success(function(data){
    comment.upvotes -= 1;
  });
	
};

o.upvoteComment = function(post, comment) {
  return $http.put('/posts/' + post._id + '/comments/'+ comment._id + '/upvote', null, {
    headers: {Authorization: 'Bearer '+auth.getToken()}
  }).success(function(data){
    comment.upvotes += 1;
  });
};


//Notice that instead of using the success() method we have traditionally used, we are instead using a promise.
o.get = function(id) {
  return $http.get('/posts/' + id).then(function(res){ 
    return res.data;
  });
};

o.addComment = function(id, comment) {
  return $http.post('/posts/' + id + '/comments', comment, {
    headers: {Authorization: 'Bearer '+auth.getToken()}
  });
};


return o; //return post object
}]);



//===================================NAV CTRL
app.controller('NavCtrl', [
'$scope',
'auth',
function($scope, auth){
  $scope.isLoggedIn = auth.isLoggedIn;
  $scope.currentUser = auth.currentUser;
  $scope.logOut = auth.logOut;
  $scope.googleImage =  auth.currentUserImage;
}]);



/*
 * 
 * We need to initialize a user on $scope for our form. Then, we can create a register and logIn() 
 * method on $scope to call the respective methods on the auth factory. 
 * We can then handle any errors and set $scope.error for displaying error messages later. 
 * Finally, if no errors occur, we can send the user back to the home state using a promise. 
 * Now we can go ahead and create our login and registration templates
 * 
 * 
 * */
//===================================AUTH CTRL
app.controller('AuthCtrl', [
'$scope',
'$state',
'auth',
'$location',
function($scope, $state, auth, $location){
  $scope.user = {};

  $scope.register = function(){
    auth.register($scope.user).error(function(error){
      $scope.error = error;
    }).then(function(){ //using a promise to send user to home page if registration was a success
      $state.go('home');
    });
  };

  $scope.logIn = function(){
    auth.logIn($scope.user).error(function(error){
      $scope.error = error;
    }).then(function(){
      $state.go('home');
    });
  };
}]);


app.controller('MainCtrl', ['$scope', 'posts', 'auth','ngDialog', function($scope, posts, auth, ngDialog){  //inject posts service
  $scope.posts = posts.posts; //access posts array from o object in posts service
  $scope.isLoggedIn = auth.isLoggedIn;
  var allowed = 'Nikki w';
//console.log(posts.posts);


$scope.modal = function(post){
var restrict = "";

if(post){
  $scope.post = post;
  //console.log(post._id);
}
//console.log(post);

  if(auth.currentUser()===allowed && !post){ //only I can add resources currently
    restrict = 'newPost.html'
  }else if(auth.currentUser()===allowed && post){
    restrict = 'editPost.html'
  }else{
    restrict = 'restricted.html'
  }
       ngDialog.open({
                    template: restrict, 
                    controller: 'MainCtrl',                                                
                    className: 'ngdialog-theme-default',
                    data: $scope.post,
                    plain: false,
                    overlay: false,
                    closeByDocument: false,
                    closeByEscape: false,
                    preCloseCallback: function(value) {
                      // $scope.posts = posts.posts;
        
                    } 
                });
},

$scope.editPost = function(post){
if(!post.title || post.title===''){return;}
 posts.update(post).success(function(stat){
  $scope.status = stat;
 });
},

  $scope.addPost = function(){
   if(!$scope.title || $scope.title===''){return;}
    posts.create({
    title: $scope.title, //access fields through scope variable
    link: $scope.link,
    info: $scope.info,
    category:$scope.category
    }).error(function(err){
      $scope.status = err;
    }).success(function(){
      $scope.title='';
      $scope.link='';
      $scope.category='';
      $scope.info='';
      $scope.closeThisDialog();
    });

  },

  $scope.delete = function(post){
     if(auth.currentUser()===allowed)
     if (confirm("Are you sure?")) {
         posts.delete(post);
    } 
  }

  $scope.incrementUpvotes = function(post){
  posts.upvote(post); //call posts service function (upvote) and pass parameter post object, then can access post._id
 } 
}]);


app.controller('PostsCtrl', ['$scope', 'posts', 'post', 'auth', function($scope, posts, post, auth){
	$scope.post = post; //pass post object to scope object
	$scope.isLoggedIn = auth.isLoggedIn;	
	
	$scope.addComment = function(){
	  if(!$scope.body || $scope.body===''){return;}	
		
	posts.addComment(post._id, {
    body: $scope.body,
    author: 'user',
  }).success(function(comment) { //if comment added successfully then show on page
    $scope.post.comments.push(comment); //add comment to client side for viewing
  });
		$scope.body='';
	},
	
	$scope.incrementUpvotes = function(comment){
  posts.upvoteComment(post, comment); //upvote comment from a selected post
},

    //can pass just post._id but I must pass entire object and to be able to access upvote property for me show the upvote on client side
    $scope.decrementUpvotes = function(comment){
	
		if(comment.upvotes > 0) //if vote already 0 you cant decrease further
		{
		 posts.downvoteComment(post,comment);
	  }
	}
		
}]);
