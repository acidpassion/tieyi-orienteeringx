const mongoose = require('mongoose');

// 团队成员子模式
const teamMemberSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    default: null
  },
  joinedAt: {
    type: Date,
    default: null
  }
}, { _id: true });

const relayTeamSchema = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  gameType: {
    type: String,
    required: true,
    trim: true
  },
  teamName: {
    type: String,
    required: true,
    trim: true
  },
  creatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  members: [teamMemberSchema],
  maxMembers: {
    type: Number,
    required: true,
    min: 2,
    max: 10
  },
  inviteCode: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['open', 'full', 'closed'],
    default: 'open'
  }
}, {
  timestamps: true
});

// 生成邀请码的静态方法
relayTeamSchema.statics.generateInviteCode = function() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// 检查团队是否已满的实例方法
relayTeamSchema.methods.isFull = function() {
  const filledMembers = this.members.filter(member => member.studentId !== null);
  return filledMembers.length >= this.maxMembers;
};

// 添加成员的实例方法
relayTeamSchema.methods.addMember = function(studentId) {
  if (this.isFull()) {
    throw new Error('团队已满');
  }
  
  // 检查学生是否已在团队中
  const existingMember = this.members.find(member => 
    member.studentId && member.studentId.toString() === studentId.toString()
  );
  if (existingMember) {
    throw new Error('学生已在团队中');
  }
  
  // 找到第一个空位置
  const emptySlot = this.members.find(member => member.studentId === null);
  if (emptySlot) {
    emptySlot.studentId = studentId;
    emptySlot.joinedAt = new Date();
  } else {
    // 如果没有空位置，添加新成员
    this.members.push({
      studentId: studentId,
      joinedAt: new Date()
    });
  }
  
  // 更新团队状态
  if (this.isFull()) {
    this.status = 'full';
  }
};

// 移除成员的实例方法
relayTeamSchema.methods.removeMember = function(studentId) {
  const memberIndex = this.members.findIndex(member => 
    member.studentId && member.studentId.toString() === studentId.toString()
  );
  
  if (memberIndex === -1) {
    throw new Error('学生不在团队中');
  }
  
  // 将成员位置设为空
  this.members[memberIndex].studentId = null;
  this.members[memberIndex].joinedAt = null;
  
  // 更新团队状态
  if (this.status === 'full') {
    this.status = 'open';
  }
};

// 索引优化查询性能
relayTeamSchema.index({ eventId: 1, gameType: 1 });
relayTeamSchema.index({ inviteCode: 1 }, { unique: true });
relayTeamSchema.index({ creatorId: 1 });
relayTeamSchema.index({ 'members.studentId': 1 });
relayTeamSchema.index({ status: 1 });

// 虚拟字段，用于填充关联数据
relayTeamSchema.virtual('event', {
  ref: 'Event',
  localField: 'eventId',
  foreignField: '_id',
  justOne: true
});

relayTeamSchema.virtual('creator', {
  ref: 'Student',
  localField: 'creatorId',
  foreignField: '_id',
  justOne: true
});

// 确保虚拟字段在JSON序列化时包含
relayTeamSchema.set('toJSON', { virtuals: true });
relayTeamSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('RelayTeam', relayTeamSchema);