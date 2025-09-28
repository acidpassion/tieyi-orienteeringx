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

const testCaptainField = async () => {
  console.log('🚀 最终Captain字段测试...');
  
  await connectDB();
  
  // 导入模型
  const EventRegistration = require('./models/EventRegistration');
  const Student = require('./models/Student');
  
  // 使用正确的事件ID（从数据库中找到的）
  const correctEventId = '68d8056278b9f8609132e845';
  
  // 清理现有注册记录
  console.log('🗑️ 清理已存在的注册记录');
  await EventRegistration.deleteMany({ eventId: correctEventId });
  
  // 使用用户提供的确切payload结构，但使用正确的事件ID
  const payload = {
    "eventId": correctEventId, // 使用正确的事件ID
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
  
  console.log('📤 发送的payload（用户原始结构，但使用正确事件ID）:');
  console.log(JSON.stringify(payload, null, 2));
  
  try {
    const response = await axios.post('http://localhost:5001/api/registrations', payload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODkwYzRiNGUyZTYxYTZmNWUyZjFmYjEiLCJyb2xlIjoic3R1ZGVudCIsImlhdCI6MTc1ODk1ODAyMSwiZXhwIjoxNzY2NzM0MDIxfQ.0DoJ2Gc4ZSFe-RCjTDMAJz4xaWiOVKrdcEOjHSmyTGw'
      }
    });
    
    console.log('✅ API调用成功!');
    console.log('响应状态:', response.status);
    console.log('响应数据:', JSON.stringify(response.data, null, 2));
    
    // 检查数据库中保存的注册记录
    const savedRegistration = await EventRegistration.findOne({ eventId: correctEventId }).populate('studentId');
    
    if (savedRegistration) {
      console.log('\n📊 数据库验证结果:');
      console.log('✅ 注册记录已成功保存');
      
      // 专门检查接力赛的captain字段
      const relayGameType = savedRegistration.gameTypes.find(gt => gt.name === '接力赛');
      if (relayGameType && relayGameType.team) {
        console.log('\n🎯 接力赛Captain字段详细检查:');
        console.log('队伍名称:', relayGameType.team.name);
        console.log('队员总数:', relayGameType.team.members.length);
        
        relayGameType.team.members.forEach((member, index) => {
          console.log(`\n队员 ${index + 1}:`);
          console.log('  ID:', member._id.toString());
          console.log('  跑步顺序:', member.runOrder);
          console.log('  是否队长:', member.captain);
          console.log('  Captain字段类型:', typeof member.captain);
        });
        
        const captainCount = relayGameType.team.members.filter(m => m.captain === true).length;
        const nonCaptainCount = relayGameType.team.members.filter(m => m.captain === false).length;
        
        console.log('\n📈 统计结果:');
        console.log('队长数量:', captainCount);
        console.log('非队长数量:', nonCaptainCount);
        
        if (captainCount === 1 && nonCaptainCount === 2) {
          console.log('\n🎉 SUCCESS: Captain字段已正确保存！');
          console.log('✅ 有且仅有1个队长');
          console.log('✅ 有2个非队长成员');
          console.log('✅ 所有captain字段都是布尔值');
        } else {
          console.log('\n❌ FAILED: Captain字段保存有问题');
        }
      } else {
        console.log('❌ 未找到接力赛项目或队伍信息');
      }
    } else {
      console.log('❌ 数据库中未找到注册记录');
    }
    
  } catch (error) {
    console.log('💥 API调用失败:', error.message);
    if (error.response) {
      console.log('响应状态:', error.response.status);
      console.log('响应数据:', error.response.data);
    }
  }
  
  console.log('\n🔌 断开MongoDB连接');
  await mongoose.disconnect();
};

testCaptainField();