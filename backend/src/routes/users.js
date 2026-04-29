const express = require('express');
const { body } = require('express-validator');
const User = require('../models/User');
const { protect, adminOnly } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();

// GET /api/users - Get all users (admin only)
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const { search, role, page = 1, limit = 20 } = req.query;
    const query = { isActive: true };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    if (role) query.role = role;

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await User.countDocuments(query);

    res.json({ users, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/users/search - Search users for adding to projects
router.get('/search', protect, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.json({ users: [] });
    }

    const users = await User.find({
      isActive: true,
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } }
      ]
    }).select('name email role').limit(10);

    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/users/:id - Get user by ID
router.get('/:id', protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// PATCH /api/users/:id/role - Change user role (admin only)
router.patch('/:id/role', protect, adminOnly, [
  body('role').isIn(['admin', 'member']).withMessage('Role must be admin or member')
], validate, async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ error: 'You cannot change your own role.' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role: req.body.role },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json({ message: 'User role updated.', user });
  } catch (error) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// DELETE /api/users/:id - Deactivate user (admin only)
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ error: 'You cannot deactivate your own account.' });
    }

    await User.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ message: 'User deactivated successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
