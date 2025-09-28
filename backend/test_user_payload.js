const axios = require('axios');
const mongoose = require('mongoose');
const EventRegistration = require('./models/EventRegistration');

// 用户提供的确切数据
const payload = {
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

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODkwYzRiNGUyZTYxYTZmNWUyZjFmYjEiLCJyb2xlIjoic3R1ZGVudCIsImlhdCI6MTc1ODk1ODAyMSwiZXhwIjoxNzY2NzM0MDIxfQ.0DoJ2Gc4ZSFe-RCjTDMAJz4xaWiOVKrdcEOjHSmyTGw';

async function testAPI() {
  try {
    console.log('🚀 开始API测试...');
    console.log('📤 发送的payload:');
    console.log(JSON.stringify(payload, null, 2));
    
    // 连接MongoDB
    await mongoose.connect('mongodb://localhost:27017/orienteeringx');
    console.log('🔌 连接到MongoDB');
    
    // 先删除可能存在的重复注册
    await EventRegistration.deleteMany({
      studentId: '6890c4b4e2e61a6f5e2f1fb1',
      eventId: payload.eventId
    });
    console.log('🗑️ 清理已存在的注册记录');
    
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
      studentId: '6890c4b4e2e61a6f5e2f1fb1',
      eventId: payload.eventId
    });
    
    if (savedRegistration) {
      console.log('\n📋 数据库中保存的注册记录:');
      console.log(JSON.stringify(savedRegistration.toObject(), null, 2));
      
      // 检查captain字段
      const relayGameType = savedRegistration.gameTypes.find(gt => gt.name === '接力赛');
      if (relayGameType && relayGameType.team && relayGameType.team.members) {
        console.log('\n🔍 检查captain字段:');
        relayGameType.team.members.forEach((member, index) => {
          console.log(`成员${index + 1}: _id=${member._id}, runOrder=${member.runOrder}, captain=${member.captain}`);
        });
        
        const captainCount = relayGameType.team.members.filter(m => m.captain === true).length;
        console.log(`👑 队长数量: ${captainCount}`);
        
        if (captainCount === 1) {
          console.log('✅ captain字段保存正确!');
        } else {
          console.log('❌ captain字段保存有问题!');
        }
      } else {
        console.log('❌ 未找到接力赛团队数据');
      }
    } else {
      console.log('❌ 未找到保存的注册记录');
    }
    
  } catch (error) {
    console.log('💥 测试失败:', error.message);
    if (error.response) {
      console.log('响应状态:', error.response.status);
      console.log('响应数据:', error.response.data);
    }
  } finally {
    await mongoose.disconnect();
    console.log('🔌 断开MongoDB连接');
  }
}

testAPI();