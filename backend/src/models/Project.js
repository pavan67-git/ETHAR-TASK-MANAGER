const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Project name is required'],
    trim: true,
    minlength: [2, 'Project name must be at least 2 characters'],
    maxlength: [100, 'Project name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters'],
    default: ''
  },
  status: {
    type: String,
    enum: ['planning', 'active', 'on-hold', 'completed', 'cancelled'],
    default: 'planning'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  color: {
    type: String,
    default: '#6366f1'
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['admin', 'member'],
      default: 'member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  dueDate: {
    type: Date,
    default: null
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: 30
  }],
  isArchived: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual: task count (populated separately)
projectSchema.virtual('tasks', {
  ref: 'Task',
  localField: '_id',
  foreignField: 'project',
  count: false
});

// Index for faster queries
projectSchema.index({ owner: 1, createdAt: -1 });
projectSchema.index({ 'members.user': 1 });
projectSchema.index({ status: 1 });

// Method: check if user is member/admin of project
projectSchema.methods.isMember = function(userId) {
  if (this.owner.toString() === userId.toString()) return true;
  return this.members.some(m => m.user.toString() === userId.toString());
};

projectSchema.methods.isAdmin = function(userId) {
  if (this.owner.toString() === userId.toString()) return true;
  const member = this.members.find(m => m.user.toString() === userId.toString());
  return member && member.role === 'admin';
};

module.exports = mongoose.model('Project', projectSchema);
