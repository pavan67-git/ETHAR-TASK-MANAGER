const express = require('express');
const { body, param } = require('express-validator');
const mongoose = require('mongoose');
const Project = require('../models/Project');
const Task = require('../models/Task');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();

// Helper: check project access
const checkProjectAccess = async (req, res, requireAdmin = false) => {
  const project = await Project.findById(req.params.id)
    .populate('owner', 'name email')
    .populate('members.user', 'name email role');

  if (!project || project.isArchived) {
    res.status(404).json({ error: 'Project not found.' });
    return null;
  }

  const isMember = project.isMember(req.user._id);
  if (!isMember && req.user.role !== 'admin') {
    res.status(403).json({ error: 'Access denied. You are not a member of this project.' });
    return null;
  }

  if (requireAdmin) {
    const isAdmin = project.isAdmin(req.user._id) || req.user.role === 'admin';
    if (!isAdmin) {
      res.status(403).json({ error: 'Access denied. Project admin rights required.' });
      return null;
    }
  }

  return project;
};

// GET /api/projects - Get all accessible projects
router.get('/', protect, async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    
    let query = { isArchived: false };
    
    // Non-admins only see their projects
    if (req.user.role !== 'admin') {
      query.$or = [
        { owner: req.user._id },
        { 'members.user': req.user._id }
      ];
    }

    if (status) query.status = status;
    if (search) query.name = { $regex: search, $options: 'i' };

    const projects = await Project.find(query)
      .populate('owner', 'name email')
      .populate('members.user', 'name email')
      .sort({ updatedAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    // Attach task counts
    const projectIds = projects.map(p => p._id);
    const taskCounts = await Task.aggregate([
      { $match: { project: { $in: projectIds }, isArchived: false } },
      { $group: { _id: '$project', total: { $sum: 1 }, done: { $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] } } } }
    ]);

    const countMap = {};
    taskCounts.forEach(tc => { countMap[tc._id.toString()] = tc; });

    const enrichedProjects = projects.map(p => {
      const pObj = p.toObject();
      const counts = countMap[p._id.toString()] || { total: 0, done: 0 };
      pObj.taskCount = counts.total;
      pObj.completedTaskCount = counts.done;
      pObj.progress = counts.total > 0 ? Math.round((counts.done / counts.total) * 100) : 0;
      return pObj;
    });

    const total = await Project.countDocuments(query);
    res.json({ projects: enrichedProjects, total, page: Number(page) });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
});

// POST /api/projects - Create project
router.post('/', protect, [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Project name must be 2-100 characters'),
  body('description').optional().trim().isLength({ max: 500 }),
  body('status').optional().isIn(['planning', 'active', 'on-hold', 'completed', 'cancelled']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'critical']),
  body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/),
  body('dueDate').optional().isISO8601()
], validate, async (req, res) => {
  try {
    const { name, description, status, priority, color, dueDate, tags } = req.body;

    const project = await Project.create({
      name,
      description,
      status: status || 'planning',
      priority: priority || 'medium',
      color: color || '#6366f1',
      dueDate: dueDate || null,
      tags: tags || [],
      owner: req.user._id,
      members: [{ user: req.user._id, role: 'admin' }]
    });

    await project.populate('owner', 'name email');
    res.status(201).json({ message: 'Project created successfully!', project });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/projects/:id - Get project details
router.get('/:id', protect, async (req, res) => {
  try {
    const project = await checkProjectAccess(req, res);
    if (!project) return;

    const tasks = await Task.find({ project: project._id, isArchived: false })
      .populate('assignee', 'name email')
      .populate('createdBy', 'name email')
      .sort({ order: 1, createdAt: -1 });

    const tasksByStatus = {
      todo: tasks.filter(t => t.status === 'todo'),
      'in-progress': tasks.filter(t => t.status === 'in-progress'),
      review: tasks.filter(t => t.status === 'review'),
      done: tasks.filter(t => t.status === 'done')
    };

    res.json({ project, tasks, tasksByStatus });
  } catch (error) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// PATCH /api/projects/:id - Update project
router.patch('/:id', protect, [
  body('name').optional().trim().isLength({ min: 2, max: 100 }),
  body('status').optional().isIn(['planning', 'active', 'on-hold', 'completed', 'cancelled']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'critical']),
], validate, async (req, res) => {
  try {
    const project = await checkProjectAccess(req, res, true);
    if (!project) return;

    const allowedFields = ['name', 'description', 'status', 'priority', 'color', 'dueDate', 'startDate', 'tags'];
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) project[field] = req.body[field];
    });

    await project.save();
    res.json({ message: 'Project updated successfully!', project });
  } catch (error) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// DELETE /api/projects/:id - Archive project
router.delete('/:id', protect, async (req, res) => {
  try {
    const project = await checkProjectAccess(req, res, true);
    if (!project) return;

    project.isArchived = true;
    await project.save();
    res.json({ message: 'Project archived successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// POST /api/projects/:id/members - Add member
router.post('/:id/members', protect, [
  body('userId').notEmpty().withMessage('User ID is required'),
  body('role').optional().isIn(['admin', 'member'])
], validate, async (req, res) => {
  try {
    const project = await checkProjectAccess(req, res, true);
    if (!project) return;

    const { userId, role = 'member' } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const alreadyMember = project.members.some(m => m.user._id.toString() === userId);
    if (alreadyMember || project.owner._id.toString() === userId) {
      return res.status(409).json({ error: 'User is already a member of this project.' });
    }

    project.members.push({ user: userId, role });
    await project.save();
    await project.populate('members.user', 'name email role');

    res.json({ message: `${user.name} added to project!`, project });
  } catch (error) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// DELETE /api/projects/:id/members/:userId - Remove member
router.delete('/:id/members/:userId', protect, async (req, res) => {
  try {
    const project = await checkProjectAccess(req, res, true);
    if (!project) return;

    if (project.owner._id.toString() === req.params.userId) {
      return res.status(400).json({ error: 'Cannot remove project owner.' });
    }

    project.members = project.members.filter(m => m.user._id.toString() !== req.params.userId);
    await project.save();

    res.json({ message: 'Member removed successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
