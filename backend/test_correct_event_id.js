const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config();

// 连接MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🔌 连接到MongoDB');
  } catch (error) {
    console.error('❌ MongoDB连接失败:', error);
    process.exit(1);
  }
};

const testAPI = async () => {
  console.log('🚀 开始使用正确事件ID的API测试...');
  
  await connectDB();
  
  // 使用正确的事件ID
  const correctEventId = '68d8056278b9f8609132e845';
  
  // 导入模型
  const EventRegistration = require('./models/EventRegistration');
  const Student = require('./models/Student');
  
  // 清理现有注册记录
  console.log('🗑️ 清理已存在的注册记录');
  await EventRegistration.deleteMany({ eventId: correctEventId });
  
  const payload = {
    "eventId": correctEventId,
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
  
  try {
    const response = await axios.post('http://localhost:5001/api/registrations', payload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODkwYzRiNGUyZTYxYTZmNWUyZjFmYjEiLCJyb2xlIjoic3R1ZGVudCIsImlhdCI6MTc1ODk1ODAyMSwiZXhwIjoxNzY2NzM0MDIxfQ.0DoJ2Gc4ZSFe-RCjTDMAJz4xaWiOVKrdcEOjHSmyTGw'
      }
    });
    
    console.log('✅ 测试成功!');
    console.log('响应状态:', response.status);
    console.log('响应数据:', response.data);
    
    // 检查数据库中保存的注册记录
    const savedRegistration = await EventRegistration.findOne({ eventId: correctEventId }).populate('studentId');
    
    if (savedRegistration) {
      console.log('\n📊 数据库中保存的注册记录:');
      console.log('Event ID:', savedRegistration.eventId);
      console.log('Student ID:', savedRegistration.studentId._id);
      console.log('Student Name:', savedRegistration.studentId.name);
      console.log('Game Types:');
      
      savedRegistration.gameTypes.forEach((gameType, index) => {
        console.log(`\n  Game Type ${index + 1}:`);
        console.log('    Name:', gameType.name);
        console.log('    Group:', gameType.group);
        
        if (gameType.team) {
          console.log('    Team Name:', gameType.team.name);
          console.log('    Team Members:');
          gameType.team.members.forEach((member, memberIndex) => {
            console.log(`      Member ${memberIndex + 1}:`);
            console.log('        ID:', member._id);
            console.log('        Run Order:', member.runOrder);
            console.log('        Captain:', member.captain);
          });
        }
      });
      
      // 检查captain字段是否正确保存
      const relayGameType = savedRegistration.gameTypes.find(gt => gt.name === '接力赛');
      if (relayGameType && relayGameType.team) {
        const captainMember = relayGameType.team.members.find(m => m.captain === true);
        const nonCaptainMembers = relayGameType.team.members.filter(m => m.captain === false);
        
        console.log('\n🎯 Captain字段检查:');
        console.log('找到队长:', captainMember ? '是' : '否');
        if (captainMember) {
          console.log('队长ID:', captainMember._id);
          console.log('队长跑步顺序:', captainMember.runOrder);
        }
        console.log('非队长成员数量:', nonCaptainMembers.length);
      }
    } else {
      console.log('❌ 数据库中未找到注册记录');
    }
    
  } catch (error) {
    console.log('💥 测试失败:', error.message);
    if (error.response) {
      console.log('响应状态:', error.response.status);
      console.log('响应数据:', error.response.data);
    }
  }
  
  console.log('🔌 断开MongoDB连接');
  await mongoose.disconnect();
};

testAPI();