const mongoose = require('mongoose');

const difficultyGradeSchema = new mongoose.Schema({
  number: {
    type: Number,
    required: true,
    min: 1
  },
  color: {
    type: String,
    required: true,
    match: /^#[0-9A-F]{6}$/i // Hex color validation
  },
  level: {
    type: String,
    required: true,
    trim: true
  },
  skill: [{
    type: String,
    required: true,
    trim: true
  }],
  matchingEventType: {
    type: String,
    trim: true,
    default: ''
  }
}, { _id: false });

const configurationSchema = new mongoose.Schema({
  eventTypes: [{
    type: String,
    required: true,
    trim: true
  }],
  gameTypes: [{
    type: String,
    required: true,
    trim: true
  }],
  classes: [{
    type: String,
    required: true,
    trim: true
  }],
  difficultyGrades: [difficultyGradeSchema],
  orgs: [{
    type: String,
    required: true,
    trim: true
  }]
}, {
  timestamps: true,
  collection: 'configurations'
});

// Ensure only one configuration document exists
configurationSchema.statics.getSingleton = async function() {
  let config = await this.findOne();
  if (!config) {
    // Create default configuration if none exists
    config = new this({
      eventTypes: [],
      gameTypes: [],
      classes: [],
      difficultyGrades: [],
      orgs: []
    });
    await config.save();
  }
  return config;
};

module.exports = mongoose.model('Configuration', configurationSchema);