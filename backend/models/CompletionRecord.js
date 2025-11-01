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
  },
  reason: {
    type: String,
    required: false // 可选字段，存储比赛结果原因（如DNF、DSQ等）
  },
  startTime: {
    type: String,
    match: /^\d{1,2}:\d{2}:\d{2}([.,]\d{1,3})?$/,
    required: false
  },  // Supports formats: HH:MM:SS, HH:MM:SS.mmm, HH:MM:SS,mmm
  finishTime: {
    type: String,
    match: /^\d{1,2}:\d{2}:\d{2}([.,]\d{1,3})?$/,
    required: false
  }, // Supports formats: HH:MM:SS, HH:MM:SS.mmm, HH:MM:SS,mmm
  punchs: {
    type: mongoose.Schema.Types.Mixed,
    required: false // 可选字段，存储打卡记录数组
  },
  relayPersonalTotalTime: {
    type: String,
    required: false // 可选字段，存储接力赛中个人的总时间
  },
  teamId: {
    type: String,
    required: false // 可选字段，存储接力赛中的队伍ID
  }
}, {
  timestamps: true
});

// 创建复合索引优化查询性能
completionRecordSchema.index({ name: 1, eventDate: -1 });
completionRecordSchema.index({ eventDate: -1, eventName: 1 });

module.exports = mongoose.model('CompletionRecord', completionRecordSchema, 'completionRecords');