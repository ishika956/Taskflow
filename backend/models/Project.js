const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  workspace:   { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  color:       { type: String, default: '#3b82f6' }, // accent color for UI
}, { timestamps: true });

module.exports = mongoose.model('Project', ProjectSchema);
