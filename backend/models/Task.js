const mongoose = require('mongoose');

const AttachmentSchema = new mongoose.Schema({
  filename:     String,
  originalName: String,
  mimetype:     String,
  size:         Number,
  uploadedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  uploadedAt:   { type: Date, default: Date.now },
}, { _id: false });

const TaskSchema = new mongoose.Schema({
  title:       { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  project:     { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  workspace:   { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
  status:      { type: String, enum: ['Todo', 'In Progress', 'In Review', 'Done'], default: 'Todo' },
  priority:    { type: String, enum: ['Low', 'Medium', 'High', 'Urgent'], default: 'Medium' },

  // ── CHANGED: single assignee → array of assignees ──────────────────────────
  assignees:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  deadline:    { type: Date, default: null },
  order:       { type: Number, default: 0 },
  attachments: [AttachmentSchema],
  tags:        [{ type: String }],
}, { timestamps: true });

module.exports = mongoose.model('Task', TaskSchema);
