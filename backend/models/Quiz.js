const mongoose = require('mongoose');

const quizSchema = new mongoose.Schema({
  quiz_title: {
    type: String,
    required: true
  },
  quiz_title_cn: {
    type: String
  },
  description: {
    type: String,
    required: true
  },
  description_cn: {
    type: String
  },
  category: {
    type: String,
    required: true
  },
  category_cn: {
    type: String
  },
  maxTime: {
    type: mongoose.Schema.Types.Mixed, // Can be Number or String
    required: true // in minutes
  },
  maxQuestions: {
    type: Number,
    required: true
  },
  difficulty: {
    type: String,
    enum: ['1', '2', '3'],
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  createdBy: {
    type: mongoose.Schema.Types.Mixed, // Can be ObjectId or String
    required: true
  },
  startTime: {
    type: Date
  },
  endTime: {
    type: Date
  },
  date: {
    type: String
  },
  time: {
    type: String
  },
  questionCount: {
    type: Number
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Quiz', quizSchema);