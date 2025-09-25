const mongoose = require('mongoose');
const crypto = require('crypto');

// 全局计数器，用于生成唯一邀请码
let inviteCodeCounter = 0;

// 接力赛成员schema（包含runOrder）
const relayMemberSchema = new mongoose.Schema({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  runOrder: {
    type: Number,
    min: 1,
    required: true
  }
});

// 团队赛成员schema（不包含runOrder）
const teamMemberSchema = new mongoose.Schema({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  }
});

const eventRegistrationSchema = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  gameTypes: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    group: {
      type: String,
      required: true,
      trim: true
    },
    // 统一的team结构，支持接力赛和团队赛
    team: {
      name: {
        type: String,
        trim: true
      },
      // 使用Mixed类型支持两种成员格式
      members: [{
        type: mongoose.Schema.Types.Mixed
      }]
    },
    // 邀请码，仅用于接力赛和团队赛
    inviteCode: {
      type: String,
      sparse: true // 只有设置了inviteCode的文档才会被索引
    }
  }],
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled'],
    default: 'confirmed'
  },
  registeredAt: {
    type: Date,
    default: Date.now
  },

}, {
  timestamps: true
});

// 添加自定义验证器来验证gameTypes中的team.members
eventRegistrationSchema.path('gameTypes').validate(function(gameTypes) {
  for (const gameType of gameTypes) {
    if (gameType.team && gameType.team.members) {
      for (const member of gameType.team.members) {
        // 如果是接力赛，必须有runOrder字段
        if (gameType.name === '接力赛') {
          if (!member._id || typeof member.runOrder !== 'number' || member.runOrder < 1) {
            return false;
          }
        }
        // 如果是团队赛，不应该有runOrder字段
        else if (gameType.name === '团队赛') {
          if (!member._id || member.runOrder !== undefined) {
            return false;
          }
        }
      }
    }
  }
  return true;
}, 'Invalid team members format for game type');

// 复合唯一索引，确保每个学生在每个赛事中只能有一条报名记录
eventRegistrationSchema.index({ eventId: 1, studentId: 1 }, { unique: true });

// 其他索引优化查询性能
eventRegistrationSchema.index({ eventId: 1 });
eventRegistrationSchema.index({ studentId: 1 });
eventRegistrationSchema.index({ status: 1 });
eventRegistrationSchema.index({ registeredAt: 1 });
// 为gameTypes中的inviteCode创建复合索引
eventRegistrationSchema.index({ 'gameTypes.inviteCode': 1 }, { sparse: true });

// 虚拟字段，用于填充关联数据
eventRegistrationSchema.virtual('event', {
  ref: 'Event',
  localField: 'eventId',
  foreignField: '_id',
  justOne: true
});

eventRegistrationSchema.virtual('student', {
  ref: 'Student',
  localField: 'studentId',
  foreignField: '_id',
  justOne: true
});

// 静态方法：生成唯一邀请码（使用时间戳+随机字符+计数器）
eventRegistrationSchema.statics.generateInviteCode = function() {
  const timestamp = Date.now().toString(36).slice(-3); // 取时间戳的后3位
  const random = crypto.randomBytes(2).toString('hex').toUpperCase(); // 4位随机字符
  const counter = (++inviteCodeCounter % 100).toString().padStart(2, '0'); // 2位计数器
  return timestamp + random + counter; // 总共8位字符
};

// 静态方法：生成唯一邀请码并检查重复（带重试机制）
eventRegistrationSchema.statics.generateUniqueInviteCode = async function(maxRetries = 5) {
  for (let i = 0; i < maxRetries; i++) {
    const inviteCode = this.generateInviteCode();
    
    // 检查是否已存在相同的邀请码
    const existing = await this.findOne({ 'gameTypes.inviteCode': inviteCode });
    
    if (!existing) {
      return inviteCode;
    }
    
    // 如果重复，等待一小段时间后重试
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  
  throw new Error('无法生成唯一的邀请码，请稍后重试');
};

// 静态方法：为接力赛和团队赛游戏类型生成邀请码
eventRegistrationSchema.statics.generateInviteCodesForRelayGames = async function(gameTypes) {
  const relayGameTypes = ['接力赛', '团队赛'];
  
  for (let gameType of gameTypes) {
    if (relayGameTypes.includes(gameType.name)) {
      gameType.inviteCode = await this.generateUniqueInviteCode();
    }
  }
  
  return gameTypes;
};



// 确保虚拟字段在JSON序列化时包含
eventRegistrationSchema.set('toJSON', { virtuals: true });
eventRegistrationSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('EventRegistration', eventRegistrationSchema);