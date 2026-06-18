const mongoose = require('mongoose');

const TaskRequestSchema = new mongoose.Schema({
  requestedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  workspace:    { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
  project:      { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  title:        { type: String, required: true, trim: true },
  description:  { type: String, default: '' },
  priority:     { type: String, enum: ['Low', 'Medium', 'High', 'Urgent'], default: 'Medium' },
  deadline:     { type: Date, default: null },
  status:       { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
  reviewedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reviewedAt:   { type: Date, default: null },
  rejectReason: { type: String, default: '' },
  task:         { type: mongoose.Schema.Types.ObjectId, ref: 'Task', default: null },
}, { timestamps: true });

module.exports = mongoose.model('TaskRequest', TaskRequestSchema);
