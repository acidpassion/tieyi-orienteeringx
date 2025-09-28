const mongoose = require('mongoose');
const Student = require('./models/Student');
require('dotenv').config();

async function checkUserIds() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 连接到MongoDB');
    
    const userIds = [
      '6890c4b4e2e61a6f5e2f1fb1',
      '6890c4b4e2e61a6f5e2f1fa4', 
      '6890c4b4e2e61a6f5e2f1fb3'
    ];
    
    console.log('🔍 检查用户ID是否存在:');
    for (const userId of userIds) {
      const user = await Student.findById(userId);
      if (user) {
        console.log(`✅ 用户存在: ${userId} (${user.username})`);
      } else {
        console.log(`❌ 用户不存在: ${userId}`);
      }
    }
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 断开MongoDB连接');
  }
}

checkUserIds();