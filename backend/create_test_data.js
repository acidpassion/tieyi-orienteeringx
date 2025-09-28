const mongoose = require('mongoose');
require('dotenv').config();

async function createTestData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/orienteeringx');
    console.log('✅ 连接到MongoDB');
    
    const Event = require('./models/Event');
    const Student = require('./models/Student');
    
    // 创建测试事件
    const testEvent = new Event({
      eventName: '测试定向越野赛事',
      organization: '小马越野',
      eventType: '常规训练',
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-01-02'),
      location: '测试地点',
      openRegistration: true,
      gameTypes: [
        { name: '短距离', teamSize: 1 },
        { name: '接力赛', teamSize: 3 }
      ],
      groups: [
        { code: '小黑马', name: '小黑马组', ageRange: '18-25', gender: 'mixed' }
      ]
    });
    
    const savedEvent = await testEvent.save();
    console.log('✅ 创建测试事件:', savedEvent._id);
    
    // 创建测试用户
    const testUsers = [
      {
        _id: new mongoose.Types.ObjectId('6890c4b4e2e61a6f5e2f1fb1'),
        username: 'testuser1',
        email: 'test1@example.com',
        password: 'hashedpassword',
        profile: {
          realName: '测试用户1',
          grade: '大一'
        }
      },
      {
        _id: new mongoose.Types.ObjectId('6890c4b4e2e61a6f5e2f1fa4'),
        username: 'testuser2',
        email: 'test2@example.com',
        password: 'hashedpassword',
        profile: {
          realName: '测试用户2',
          grade: '大二'
        }
      },
      {
        _id: new mongoose.Types.ObjectId('6890c4b4e2e61a6f5e2f1fb3'),
        username: 'testuser3',
        email: 'test3@example.com',
        password: 'hashedpassword',
        profile: {
          realName: '测试用户3',
          grade: '大三'
        }
      }
    ];
    
    for (const userData of testUsers) {
      const existingUser = await Student.findById(userData._id);
      if (!existingUser) {
        const user = new Student(userData);
        await user.save();
        console.log(`✅ 创建测试用户: ${userData.username} (${userData._id})`);
      } else {
        console.log(`ℹ️ 用户已存在: ${userData.username} (${userData._id})`);
      }
    }
    
    console.log('\n🎯 测试数据创建完成!');
    console.log(`事件ID: ${savedEvent._id}`);
    console.log('用户IDs:');
    testUsers.forEach(user => {
      console.log(`  ${user.username}: ${user._id}`);
    });
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 断开MongoDB连接');
  }
}

createTestData();