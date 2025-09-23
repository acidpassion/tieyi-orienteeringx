const mongoose = require('mongoose');

const quizSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  quizId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true
  },
  assignmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assignment',
    required: false // Made optional to support direct quiz access
  },

  responses: [{
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
      required: true
    },
    selectedAnswers: {
      type: [String],
      default: []
    },
    sortIndex: {
      type: Number,
      required: true
    },
    answeredAt: {
      type: Date,
      default: Date.now
    }
  }],
  startTime: {
    type: Date,
    required: true
  },
  lastActiveTime: {
    type: Date,
    default: Date.now
  },
  timeRemaining: {
    type: Number, // in seconds
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'expired'],
    default: 'active'
  }
}, {
  timestamps: true
});

// Compound index to ensure one active session per user per quiz per assignment
// Use sparse index to handle null assignmentId values properly
quizSessionSchema.index({ userId: 1, quizId: 1, assignmentId: 1, status: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('QuizSession', quizSessionSchema);