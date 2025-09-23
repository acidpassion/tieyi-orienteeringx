const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const readline = require('readline');
const path = require('path');

// Load environment variables from parent directory
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Import Student model
const Student = require('../models/Student');

// Create readline interface for user confirmation
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * 批量更新初一年级学生密码哈希为初始值
 */
async function updateGradePasswords() {
  try {
    console.log('🔗 连接到MongoDB数据库...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功');
    
    // Find all students with grade = '初一'
    console.log('🔍 查找所有初一年级学生...');
    const students = await Student.find({ grade: '初一' });
    
    if (students.length === 0) {
      console.log('ℹ️  未找到初一年级学生');
      return;
    }
    
    console.log(`📊 找到 ${students.length} 名初一年级学生:`);
    students.forEach((student, index) => {
      console.log(`  ${index + 1}. ${student.name} (${student.grade}${student.class ? student.class + '班' : ''})`);
    });
    
    // Ask for confirmation
    const answer = await new Promise((resolve) => {
      rl.question(`\n⚠️  确认要将这 ${students.length} 名学生的密码重置为 "8888888" 吗？(y/N): `, resolve);
    });
    
    if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
      console.log('❌ 操作已取消');
      return;
    }
    
    console.log('🔄 开始批量更新密码...');
    
    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('88888888', salt);
    
    // Update all students' passwords
    const result = await Student.updateMany(
      { grade: '初一' },
      { 
        $set: { 
          password: hashedPassword 
        } 
      }
    );
    
    console.log('✅ 密码更新完成!');
    console.log(`📈 更新统计:`);
    console.log(`  - 匹配的学生数: ${result.matchedCount}`);
    console.log(`  - 实际更新数: ${result.modifiedCount}`);
    
    if (result.modifiedCount > 0) {
      console.log('🎉 所有初一年级学生的密码已成功重置为: 8888888');
    } else {
      console.log('⚠️  没有学生密码被更新');
    }
    
  } catch (error) {
    console.error('❌ 更新密码时发生错误:', error.message);
    console.error('详细错误信息:', error);
  } finally {
    // Close database connection
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('🔌 数据库连接已关闭');
    }
    
    // Close readline interface
    rl.close();
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\n\n⚠️  收到中断信号，正在安全退出...');
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
  }
  rl.close();
  process.exit(0);
});

// Run the script
if (require.main === module) {
  console.log('🚀 启动批量密码更新脚本');
  console.log('📋 目标: 更新所有初一年级学生密码为 "8888888"');
  console.log('=' .repeat(50));
  
  updateGradePasswords()
    .then(() => {
      console.log('\n🏁 脚本执行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 脚本执行失败:', error);
      process.exit(1);
    });
}

module.exports = { updateGradePasswords };