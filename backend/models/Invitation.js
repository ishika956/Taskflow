const mongoose = require('mongoose');
const crypto   = require('crypto');

const InvitationSchema = new mongoose.Schema({
  email:     { type: String, required: true, lowercase: true, trim: true },
  workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
  role:      { type: String, enum: ['Admin', 'Manager', 'Member'], default: 'Member' },
  invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  token:     { type: String, required: true, unique: true },
  status:    { type: String, enum: ['Pending', 'Accepted', 'Declined', 'Expired'], default: 'Pending' },
  expiresAt: { type: Date, required: true },
}, { timestamps: true });

// Generate a secure random token
InvitationSchema.statics.generateToken = () => crypto.randomBytes(32).toString('hex');

module.exports = mongoose.model('Invitation', InvitationSchema);
