const mongoose = require('mongoose');

// 比赛项目子模式 - 支持新的对象结构
const gameTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  teamSize: {
    type: Number,
    min: 1,
    max: 10
  },
  externalGameId: {
    type: String,
    trim: true,
    default: ''
  }
}, { _id: false });

// 组别子模式 - 支持字符串或对象
const groupSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  ageRange: {
    type: String,
    trim: true
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'mixed'],
    trim: true
  }
}, { _id: false });

const eventSchema = new mongoose.Schema({
  eventName: {
    type: String,
    required: true,
    trim: true
  },
  organization: {
    type: String,
    required: true,
    trim: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  eventType: {
    type: String,
    required: true,
    trim: true
  },
  location: {
    type: String,
    trim: true
  },
  scoreWeight: {
    type: Number,
    default: 1.0,
    min: 0,
    max: 100
  },
  openRegistration: {
    type: Boolean,
    default: false
  },
  gameTypes: {
    type: [gameTypeSchema],
    default: []
  },
  groups: {
    type: [mongoose.Schema.Types.Mixed], 
    default: []
  },

}, {
  timestamps: true
});

// 验证结束日期必须在开始日期之后
eventSchema.pre('save', function(next) {
  if (this.endDate && this.startDate && this.endDate < this.startDate) {
    const error = new Error('结束日期必须在开始日期之后');
    error.name = 'ValidationError';
    return next(error);
  }
  next();
});

// 索引优化查询性能
eventSchema.index({ startDate: 1 });
eventSchema.index({ eventName: 'text', organization: 'text' });
eventSchema.index({ openRegistration: 1 });
eventSchema.index({ organization: 1 });
eventSchema.index({ eventType: 1 });

module.exports = mongoose.model('Event', eventSchema);