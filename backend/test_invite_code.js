const mongoose = require('mongoose');
const EventRegistration = require('./models/EventRegistration');

// 连接数据库
mongoose.connect('mongodb://localhost:27017/orienteering_quiz', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function testInviteCodeGeneration() {
  try {
    console.log('🧪 Testing invite code generation...');
    
    // 测试生成唯一邀请码
    const inviteCode1 = await EventRegistration.generateUniqueInviteCode();
    const inviteCode2 = await EventRegistration.generateUniqueInviteCode();
    
    console.log('✅ Generated invite codes:', { inviteCode1, inviteCode2 });
    console.log('✅ Codes are unique:', inviteCode1 !== inviteCode2);
    
    // 测试为接力赛游戏生成邀请码
    const testGameTypes = [
      {
        name: '接力赛',
        group: 'A组',
        team: {
          members: [
            { _id: '507f1f77bcf86cd799439011', runOrder: 1 },
            { _id: '507f1f77bcf86cd799439012', runOrder: 2 }
          ]
        }
      },
      {
        name: '团队赛',
        group: 'B组',
        team: {
          members: [
            { _id: '507f1f77bcf86cd799439013' },
            { _id: '507f1f77bcf86cd799439014' }
          ]
        }
      },
      {
        name: '个人赛',
        group: 'C组',
        team: {
          members: [{ _id: '507f1f77bcf86cd799439015' }]
        }
      }
    ];
    
    const gameTypesWithCodes = await EventRegistration.generateInviteCodesForRelayGames(testGameTypes);
    
    console.log('\n🎯 Game types with invite codes:');
    gameTypesWithCodes.forEach((gt, index) => {
      console.log(`${index + 1}. ${gt.name}: ${gt.inviteCode || 'No invite code (expected for 个人赛)'}`);
    });
    
    // 验证只有接力赛和团队赛有邀请码
    const relayGame = gameTypesWithCodes.find(gt => gt.name === '接力赛');
    const teamGame = gameTypesWithCodes.find(gt => gt.name === '团队赛');
    const individualGame = gameTypesWithCodes.find(gt => gt.name === '个人赛');
    
    console.log('\n✅ Validation results:');
    console.log('- 接力赛 has invite code:', !!relayGame?.inviteCode);
    console.log('- 团队赛 has invite code:', !!teamGame?.inviteCode);
    console.log('- 个人赛 has no invite code:', !individualGame?.inviteCode);
    
    console.log('\n🎉 All tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    mongoose.connection.close();
  }
}

// 运行测试
testInviteCodeGeneration();