const mongoose = require('mongoose');
const EventRegistration = require('./models/EventRegistration');
require('dotenv').config();

async function testValidation() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 连接到MongoDB');
    
    // 测试数据 - 直接使用用户提供的结构
    const testData = {
      eventId: new mongoose.Types.ObjectId('68d8056278b9f8609132e845'),
      studentId: new mongoose.Types.ObjectId('6890c4b4e2e61a6f5e2f1fb1'),
      gameTypes: [
        {
          name: '短距离',
          group: '小黑马'
        },
        {
          name: '接力赛',
          group: '小黑马',
          team: {
            name: '接力赛队伍',
            members: [
              {
                _id: new mongoose.Types.ObjectId('6890c4b4e2e61a6f5e2f1fb1'),
                runOrder: 1,
                captain: true
              },
              {
                _id: new mongoose.Types.ObjectId('6890c4b4e2e61a6f5e2f1fa4'),
                runOrder: 2,
                captain: false
              },
              {
                _id: new mongoose.Types.ObjectId('6890c4b4e2e61a6f5e2f1fb3'),
                runOrder: 3,
                captain: false
              }
            ]
          }
        }
      ]
    };
    
    console.log('🧪 测试EventRegistration验证...');
    console.log('📋 测试数据:', JSON.stringify(testData, null, 2));
    
    // 创建EventRegistration实例
    const registration = new EventRegistration(testData);
    
    console.log('\n🔍 验证前的数据:');
    console.log(JSON.stringify(registration.toObject(), null, 2));
    
    // 手动触发验证
    const validationError = registration.validateSync();
    if (validationError) {
      console.log('❌ 验证失败:', validationError.message);
      console.log('详细错误:', validationError.errors);
    } else {
      console.log('✅ 验证通过!');
      
      // 尝试保存
      const saved = await registration.save();
      console.log('💾 保存成功!', saved._id);
    }
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
    if (error.errors) {
      console.log('详细错误:', error.errors);
    }
  } finally {
    await mongoose.disconnect();
    console.log('🔌 断开MongoDB连接');
  }
}

testValidation();