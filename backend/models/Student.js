const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const studentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  username: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  grade: {
    type: String,
    required: true,
    trim: true,
    enum: ['初一', '初二', '初三', '高一', '高二', '高三', '已毕业队员']
  },
  class: {
    type: Number,
    required: function() {
      return this.grade !== '已毕业队员';
    },
    min: 1,
    max: 50
  },
  gender: {
    type: String,
    enum: ['男', '女'],
    default: '男'
  },
  birthday: {
    type: Date,
    default: null
  },
  avatar: {
    type: String,
    default: ''
  },
  password: {
    type: String,
    required: true,
    default: '88888888'
  },
  role: {
    type: String,
    enum: ['student', 'coach'],
    default: 'student'
  }
}, {
  timestamps: true
});

// Hash password before saving
studentSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    console.log('🔐 Password not modified, skipping hash');
    return next();
  }
  
  try {
    console.log('🔐 Hashing password for user:', this.name);
    console.log('  - Original password:', this.password);
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(this.password, salt);
    console.log('  - Hashed password:', hashedPassword);
    this.password = hashedPassword;
    next();
  } catch (error) {
    console.log('❌ Password hashing error:', error);
    next(error);
  }
});

// 虚拟字段：计算年龄
studentSchema.virtual('age').get(function() {
  if (!this.birthday) return null;
  const today = new Date();
  const birthDate = new Date(this.birthday);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
});

// 确保虚拟字段在JSON序列化时包含
studentSchema.set('toJSON', { virtuals: true });

// 添加复合索引以优化查询性能
studentSchema.index({ grade: 1, class: 1 });

// Compare password method
studentSchema.methods.comparePassword = async function(candidatePassword) {
  console.log('🔐 Password comparison:');
  console.log('  - Candidate password:', candidatePassword);
  console.log('  - Stored hash:', this.password);
  console.log('  - Candidate length:', candidatePassword ? candidatePassword.length : 0);
  console.log('  - Hash length:', this.password ? this.password.length : 0);
  
  const result = await bcrypt.compare(candidatePassword, this.password);
  console.log('  - Comparison result:', result);
  return result;
};

module.exports = mongoose.model('Student', studentSchema);