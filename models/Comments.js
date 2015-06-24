
var mongoose = require('mongoose');

var CommentSchema = new mongoose.Schema({
  body: String,
  author: String,
  upvotes: {type: Number, default: 0},
  post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' }
});


CommentSchema.methods.upvoteCom = function(cb) {
  this.upvotes += 1;
  this.save(cb);
};

CommentSchema.methods.downvoteCom = function(cb) {
  if(this.upvotes > 0) //do server side as well as client side
  {
  this.upvotes -= 1;
  this.save(cb);
  }
};

mongoose.model('Comment', CommentSchema);
