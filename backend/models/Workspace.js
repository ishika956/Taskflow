const mongoose = require('mongoose');

const MemberSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['Admin', 'Manager', 'Member'], default: 'Member' },
}, { _id: false });

const WorkspaceSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  owner:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members:     [MemberSchema],
}, { timestamps: true });

module.exports = mongoose.model('Workspace', WorkspaceSchema);
