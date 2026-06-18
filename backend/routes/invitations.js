const express    = require('express');
const Invitation = require('../models/Invitation');
const Workspace  = require('../models/Workspace');
const User       = require('../models/User');
const { protect } = require('../middleware/auth');
const { sendInvitationEmail } = require('../email');

const router = express.Router();

// ── POST /api/invitations — Owner sends invite email ──────────────────────────
router.post('/', protect, async (req, res) => {
  try {
    const { email, workspaceId, role = 'Member' } = req.body;
    if (!email || !workspaceId)
      return res.status(400).json({ message: 'email and workspaceId are required' });

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) return res.status(404).json({ message: 'Workspace not found' });

    // Only owner can invite
    if (workspace.owner.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Only the workspace owner can send invitations' });

    // Check if already a member
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      const alreadyMember = workspace.members.find(
        m => m.user.toString() === existingUser._id.toString()
      );
      if (alreadyMember)
        return res.status(409).json({ message: 'This user is already a member of the workspace' });
      // Also check if owner
      if (workspace.owner.toString() === existingUser._id.toString())
        return res.status(409).json({ message: 'This user is the workspace owner' });
    }

    // Check for existing pending invite to same workspace
    const existing = await Invitation.findOne({
      email, workspace: workspaceId, status: 'Pending'
    });
    if (existing)
      return res.status(409).json({ message: 'A pending invitation already exists for this email' });

    // Create invitation
    const token = Invitation.generateToken();
    const invitation = await Invitation.create({
      email,
      workspace: workspaceId,
      role,
      invitedBy: req.user._id,
      token,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    // Send email
    await sendInvitationEmail({
      toEmail:       email,
      workspaceName: workspace.name,
      invitedByName: req.user.name,
      role,
      token,
    });

    res.status(201).json({ message: `Invitation sent to ${email}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/invitations/verify/:token — Check token validity (public) ────────
// Frontend calls this first to show workspace name before login/register
router.get('/verify/:token', async (req, res) => {
  try {
    const invitation = await Invitation.findOne({ token: req.params.token })
      .populate('workspace', 'name description')
      .populate('invitedBy', 'name');

    if (!invitation)
      return res.status(404).json({ message: 'Invitation not found or already used' });

    if (invitation.status !== 'Pending')
      return res.status(410).json({ message: `This invitation was already ${invitation.status.toLowerCase()}` });

    if (new Date() > invitation.expiresAt)
      return res.status(410).json({ message: 'This invitation has expired' });

    // Check if the invited email already has an account
    const userExists = await User.findOne({ email: invitation.email });

    res.json({
      email:         invitation.email,
      workspace:     invitation.workspace,
      role:          invitation.role,
      invitedBy:     invitation.invitedBy?.name,
      expiresAt:     invitation.expiresAt,
      userExists:    !!userExists,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/invitations/accept/:token — Accept invitation ───────────────────
// User must be logged in (their account email must match the invite email)
router.post('/accept/:token', protect, async (req, res) => {
  try {
    const invitation = await Invitation.findOne({ token: req.params.token })
      .populate('workspace');

    if (!invitation)
      return res.status(404).json({ message: 'Invitation not found' });

    if (invitation.status !== 'Pending')
      return res.status(410).json({ message: `Invitation already ${invitation.status.toLowerCase()}` });

    if (new Date() > invitation.expiresAt) {
      invitation.status = 'Expired';
      await invitation.save();
      return res.status(410).json({ message: 'Invitation has expired' });
    }

    // Email must match the logged-in user
    if (invitation.email !== req.user.email)
      return res.status(403).json({
        message: `This invitation was sent to ${invitation.email}. Please log in with that account.`
      });

    const workspace = invitation.workspace;

    // Add member to workspace
    const alreadyMember = workspace.members.find(
      m => m.user.toString() === req.user._id.toString()
    );
    if (!alreadyMember) {
      workspace.members.push({ user: req.user._id, role: invitation.role });
      await workspace.save();
    }

    invitation.status = 'Accepted';
    await invitation.save();

    res.json({
      message:   `You've joined "${workspace.name}" as ${invitation.role}!`,
      workspace: { _id: workspace._id, name: workspace.name },
      role:      invitation.role,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/invitations/decline/:token — Decline invitation ─────────────────
router.post('/decline/:token', async (req, res) => {
  try {
    const invitation = await Invitation.findOne({ token: req.params.token });
    if (!invitation)
      return res.status(404).json({ message: 'Invitation not found' });

    if (invitation.status !== 'Pending')
      return res.status(410).json({ message: `Invitation already ${invitation.status.toLowerCase()}` });

    invitation.status = 'Declined';
    await invitation.save();

    res.json({ message: 'Invitation declined.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/invitations/workspace/:workspaceId — List invitations (Owner) ────
router.get('/workspace/:workspaceId', protect, async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.workspaceId);
    if (!workspace) return res.status(404).json({ message: 'Workspace not found' });
    if (workspace.owner.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Only the owner can view invitations' });

    const invitations = await Invitation.find({ workspace: req.params.workspaceId })
      .sort({ createdAt: -1 });
    res.json(invitations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
