var mongoose = require('mongoose');

var PostSchema = new mongoose.Schema({
  category: String,
  title: String,
  link: String,
  info: String,
  upvotes: {type: Number, default: 0},
  author: String,
  comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }]
});


PostSchema.methods.upvote = function(cb) {
  this.upvotes += 1;
  this.save(cb);
};

mongoose.model('Post', PostSchema);
