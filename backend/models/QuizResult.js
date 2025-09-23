const mongoose = require('mongoose');

const quizResultSchema = new mongoose.Schema({
  quizId: {
    type: mongoose.Schema.Types.Mixed, // 可以是ObjectId或包含$oid的对象
    ref: 'Quiz',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  assignmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assignment',
    required: false // Optional field for assignment-based quiz results
  },
  score: {
    type: Number,
    required: true
  },
  duration: {
    type: Number,
    required: true // in seconds
  },
  correctCount: {
    type: Number,
    required: true
  },
  incorrectCount: {
    type: Number,
    required: true
  },
  unattemptedCount: {
    type: Number,
    required: true
  },
  totalQuestions: {
    type: Number,
    required: true
  },
  responses: [{
    questionId: {
      type: mongoose.Schema.Types.Mixed, // 可以是ObjectId或包含$oid的对象
      ref: 'Question'
    },
    selectedAnswers: [String],
    isCorrect: Boolean
  }],
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('QuizResult', quizResultSchema);