const express = require('express');
const Task = require('../models/Task');
const Project = require('../models/Project');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

// GET /api/dashboard - Get dashboard stats
router.get('/', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const isAdmin = req.user.role === 'admin';

    // Get accessible projects
    const projectQuery = isAdmin
      ? { isArchived: false }
      : { isArchived: false, $or: [{ owner: userId }, { 'members.user': userId }] };

    const projects = await Project.find(projectQuery).select('_id name color status priority dueDate');
    const projectIds = projects.map(p => p._id);

    // Task stats
    const now = new Date();
    const taskQuery = { project: { $in: projectIds }, isArchived: false };

    const [
      totalTasks,
      myTasks,
      todoTasks,
      inProgressTasks,
      reviewTasks,
      doneTasks,
      overdueTasks,
      recentTasks,
      upcomingTasks
    ] = await Promise.all([
      Task.countDocuments(taskQuery),
      Task.countDocuments({ ...taskQuery, assignee: userId }),
      Task.countDocuments({ ...taskQuery, status: 'todo' }),
      Task.countDocuments({ ...taskQuery, status: 'in-progress' }),
      Task.countDocuments({ ...taskQuery, status: 'review' }),
      Task.countDocuments({ ...taskQuery, status: 'done' }),
      Task.countDocuments({ ...taskQuery, status: { $ne: 'done' }, dueDate: { $lt: now } }),
      Task.find({ ...taskQuery, assignee: userId })
        .populate('project', 'name color')
        .populate('assignee', 'name email')
        .sort({ updatedAt: -1 })
        .limit(5),
      Task.find({
        ...taskQuery,
        assignee: userId,
        status: { $ne: 'done' },
        dueDate: { $gte: now, $lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) }
      })
        .populate('project', 'name color')
        .sort({ dueDate: 1 })
        .limit(5)
    ]);

    // Project status breakdown
    const projectStatusBreakdown = await Project.aggregate([
      { $match: projectQuery },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Task completion over last 7 days
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const completionTrend = await Task.aggregate([
      {
        $match: {
          project: { $in: projectIds },
          status: 'done',
          completedAt: { $gte: sevenDaysAgo },
          isArchived: false
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$completedAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    // Team members (admin sees all, members see project mates)
    let teamSize = 0;
    if (isAdmin) {
      teamSize = await User.countDocuments({ isActive: true });
    } else {
      const memberIds = new Set();
      projects.forEach(p => {
        if (p.members) p.members.forEach(m => memberIds.add(m.user?.toString()));
      });
      teamSize = memberIds.size;
    }

    res.json({
      stats: {
        totalProjects: projects.length,
        totalTasks,
        myTasks,
        teamSize,
        tasksByStatus: { todo: todoTasks, inProgress: inProgressTasks, review: reviewTasks, done: doneTasks },
        overdueTasks,
        completionRate: totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0
      },
      recentTasks,
      upcomingTasks,
      projectStatusBreakdown,
      completionTrend,
      recentProjects: projects.slice(0, 6)
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
