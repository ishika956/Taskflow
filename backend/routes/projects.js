const express   = require('express');
const Project   = require('../models/Project');
const Workspace = require('../models/Workspace');
const { protect }    = require('../middleware/auth');
const { getUserRole } = require('../middleware/roles');

const router = express.Router();
router.use(protect);

// ── GET /api/projects/:workspaceId ─── Any member can view projects
router.get('/:workspaceId', async (req, res) => {
  try {
    const role = await getUserRole(req.params.workspaceId, req.user._id);
    if (!role) return res.status(403).json({ message: 'Access denied' });

    const projects = await Project.find({ workspace: req.params.workspaceId })
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
    res.json(projects);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── POST /api/projects ─── Only Owner, Admin, Manager
router.post('/', async (req, res) => {
  try {
    const { name, description, workspace, color } = req.body;
    if (!name || !workspace) return res.status(400).json({ message: 'Name and workspace required' });
    const role = await getUserRole(workspace, req.user._id);
    if (!role) return res.status(403).json({ message: 'Not a workspace member' });
    if (role === 'Member') return res.status(403).json({ message: 'Members cannot create projects' });

    const project = await Project.create({ name, description, workspace, color, createdBy: req.user._id });
    res.status(201).json(project);
  } catch (err) {
    // ADD THIS
    if (err.code === 11000) {
      return res.status(409).json({ message: 'A project with this name already exists in this workspace' });
    }
    res.status(500).json({ message: err.message });
  }
});

// ── PUT /api/projects/:id ─── Only Owner, Admin, Manager
router.put('/:id', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Not found' });

    const role = await getUserRole(project.workspace, req.user._id);
    if (!role) return res.status(403).json({ message: 'Access denied' });

    if (role === 'Member') {
      return res.status(403).json({ message: 'Members cannot edit projects' });
    }

    const { name, description, color } = req.body;
    if (name)  project.name  = name;
    if (description !== undefined) project.description = description;
    if (color) project.color = color;
    await project.save();
    res.json(project);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── DELETE /api/projects/:id ─── Only Owner, Admin, Manager
router.delete('/:id', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Not found' });

    const role = await getUserRole(project.workspace, req.user._id);
    if (!role) return res.status(403).json({ message: 'Access denied' });

    if (role === 'Member') {
      return res.status(403).json({ message: 'Members cannot delete projects' });
    }

    await project.deleteOne();
    res.json({ message: 'Project deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
