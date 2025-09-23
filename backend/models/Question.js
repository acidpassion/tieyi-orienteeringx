const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  quizId: {
    type: mongoose.Schema.Types.Mixed, // Can be ObjectId or String
    ref: 'Quiz',
    required: true
  },
  sortIndex: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    enum: ['single_choice', 'multi_choice', 'true_false', 'graphics_recognition', 'matching', 'imageMatching', 'sequence'],
    required: true
  },
  question_text: {
    type: String,
    required: true
  },
  question_text_cn: {
    type: String
  },
  image_url: {
    type: String // optional, for graphics_recognition
  },
  options: [{
    id: String,
    text: String,
    text_cn: String
  }],
  matches: [{
    id: String,
    text: String,
    text_cn: String
  }],
  correct_answer: [{
    type: String
  }],
  explanation: {
    type: String
  },
  explanation_cn: {
    type: String
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Question', questionSchema);