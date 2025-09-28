const mongoose = require('mongoose');
require('dotenv').config();

async function checkEvents() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/orienteeringx');
    console.log('✅ 连接到MongoDB');
    
    const Event = require('./models/Event');
    const events = await Event.find({}).limit(10);
    
    console.log('可用的事件:');
    if (events.length === 0) {
      console.log('❌ 没有找到任何事件');
    } else {
      events.forEach((e, index) => {
        console.log(`${index + 1}. ID: ${e._id}, Name: ${e.eventName || 'Unnamed Event'}`);
      });
    }
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 断开MongoDB连接');
  }
}

checkEvents();