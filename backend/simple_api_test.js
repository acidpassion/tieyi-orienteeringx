const axios = require('axios');
const mongoose = require('mongoose');
const EventRegistration = require('./models/EventRegistration');

async function simpleApiTest() {
  try {
    console.log('🚀 开始简单API测试...');
    
    // 连接数据库
    await mongoose.connect('mongodb://localhost:27017/orienteeringx');
    console.log('🔌 连接到MongoDB');
    
    // 清理已存在的注册记录
    await EventRegistration.deleteMany({
      eventId: '68c58d4782eaf0375a9df722',
      studentId: '6890c4b4e2e61a6f5e2f1fb1'
    });
    console.log('🗑️ 清理已存在的注册记录');
    
    const payload = {
      "eventId": "68c58d4782eaf0375a9df722",
      "gameTypes": [
        {
          "name": "接力赛",
          "group": "小黑马",
          "team": {
            "name": "接力赛队伍",
            "members": [
              {
                "_id": "6890c4b4e2e61a6f5e2f1fb1",
                "runOrder": 1,
                "captain": true
              },
              {
                "_id": "6890c4b4e2e61a6f5e2f1fa4",
                "runOrder": 2,
                "captain": false
              },
              {
                "_id": "6890c4b4e2e61a6f5e2f1fb3",
                "runOrder": 3,
                "captain": false
              }
            ]
          }
        }
      ]
    };
    
    console.log('📤 发送的payload:');
    console.log(JSON.stringify(payload, null, 2));
    
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODkwYzRiNGUyZTYxYTZmNWUyZjFmYjEiLCJyb2xlIjoic3R1ZGVudCIsImlhdCI6MTc1ODk1ODAyMSwiZXhwIjoxNzY2NzM0MDIxfQ.0DoJ2Gc4ZSFe-RCjTDMAJz4xaWiOVKrdcEOjHSmyTGw';
    
    // 发送API请求
    const response = await axios.post('http://localhost:5001/api/registrations', payload, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ API请求成功!');
    console.log('响应状态:', response.status);
    console.log('响应数据:', response.data);
    
    // 检查数据库中保存的数据
    const savedRegistration = await EventRegistration.findOne({
      eventId: '68c58d4782eaf0375a9df722',
      studentId: '6890c4b4e2e61a6f5e2f1fb1'
    });
    
    if (savedRegistration) {
      console.log('\n📋 数据库中保存的注册记录:');
      console.log('EventId:', savedRegistration.eventId);
      console.log('StudentId:', savedRegistration.studentId);
      console.log('GameTypes:', JSON.stringify(savedRegistration.gameTypes, null, 2));
      
      // 特别检查captain字段
      const relayGameType = savedRegistration.gameTypes.find(gt => gt.name === '接力赛');
      if (relayGameType && relayGameType.team && relayGameType.team.members) {
        console.log('\n🏃 接力赛队伍成员详情:');
        relayGameType.team.members.forEach((member, index) => {
          console.log(`成员 ${index + 1}:`);
          console.log(`  _id: ${member._id}`);
          console.log(`  runOrder: ${member.runOrder}`);
          console.log(`  captain: ${member.captain} (类型: ${typeof member.captain})`);
        });
      }
    } else {
      console.log('❌ 数据库中没有找到保存的注册记录');
    }
    
  } catch (error) {
    console.error('💥 测试失败:', error.message);
    if (error.response) {
      console.log('响应状态:', error.response.status);
      console.log('响应数据:', error.response.data);
    }
  } finally {
    await mongoose.disconnect();
    console.log('🔌 断开MongoDB连接');
  }
}

simpleApiTest();