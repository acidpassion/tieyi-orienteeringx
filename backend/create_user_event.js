const mongoose = require('mongoose');
const Event = require('./models/Event');
const Student = require('./models/Student');

async function createUserEvent() {
  try {
    await mongoose.connect('mongodb://localhost:27017/orienteeringx');
    console.log('🔌 连接到MongoDB');
    
    const eventId = '68c58d4782eaf0375a9df722';
    
    // 检查事件是否存在
    let event = await Event.findById(eventId);
    
    if (!event) {
      console.log('📅 创建用户指定的事件...');
      
      // 创建事件
      event = new Event({
        _id: new mongoose.Types.ObjectId(eventId),
        name: '用户测试定向越野赛事',
        description: '用于测试captain字段的赛事',
        organization: '小马越野',
        eventType: '常规训练',
        startDate: new Date('2024-02-01'),
        endDate: new Date('2024-02-02'),
        location: '测试地点',
        openRegistration: true,
        gameTypes: [
          {
            name: '短距离',
            description: '个人短距离项目',
            teamSize: 1
          },
          {
            name: '接力赛',
            description: '团队接力项目',
            teamSize: 3
          }
        ],
        groups: [
          {
            name: '小黑马',
            description: '小黑马组别'
          }
        ]
      });
      
      await event.save();
      console.log('✅ 事件创建成功:', event._id);
    } else {
      console.log('✅ 事件已存在:', event._id);
    }
    
    // 检查学生是否存在
    const studentIds = [
      '6890c4b4e2e61a6f5e2f1fb1',
      '6890c4b4e2e61a6f5e2f1fa4', 
      '6890c4b4e2e61a6f5e2f1fb3'
    ];
    
    for (const studentId of studentIds) {
      let student = await Student.findById(studentId);
      if (!student) {
        console.log(`👤 创建学生 ${studentId}...`);
        student = new Student({
          _id: new mongoose.Types.ObjectId(studentId),
          name: `测试学生_${studentId.slice(-4)}`,
          studentNumber: `TEST${studentId.slice(-4)}`,
          email: `test_${studentId.slice(-4)}@example.com`,
          password: 'hashedpassword'
        });
        await student.save();
        console.log(`✅ 学生创建成功: ${student.name}`);
      } else {
        console.log(`✅ 学生已存在: ${student.name}`);
      }
    }
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 断开MongoDB连接');
  }
}

createUserEvent();