const express = require('express');
const { body } = require('express-validator');
const Task = require('../models/Task');
const Project = require('../models/Project');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();

// Helper: check if user can access a task's project
const getTaskWithAccess = async (req, res) => {
  const task = await Task.findById(req.params.id)
    .populate('project', 'owner members')
    .populate('assignee', 'name email')
    .populate('createdBy', 'name email')
    .populate('comments.user', 'name email');

  if (!task || task.isArchived) {
    res.status(404).json({ error: 'Task not found.' });
    return null;
  }

  const project = task.project;
  const isMember = project.isMember ? project.isMember(req.user._id) :
    (project.owner.toString() === req.user._id.toString() ||
     project.members.some(m => m.user.toString() === req.user._id.toString()));

  if (!isMember && req.user.role !== 'admin') {
    res.status(403).json({ error: 'Access denied.' });
    return null;
  }

  return task;
};

// GET /api/tasks - Get tasks (with filters)
router.get('/', protect, async (req, res) => {
  try {
    const { projectId, assignee, status, priority, overdue, page = 1, limit = 50 } = req.query;

    // Build match for projects user has access to
    let accessibleProjectIds;
    if (req.user.role !== 'admin') {
      const userProjects = await Project.find({
        isArchived: false,
        $or: [{ owner: req.user._id }, { 'members.user': req.user._id }]
      }).select('_id');
      accessibleProjectIds = userProjects.map(p => p._id);
    }

    const query = { isArchived: false };
    if (accessibleProjectIds) query.project = { $in: accessibleProjectIds };
    if (projectId) query.project = projectId;
    if (assignee === 'me') query.assignee = req.user._id;
    else if (assignee) query.assignee = assignee;
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (overdue === 'true') {
      query.dueDate = { $lt: new Date() };
      query.status = { $ne: 'done' };
    }

    const tasks = await Task.find(query)
      .populate('assignee', 'name email')
      .populate('createdBy', 'name email')
      .populate('project', 'name color')
      .sort({ dueDate: 1, createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await Task.countDocuments(query);
    res.json({ tasks, total, page: Number(page) });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
});

// POST /api/tasks - Create task
router.post('/', protect, [
  body('title').trim().isLength({ min: 2, max: 200 }).withMessage('Title must be 2-200 characters'),
  body('projectId').notEmpty().withMessage('Project ID is required'),
  body('status').optional().isIn(['todo', 'in-progress', 'review', 'done']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'critical']),
  body('dueDate').optional().isISO8601().withMessage('Invalid date format'),
  body('estimatedHours').optional().isNumeric()
], validate, async (req, res) => {
  try {
    const { title, description, projectId, assignee, status, priority, dueDate, estimatedHours, tags } = req.body;

    // Verify project access
    const project = await Project.findById(projectId);
    if (!project || project.isArchived) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    const isMember = project.isMember(req.user._id) || req.user.role === 'admin';
    if (!isMember) {
      return res.status(403).json({ error: 'Access denied. You are not a member of this project.' });
    }

    // Validate assignee is project member
    if (assignee) {
      const isAssigneeMember = project.owner.toString() === assignee ||
        project.members.some(m => m.user.toString() === assignee);
      if (!isAssigneeMember) {
        return res.status(400).json({ error: 'Assignee must be a member of the project.' });
      }
    }

    const task = await Task.create({
      title,
      description: description || '',
      project: projectId,
      assignee: assignee || null,
      status: status || 'todo',
      priority: priority || 'medium',
      dueDate: dueDate || null,
      estimatedHours: estimatedHours || null,
      tags: tags || [],
      createdBy: req.user._id
    });

    await task.populate([
      { path: 'assignee', select: 'name email' },
      { path: 'createdBy', select: 'name email' },
      { path: 'project', select: 'name color' }
    ]);

    res.status(201).json({ message: 'Task created successfully!', task });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/tasks/:id - Get single task
router.get('/:id', protect, async (req, res) => {
  try {
    const task = await getTaskWithAccess(req, res);
    if (!task) return;
    res.json({ task });
  } catch (error) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// PATCH /api/tasks/:id - Update task
router.patch('/:id', protect, [
  body('title').optional().trim().isLength({ min: 2, max: 200 }),
  body('status').optional().isIn(['todo', 'in-progress', 'review', 'done']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'critical']),
  body('dueDate').optional().isISO8601()
], validate, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id).populate('project', 'owner members');
    if (!task || task.isArchived) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    const project = task.project;
    const isMember = project.owner.toString() === req.user._id.toString() ||
      project.members.some(m => m.user.toString() === req.user._id.toString()) ||
      req.user.role === 'admin';

    if (!isMember) return res.status(403).json({ error: 'Access denied.' });

    const allowedFields = ['title', 'description', 'status', 'priority', 'assignee', 'dueDate', 'estimatedHours', 'tags'];
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) task[field] = req.body[field];
    });

    await task.save();
    await task.populate([
      { path: 'assignee', select: 'name email' },
      { path: 'createdBy', select: 'name email' },
      { path: 'project', select: 'name color' }
    ]);

    res.json({ message: 'Task updated successfully!', task });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
});

// DELETE /api/tasks/:id - Archive task
router.delete('/:id', protect, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id).populate('project', 'owner members');
    if (!task) return res.status(404).json({ error: 'Task not found.' });

    const project = task.project;
    const isAdmin = project.owner.toString() === req.user._id.toString() ||
      project.members.some(m => m.user.toString() === req.user._id.toString() && m.role === 'admin') ||
      req.user.role === 'admin';

    const isCreator = task.createdBy.toString() === req.user._id.toString();

    if (!isAdmin && !isCreator) {
      return res.status(403).json({ error: 'Access denied. Only task creator or project admin can delete tasks.' });
    }

    task.isArchived = true;
    await task.save();
    res.json({ message: 'Task deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// POST /api/tasks/:id/comments - Add comment
router.post('/:id/comments', protect, [
  body('text').trim().isLength({ min: 1, max: 1000 }).withMessage('Comment must be 1-1000 characters')
], validate, async (req, res) => {
  try {
    const task = await getTaskWithAccess(req, res);
    if (!task) return;

    task.comments.push({ user: req.user._id, text: req.body.text });
    await task.save();
    await task.populate('comments.user', 'name email');

    const newComment = task.comments[task.comments.length - 1];
    res.status(201).json({ message: 'Comment added!', comment: newComment });
  } catch (error) {
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
