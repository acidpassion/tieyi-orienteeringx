const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config();

// 用户提供的确切payload (使用新创建的事件ID)
const payload = {
  "eventId": "68d8056278b9f8609132e845",
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

// 用户提供的token
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODkwYzRiNGUyZTYxYTZmNWUyZjFmYjEiLCJyb2xlIjoic3R1ZGVudCIsImlhdCI6MTc1ODk1ODAyMSwiZXhwIjoxNzY2NzM0MDIxfQ.0DoJ2Gc4ZSFe-RCjTDMAJz4xaWiOVKrdcEOjHSmyTGw';

// API端点
const API_URL = 'http://localhost:5001/api/registrations';

async function testAPI() {
  try {
    console.log('🚀 开始API测试...');
    console.log('📤 发送的payload:');
    console.log(JSON.stringify(payload, null, 2));
    
    // 发送API请求
    const response = await axios.post(API_URL, payload, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    console.log('✅ API请求成功!');
    console.log('📥 响应状态:', response.status);
    console.log('📥 响应数据:');
    console.log(JSON.stringify(response.data, null, 2));
    
    // 连接数据库检查保存的数据
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/orienteeringx');
    console.log('✅ 连接到MongoDB');
    
    const EventRegistration = require('./models/EventRegistration');
    
    // 查找刚刚创建的注册记录
    const savedRegistration = await EventRegistration.findOne({
      eventId: payload.eventId,
      studentId: '6890c4b4e2e61a6f5e2f1fb1' // 从token中解析的用户ID
    }).sort({ createdAt: -1 });
    
    if (savedRegistration) {
      console.log('🔍 数据库中保存的数据:');
      console.log(JSON.stringify(savedRegistration.toObject(), null, 2));
      
      // 检查captain字段
      const relayGameType = savedRegistration.gameTypes.find(gt => gt.name === '接力赛');
      if (relayGameType && relayGameType.team && relayGameType.team.members) {
        console.log('\n🎯 检查captain字段:');
        relayGameType.team.members.forEach((member, index) => {
          console.log(`成员 ${index + 1}: _id=${member._id}, runOrder=${member.runOrder}, captain=${member.captain}`);
        });
        
        const captainCount = relayGameType.team.members.filter(m => m.captain === true).length;
        console.log(`队长数量: ${captainCount}`);
        
        if (captainCount === 1) {
          console.log('✅ captain字段保存正确!');
        } else {
          console.log('❌ captain字段保存有问题!');
        }
      } else {
        console.log('❌ 未找到接力赛团队数据!');
      }
    } else {
      console.log('❌ 未找到保存的注册记录!');
    }
    
  } catch (error) {
    console.error('💥 测试失败:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('🔌 断开MongoDB连接');
    }
  }
}

testAPI();