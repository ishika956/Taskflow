const express     = require('express');
const TaskRequest = require('../models/TaskRequest');
const Task        = require('../models/Task');
const User        = require('../models/User');
const { protect }               = require('../middleware/auth');
const { getUserRole }           = require('../middleware/roles');
const { emitBoardUpdate }       = require('../socket');
const { sendTaskAssignedEmail } = require('../email');

const router = express.Router();
router.use(protect);

router.get('/:projectId', async (req, res) => {
  try {
    const { workspaceId } = req.query;
    const role = await getUserRole(workspaceId, req.user._id);
    if (!role) return res.status(403).json({ message: 'Not a workspace member' });
    const filter = { project: req.params.projectId };
    if (role === 'Member') filter.requestedBy = req.user._id;
    const requests = await TaskRequest.find(filter)
      .populate('requestedBy', 'name email')
      .populate('reviewedBy', 'name email')
      .populate('task')
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { project, workspace, title, description, priority, deadline } = req.body;
    if (!project || !workspace || !title)
      return res.status(400).json({ message: 'project, workspace and title are required' });
    const role = await getUserRole(workspace, req.user._id);
    if (!role) return res.status(403).json({ message: 'Not a workspace member' });
    if (['Owner', 'Admin', 'Manager'].includes(role))
      return res.status(400).json({ message: 'Admins and Managers can create tasks directly.' });
    const request = await TaskRequest.create({
      requestedBy: req.user._id, workspace, project, title, description,
      priority: priority || 'Medium', deadline: deadline || null,
    });
    await request.populate('requestedBy', 'name email');
    emitBoardUpdate(project, 'request:created', request, req.headers['x-socket-id'] || null);
    res.status(201).json(request);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.patch('/:id/approve', async (req, res) => {
  try {
    const request = await TaskRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });
    const role = await getUserRole(request.workspace, req.user._id);
    if (!['Owner', 'Admin', 'Manager'].includes(role))
      return res.status(403).json({ message: 'Only Admin or Manager can approve requests' });
    if (request.status !== 'Pending')
      return res.status(400).json({ message: `Request is already ${request.status}` });

    // Create task with requester as the single assignee (array)
    const task = await Task.create({
      title: request.title, description: request.description,
      priority: request.priority, deadline: request.deadline,
      project: request.project, workspace: request.workspace,
      status: 'Todo',
      assignees: [request.requestedBy],   // array
      createdBy: req.user._id,
    });
    await task.populate(['assignees', 'createdBy']);

    request.status = 'Approved'; request.reviewedBy = req.user._id;
    request.reviewedAt = new Date(); request.task = task._id;
    await request.save();
    await request.populate(['requestedBy', 'reviewedBy', 'task']);

    emitBoardUpdate(request.project.toString(), 'task:created', task, req.headers['x-socket-id'] || null);
    emitBoardUpdate(request.project.toString(), 'request:updated', request, req.headers['x-socket-id'] || null);

    const member = await User.findById(request.requestedBy);
    if (member) sendTaskAssignedEmail({
      toEmail: member.email, toName: member.name, taskTitle: task.title,
      projectName: request.project.toString(),
      assignedBy: `${req.user.name} (approved your request)`, deadline: task.deadline,
    }).catch(() => {});

    res.json({ request, task });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.patch('/:id/reject', async (req, res) => {
  try {
    const request = await TaskRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });
    const role = await getUserRole(request.workspace, req.user._id);
    if (!['Owner', 'Admin', 'Manager'].includes(role))
      return res.status(403).json({ message: 'Only Admin or Manager can reject requests' });
    if (request.status !== 'Pending')
      return res.status(400).json({ message: `Request is already ${request.status}` });
    request.status = 'Rejected'; request.reviewedBy = req.user._id;
    request.reviewedAt = new Date(); request.rejectReason = req.body.reason || 'No reason provided';
    await request.save();
    await request.populate(['requestedBy', 'reviewedBy']);
    emitBoardUpdate(request.project.toString(), 'request:updated', request, req.headers['x-socket-id'] || null);
    res.json(request);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const request = await TaskRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });
    const role = await getUserRole(request.workspace, req.user._id);
    if (role === 'Member') {
      if (request.requestedBy.toString() !== req.user._id.toString())
        return res.status(403).json({ message: 'You can only cancel your own requests' });
      if (request.status !== 'Pending')
        return res.status(400).json({ message: 'Cannot cancel an already reviewed request' });
    }
    await request.deleteOne();
    res.json({ message: 'Request cancelled' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
