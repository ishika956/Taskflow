const express   = require('express');
const Task      = require('../models/Task');
const User      = require('../models/User');
const { protect }               = require('../middleware/auth');
const { getUserRole }           = require('../middleware/roles');
const upload                    = require('../middleware/upload');
const { emitBoardUpdate }       = require('../socket');
const { sendTaskAssignedEmail } = require('../email');

const router = express.Router();
router.use(protect);

const getSid = (req) => req.headers['x-socket-id'] || null;

// Helper: send assignment emails to newly added assignees
const notifyNewAssignees = async (prevAssignees = [], newAssignees = [], task, assignedByName) => {
  const prevIds = prevAssignees.map(id => id.toString());
  const added   = newAssignees.filter(id => !prevIds.includes(id.toString()));
  for (const userId of added) {
    const u = await User.findById(userId);
    if (u) sendTaskAssignedEmail({
      toEmail: u.email, toName: u.name,
      taskTitle: task.title, projectName: task.project.toString(),
      assignedBy: assignedByName, deadline: task.deadline,
    }).catch(() => {});
  }
};

// GET /api/tasks/:projectId
router.get('/:projectId', async (req, res) => {
  try {
    const tasks = await Task.find({ project: req.params.projectId })
      .populate('assignees', 'name email')
      .populate('createdBy', 'name email')
      .sort({ order: 1, createdAt: 1 });
    res.json(tasks);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/tasks — Owner/Admin/Manager only
router.post('/', async (req, res) => {
  try {
    const { title, description, project, workspace, status, priority, assignees, deadline, tags } = req.body;
    if (!title || !project || !workspace)
      return res.status(400).json({ message: 'title, project and workspace are required' });

    const role = await getUserRole(workspace, req.user._id);
    if (!role) return res.status(403).json({ message: 'Not a workspace member' });
    if (role === 'Member') return res.status(403).json({ message: 'Members cannot create tasks directly. Use "Request a Task".' });

    const assigneeList = Array.isArray(assignees) ? assignees : (assignees ? [assignees] : []);

    const task = await Task.create({
      title, description, project, workspace,
      status: status || 'Todo', priority: priority || 'Medium',
      assignees: assigneeList,
      deadline: deadline || null,
      tags: tags || [],
      createdBy: req.user._id,
    });
    await task.populate(['assignees', 'createdBy']);

    emitBoardUpdate(project, 'task:created', task, getSid(req));
    await notifyNewAssignees([], assigneeList, task, req.user.name);

    res.status(201).json(task);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT /api/tasks/:id — Owner/Admin/Manager only
router.put('/:id', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const role = await getUserRole(task.workspace, req.user._id);
    if (!role) return res.status(403).json({ message: 'Not a workspace member' });
    if (role === 'Member') return res.status(403).json({ message: 'Members cannot edit tasks.' });

    const prevAssignees = [...(task.assignees || [])];

    // Normalize assignees to array
    if (req.body.assignees !== undefined) {
      req.body.assignees = Array.isArray(req.body.assignees)
        ? req.body.assignees
        : (req.body.assignees ? [req.body.assignees] : []);
    }

    const updated = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('assignees', 'name email')
      .populate('createdBy', 'name email');

    emitBoardUpdate(updated.project.toString(), 'task:updated', updated, getSid(req));
    await notifyNewAssignees(prevAssignees, updated.assignees.map(a => a._id), updated, req.user.name);

    res.json(updated);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PATCH /api/tasks/:id/complete — Member marks their assigned task done
router.patch('/:id/complete', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const role = await getUserRole(task.workspace, req.user._id);
    if (!role) return res.status(403).json({ message: 'Not a workspace member' });

    const isAssigned = task.assignees.some(a => a.toString() === req.user._id.toString());
    if (!isAssigned) return res.status(403).json({ message: 'You can only complete tasks assigned to you' });
    if (task.status === 'Done') return res.status(400).json({ message: 'Task is already Done' });

    task.status = 'Done';
    await task.save();
    await task.populate(['assignees', 'createdBy']);

    emitBoardUpdate(task.project.toString(), 'task:moved', task, getSid(req));
    res.json(task);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PATCH /api/tasks/:id/move — Owner/Admin/Manager only
router.patch('/:id/move', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const role = await getUserRole(task.workspace, req.user._id);
    if (!role) return res.status(403).json({ message: 'Not a workspace member' });
    if (role === 'Member') return res.status(403).json({ message: 'Members cannot move tasks.' });

    const updated = await Task.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status, order: req.body.order },
      { new: true }
    ).populate('assignees', 'name email').populate('createdBy', 'name email');

    emitBoardUpdate(updated.project.toString(), 'task:moved', updated, getSid(req));
    res.json(updated);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// DELETE /api/tasks/:id — Owner/Admin/Manager only
router.delete('/:id', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const role = await getUserRole(task.workspace, req.user._id);
    if (!role) return res.status(403).json({ message: 'Not a workspace member' });
    if (role === 'Member') return res.status(403).json({ message: 'Members cannot delete tasks' });

    await task.deleteOne();
    emitBoardUpdate(task.project.toString(), 'task:deleted', { _id: task._id, project: task.project }, getSid(req));
    res.json({ message: 'Task deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/tasks/:id/attachments
router.post('/:id/attachments', upload.array('files', 5), async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const role = await getUserRole(task.workspace, req.user._id);
    if (!role) return res.status(403).json({ message: 'Not a workspace member' });

    const isAssigned = task.assignees.some(a => a.toString() === req.user._id.toString());
    if (role === 'Member' && !isAssigned)
      return res.status(403).json({ message: 'You can only attach files to your own tasks' });

    const newAttachments = req.files.map(f => ({
      filename: f.filename, originalName: f.originalname,
      mimetype: f.mimetype, size: f.size, uploadedBy: req.user._id,
    }));
    task.attachments.push(...newAttachments);
    await task.save();
    res.json(task.attachments);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
