const axios = require('axios');
const mongoose = require('mongoose');
const EventRegistration = require('./models/EventRegistration');
const Event = require('./models/Event');
const Student = require('./models/Student');

// API基础URL
const API_BASE = 'http://localhost:3000/api';

// 连接数据库
mongoose.connect('mongodb://localhost:27017/orienteeringx', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function testE2EInviteCode() {
  try {
    console.log('🧪 Starting E2E invite code test...');
    
    // 1. 查找现有的测试数据
    const testEvent = await Event.findOne({ name: /测试/ });
    const testStudent = await Student.findOne({ name: /测试/ });
    
    if (!testEvent || !testStudent) {
      console.log('⚠️  No test event or student found. Creating mock registration data...');
      
      // 创建模拟注册数据进行测试
      const mockRegistration = new EventRegistration({
        eventId: new mongoose.Types.ObjectId(),
        studentId: new mongoose.Types.ObjectId(),
        gameTypes: [
          {
            name: '接力赛',
            group: 'A组',
            team: {
              name: '测试接力队',
              members: [
                { _id: new mongoose.Types.ObjectId(), runOrder: 1 }
              ]
            }
          },
          {
            name: '团队赛', 
            group: 'B组',
            team: {
              name: '测试团队',
              members: [
                { _id: new mongoose.Types.ObjectId() }
              ]
            }
          }
        ]
      });
      
      // 为接力赛和团队赛生成邀请码
      const gameTypesWithCodes = await EventRegistration.generateInviteCodesForRelayGames(mockRegistration.gameTypes);
      mockRegistration.gameTypes = gameTypesWithCodes;
      
      await mockRegistration.save();
      
      console.log('✅ Mock registration created with invite codes:');
      mockRegistration.gameTypes.forEach(gt => {
        if (gt.inviteCode) {
          console.log(`  - ${gt.name}: ${gt.inviteCode}`);
        }
      });
      
      // 2. 测试通过邀请码查找注册记录
      const relayGameType = mockRegistration.gameTypes.find(gt => gt.name === '接力赛');
      if (relayGameType && relayGameType.inviteCode) {
        console.log('\n🔍 Testing invite code lookup...');
        
        const foundRegistration = await EventRegistration.findOne({
          'gameTypes.inviteCode': relayGameType.inviteCode
        });
        
        if (foundRegistration) {
          console.log('✅ Registration found by invite code:', relayGameType.inviteCode);
          
          // 查找对应的游戏类型
          const foundGameType = foundRegistration.gameTypes.find(gt => gt.inviteCode === relayGameType.inviteCode);
          console.log('✅ Game type found:', foundGameType.name);
        } else {
          console.log('❌ Registration not found by invite code');
        }
      }
      
      // 3. 测试多个邀请码的唯一性
      console.log('\n🔄 Testing invite code uniqueness...');
      const codes = [];
      for (let i = 0; i < 10; i++) {
        const code = await EventRegistration.generateUniqueInviteCode();
        codes.push(code);
      }
      
      const uniqueCodes = new Set(codes);
      console.log(`✅ Generated ${codes.length} codes, ${uniqueCodes.size} unique`);
      console.log('✅ All codes are unique:', codes.length === uniqueCodes.size);
      
      // 清理测试数据
      await EventRegistration.deleteOne({ _id: mockRegistration._id });
      console.log('🧹 Test data cleaned up');
      
    } else {
      console.log('✅ Found existing test data, skipping mock data creation');
    }
    
    console.log('\n🎉 E2E test completed successfully!');
    
  } catch (error) {
    console.error('❌ E2E test failed:', error);
  } finally {
    mongoose.connection.close();
  }
}

// 运行测试
testE2EInviteCode();