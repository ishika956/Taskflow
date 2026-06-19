const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  workspace:   { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  color:       { type: String, default: '#3b82f6' },
}, { timestamps: true });

// Add this line right before module.exports — enforces unique project name PER workspace
ProjectSchema.index({ workspace: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Project', ProjectSchema);