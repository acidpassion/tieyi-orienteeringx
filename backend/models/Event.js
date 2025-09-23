const mongoose = require('mongoose');
const eventSchema = new mongoose.Schema({
  eventName: {
    type: String,
    required: true,
    trim: true
  },
  organization: {
    type: String,
    required: true,
    enum: ["国家体育总局", "广州市教育局", "小马越野", "香山定向", "华瑞健","巨浪"],
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
    enum: ['国家级赛事', '省级赛', '市级赛', '区级赛', '社会普级类赛事(省联赛,古驿道,冠军赛等)'],
    trim: true
  }
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

module.exports = mongoose.model('Event', eventSchema);