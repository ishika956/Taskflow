const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
  task:    { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
  author:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true, trim: true },
}, { timestamps: true });

module.exports = mongoose.model('Comment', CommentSchema);
