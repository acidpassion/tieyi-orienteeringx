const mongoose = require('mongoose');
const Event = require('./models/Event');

async function checkActualEvents() {
  try {
    await mongoose.connect('mongodb://localhost:27017/orienteeringx');
    console.log('🔌 连接到MongoDB');
    
    // 查找所有事件
    const events = await Event.find({});
    console.log('📋 数据库中的所有事件:');
    
    if (events.length === 0) {
      console.log('❌ 数据库中没有任何事件');
    } else {
      events.forEach((event, index) => {
        console.log(`事件 ${index + 1}:`);
        console.log(`  ID: ${event._id}`);
        console.log(`  eventName: ${event.eventName}`);
        console.log(`  name: ${event.name}`);
        console.log(`  组织: ${event.organization}`);
        console.log(`  开放注册: ${event.openRegistration}`);
        console.log(`  游戏类型: ${event.gameTypes ? event.gameTypes.map(gt => gt.name).join(', ') : 'None'}`);
        console.log(`  完整对象:`, JSON.stringify(event, null, 2));
        console.log('---');
      });
    }
    
    // 特别检查用户提供的ID
    const userEventId = '68c58d4782eaf0375a9df722';
    console.log(`\n🔍 检查用户提供的事件ID: ${userEventId}`);
    
    // 尝试不同的查询方式
    console.log('\n🔍 尝试findById查询:');
    const userEvent1 = await Event.findById(userEventId);
    console.log('findById结果:', userEvent1 ? 'FOUND' : 'NOT FOUND');
    
    console.log('\n🔍 尝试findOne查询:');
    const userEvent2 = await Event.findOne({ _id: userEventId });
    console.log('findOne结果:', userEvent2 ? 'FOUND' : 'NOT FOUND');
    
    console.log('\n🔍 尝试使用ObjectId查询:');
    const userEvent3 = await Event.findById(new mongoose.Types.ObjectId(userEventId));
    console.log('ObjectId查询结果:', userEvent3 ? 'FOUND' : 'NOT FOUND');
    
    if (userEvent1 || userEvent2 || userEvent3) {
      const foundEvent = userEvent1 || userEvent2 || userEvent3;
      console.log('\n✅ 找到的事件详情:', {
        _id: foundEvent._id,
        eventName: foundEvent.eventName,
        name: foundEvent.name,
        openRegistration: foundEvent.openRegistration,
        gameTypes: foundEvent.gameTypes
      });
    }
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
    console.error('错误堆栈:', error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 断开MongoDB连接');
  }
}

checkActualEvents();