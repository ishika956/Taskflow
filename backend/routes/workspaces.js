const express   = require('express');
const Workspace = require('../models/Workspace');
const User      = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect); // all workspace routes require auth

// GET /api/workspaces — workspaces where user is owner or member
router.get('/', async (req, res) => {
  try {
    const workspaces = await Workspace.find({
      $or: [{ owner: req.user._id }, { 'members.user': req.user._id }],
    }).populate('owner', 'name email').populate('members.user', 'name email');
    res.json(workspaces);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/workspaces — create new workspace
router.post('/', async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required' });
    const workspace = await Workspace.create({
      name, description, owner: req.user._id, members: [],
    });
    res.status(201).json(workspace);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/workspaces/:id/invite — invite member by email
router.post('/:id/invite', async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) return res.status(404).json({ message: 'Workspace not found' });
    if (workspace.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the owner can invite members' });
    }
    const { email, role = 'Member' } = req.body;
    const invitee = await User.findOne({ email });
    if (!invitee) return res.status(404).json({ message: 'User with that email not found' });
    const already = workspace.members.find(m => m.user.toString() === invitee._id.toString());
    if (already) return res.status(409).json({ message: 'User is already a member' });
    workspace.members.push({ user: invitee._id, role });
    await workspace.save();
    await workspace.populate('members.user', 'name email');
    res.json(workspace);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT /api/workspaces/:id — update workspace name/description
router.put('/:id', async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) return res.status(404).json({ message: 'Not found' });
    if (workspace.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the owner can edit this workspace' });
    }
    const { name, description } = req.body;
    if (name) workspace.name = name;
    if (description !== undefined) workspace.description = description;
    await workspace.save();
    res.json(workspace);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// DELETE /api/workspaces/:id
router.delete('/:id', async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) return res.status(404).json({ message: 'Not found' });
    if (workspace.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the owner can delete this workspace' });
    }
    await workspace.deleteOne();
    res.json({ message: 'Workspace deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;

// PATCH /api/workspaces/:id/members/:userId/role — Owner or Admin can change member role
router.patch('/:id/members/:userId/role', async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) return res.status(404).json({ message: 'Workspace not found' });

    const requestorId = req.user._id.toString();
    const isOwner     = workspace.owner.toString() === requestorId;
    const requestorMember = workspace.members.find(m => m.user.toString() === requestorId);
    const isAdmin     = requestorMember?.role === 'Admin';

    // Only Owner or Admin can change roles
    if (!isOwner && !isAdmin)
      return res.status(403).json({ message: 'Only Owner or Admin can change member roles' });

    const { role } = req.body;
    if (!['Admin', 'Manager', 'Member'].includes(role))
      return res.status(400).json({ message: 'Role must be Admin, Manager, or Member' });

    // Cannot change the owner's role
    if (req.params.userId === workspace.owner.toString())
      return res.status(400).json({ message: "Cannot change the owner's role" });

    // Admin cannot promote someone to Admin (only Owner can)
    if (isAdmin && !isOwner && role === 'Admin')
      return res.status(403).json({ message: 'Only the Owner can assign the Admin role' });

    const member = workspace.members.find(m => m.user.toString() === req.params.userId);
    if (!member) return res.status(404).json({ message: 'Member not found in workspace' });

    member.role = role;
    await workspace.save();
    await workspace.populate('members.user', 'name email');
    res.json({ message: `Role updated to ${role}`, workspace });
  } catch (err) { res.status(500).json({ message: err.message }); }
});
