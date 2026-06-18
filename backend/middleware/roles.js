const Workspace = require('../models/Workspace');
const Task      = require('../models/Task');

// ── Helper: get user's role in a workspace ────────────────────────────────────
const getUserRole = async (workspaceId, userId) => {
  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) return null;

  // Owner gets a special 'Owner' role
  if (workspace.owner.toString() === userId.toString()) return 'Owner';

  const member = workspace.members.find(
    m => m.user.toString() === userId.toString()
  );
  return member ? member.role : null; // null = not a member
};

// ── Middleware: only allow these roles ────────────────────────────────────────
// workspaceId can come from: body.workspace, params.workspaceId, query.workspaceId
const requireRole = (...roles) => async (req, res, next) => {
  try {
    const workspaceId =
      req.body.workspace ||
      req.params.workspaceId ||
      req.query.workspaceId;

    if (!workspaceId) {
      return res.status(400).json({ message: 'Workspace ID required' });
    }

    const role = await getUserRole(workspaceId, req.user._id);
    if (!role) return res.status(403).json({ message: 'Not a workspace member' });

    // Owner always passes
    if (role === 'Owner') return next();

    if (!roles.includes(role)) {
      return res.status(403).json({
        message: `This action requires one of: ${roles.join(', ')}. Your role: ${role}`,
      });
    }
    next();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Middleware: for task routes where workspaceId comes from the Task itself ──
// Looks up the task, finds its workspace, then checks role
const requireRoleForTask = (...roles) => async (req, res, next) => {
  try {
    const taskId = req.params.id;
    const task   = await Task.findById(taskId);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const role = await getUserRole(task.workspace, req.user._id);
    if (!role) return res.status(403).json({ message: 'Not a workspace member' });

    if (role === 'Owner') return next();

    if (!roles.includes(role)) {
      return res.status(403).json({
        message: `This action requires one of: ${roles.join(', ')}. Your role: ${role}`,
      });
    }

    // Attach task and role to request so routes don't re-fetch
    req.task     = task;
    req.userRole = role;
    next();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { requireRole, requireRoleForTask, getUserRole };
