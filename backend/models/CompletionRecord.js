const mongoose = require('mongoose');

const completionRecordSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    index: true // 用于关联students集合
  },
  eventName: {
    type: String,
    required: true,
    index: true // 用于搜索
  },
  eventType: {
    type: String,
    required: true
  },
  gameType: {
    type: String,
    required: true
  },
  result: {
    type: String,
    required: true
  },
  groupName: {
    type: String,
    required: true
  },
  validity: {
    type: Boolean,
    default: true
  },
  position: {
    type: Number,
    default: null
  },
  eventDate: {
    type: Date,
    required: true,
    index: true // 用于时间筛选
  },
  score: {
    type: Number,
    required: false // 可选字段，用于积分赛等需要分数的比赛
  }
}, {
  timestamps: true
});

// 创建复合索引优化查询性能
completionRecordSchema.index({ name: 1, eventDate: -1 });
completionRecordSchema.index({ eventDate: -1, eventName: 1 });

module.exports = mongoose.model('CompletionRecord', completionRecordSchema, 'completionRecords');