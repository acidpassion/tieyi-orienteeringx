const mongoose = require('mongoose');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const Student = require('./models/Student');
const Event = require('./models/Event');
const EventRegistration = require('./models/EventRegistration');
require('dotenv').config();

// 连接数据库
const MONGODB_URI = 'mongodb://localhost:27017/orienteeringx';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// 测试数据
const testPayload = {
  "eventId": "68c58d4782eaf0375a9df722",
  "gameTypes": [
    {
      "name": "短距离",
      "group": "小黑马"
    },
    {
      "name": "接力赛",
      "group": "小黑马",
      "team": {
        "name": "接力赛队伍",
        "members": [
          {
            "_id": "6890c4b4e2e61a6f5e2f1fb1",
            "runOrder": 1
          },
          {
            "_id": "6890c4b4e2e61a6f5e2f1fa4",
            "runOrder": 2
          },
          {
            "_id": "6890c4b4e2e61a6f5e2f1fb3",
            "runOrder": 3
          }
        ]
      }
    }
  ]
};

async function testRelayRegistration() {
  try {
    console.log('=== 接力赛团队注册测试开始 ===');
    
    // 1. 创建测试学生数据
    console.log('\n1. 创建测试学生数据...');
    const memberIds = testPayload.gameTypes[1].team.members.map(m => m._id);
    
    // 删除现有的测试学生
    await Student.deleteMany({ _id: { $in: memberIds } });
    
    // 创建测试学生
    const testStudents = [
      { _id: memberIds[0], name: '测试学生1', grade: '初一', class: 1, password: 'password123' },
      { _id: memberIds[1], name: '测试学生2', grade: '初一', class: 2, password: 'password123' },
      { _id: memberIds[2], name: '测试学生3', grade: '初二', class: 1, password: 'password123' }
    ];
    
    await Student.insertMany(testStudents);
    console.log('测试学生创建完成');
    
    // 2. 创建测试事件数据
    console.log('\n2. 创建测试事件数据...');
    await Event.findByIdAndDelete(testPayload.eventId);
    
    const testEvent = new Event({
      _id: testPayload.eventId,
      eventName: '测试接力赛事件',
      organization: '小马越野',
      startDate: new Date(),
      endDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 明天
      eventType: '常规训练',
      location: '测试地点',
      openRegistration: true,
      gameTypes: [
        { name: '短距离', teamSize: 1 },
        { name: '接力赛', teamSize: 3 }
      ],
      groups: ['小黑马']
    });
    
    await testEvent.save();
    console.log('测试事件创建完成');
    
    // 3. 清理之前的注册数据
    console.log('\n3. 清理之前的注册数据...');
    await EventRegistration.deleteMany({
      eventId: testPayload.eventId,
      studentId: { $in: memberIds }
    });
    console.log('注册数据清理完成');
    
    // 4. 发送注册请求
    console.log('\n4. 发送团队注册请求...');
    // 使用测试JWT token (这个token包含第一个学生的ID)
    const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODkwYzRiNGUyZTYxYTZmNWUyZjFmYjEiLCJyb2xlIjoic3R1ZGVudCIsImlhdCI6MTc1ODk1ODAyMSwiZXhwIjoxNzY2NzM0MDIxfQ.0DoJ2Gc4ZSFe-RCjTDMAJz4xaWiOVKrdcEOjHSmyTGw';
    
    const response = await axios.post('http://localhost:5001/api/registrations', testPayload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testToken}`
      }
    });
    
    console.log('注册请求响应状态:', response.status);
    console.log('注册请求响应数据:', JSON.stringify(response.data, null, 2));
    
    // 5. 检查数据库中的注册记录
    console.log('\n5. 检查数据库中的注册记录...');
    const registrations = await EventRegistration.find({
      eventId: testPayload.eventId,
      studentId: { $in: memberIds }
    }).populate('studentId', 'name');
    
    console.log(`\n找到 ${registrations.length} 条注册记录:`);
    
    registrations.forEach((reg, index) => {
      console.log(`\n记录 ${index + 1}:`);
      console.log(`  学生: ${reg.studentId.name} (${reg.studentId._id})`);
      console.log(`  游戏类型数量: ${reg.gameTypes.length}`);
      
      reg.gameTypes.forEach((gameType, gtIndex) => {
        console.log(`  游戏类型 ${gtIndex + 1}: ${gameType.name} - ${gameType.group}`);
        if (gameType.name === '接力赛') {
          console.log(`    团队名称: ${gameType.team?.name || '无'}`);
          console.log(`    邀请码: ${gameType.inviteCode || '无'}`);
          console.log(`    游戏类型ID: ${gameType._id}`);
          console.log(`    团队成员数量: ${gameType.team?.members?.length || 0}`);
          if (gameType.team?.members) {
            gameType.team.members.forEach((member, mIndex) => {
              console.log(`      成员 ${mIndex + 1}: ${member._id} (跑步顺序: ${member.runOrder})`);
            });
          }
        }
      });
    });
    
    // 6. 验证结果
    console.log('\n6. 验证测试结果...');
    const relayRegistrations = registrations.filter(reg => 
      reg.gameTypes.some(gt => gt.name === '接力赛')
    );
    
    console.log(`\n接力赛注册记录数量: ${relayRegistrations.length}`);
    console.log(`预期数量: ${memberIds.length}`);
    
    if (relayRegistrations.length === memberIds.length) {
      console.log('✅ 成功: 所有团队成员都有注册记录');
      
      // 检查所有记录是否有相同的团队信息和邀请码
      const firstRelayGameType = relayRegistrations[0].gameTypes.find(gt => gt.name === '接力赛');
      const allSame = relayRegistrations.every(reg => {
        const relayGT = reg.gameTypes.find(gt => gt.name === '接力赛');
        return relayGT && 
               relayGT.inviteCode === firstRelayGameType.inviteCode &&
               (relayGT._id ? relayGT._id.toString() : relayGT._id) === (firstRelayGameType._id ? firstRelayGameType._id.toString() : firstRelayGameType._id) &&
               relayGT.team?.name === firstRelayGameType.team?.name &&
               relayGT.team?.members?.length === firstRelayGameType.team?.members?.length;
      });
      
      if (allSame) {
        console.log('✅ 成功: 所有团队成员的接力赛记录信息一致');
      } else {
        console.log('❌ 失败: 团队成员的接力赛记录信息不一致');
      }
    } else {
      console.log('❌ 失败: 团队成员注册记录数量不正确');
      console.log(`缺少的成员ID: ${memberIds.filter(id => 
        !relayRegistrations.some(reg => reg.studentId._id.toString() === id)
      )}`);
    }
    
  } catch (error) {
    console.error('测试过程中发生错误:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
  } finally {
    mongoose.connection.close();
  }
}

// 运行测试
testRelayRegistration();