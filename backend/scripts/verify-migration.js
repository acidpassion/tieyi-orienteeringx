const mongoose = require('mongoose');

async function verifyMigration() {
  try {
    await mongoose.connect('mongodb://localhost:27017/orienteeringx');
    console.log('✅ 数据库连接成功');
    
    const db = mongoose.connection.db;
    const collection = db.collection('students');
    
    const totalCount = await collection.countDocuments();
    console.log(`📊 总学生记录数: ${totalCount}`);
    
    const samples = await collection.find({}).limit(5).toArray();
    console.log('\n🔍 迁移后的示例记录:');
    samples.forEach(s => {
      console.log(`${s.name}: 年级=${s.grade}, 班级=${s.class} (类型: ${typeof s.class})`);
    });
    
    // 检查数据类型分布
    const gradeStats = await collection.aggregate([
      { $group: { _id: '$grade', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]).toArray();
    
    console.log('\n📈 年级分布:');
    gradeStats.forEach(stat => {
      console.log(`  ${stat._id}: ${stat.count} 人`);
    });
    
    const classTypeCheck = await collection.find({ class: { $type: 'number' } }).count();
    console.log(`\n✅ 班级字段为数字类型的记录数: ${classTypeCheck}`);
    
    await mongoose.disconnect();
    console.log('\n🎉 验证完成！');
    
  } catch (error) {
    console.error('❌ 验证失败:', error);
    process.exit(1);
  }
}

verifyMigration();