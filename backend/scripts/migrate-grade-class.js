const mongoose = require('mongoose');
const Student = require('../models/Student');

/**
 * 解析原始grade字段，提取年级和班级信息
 * @param {string} originalGrade - 原始grade字段值，如"初三16班"
 * @returns {object} - 包含grade和class的对象
 */
function parseGradeAndClass(originalGrade) {
  if (!originalGrade || typeof originalGrade !== 'string') {
    console.warn(`无效的grade值: ${originalGrade}`);
    return { grade: '初一', class: 1 };
  }

  // 提取前两个中文字符作为年级
  const grade = originalGrade.substring(0, 2);
  
  // 提取数字部分作为班级
  const classMatch = originalGrade.match(/\d+/);
  const classNumber = classMatch ? parseInt(classMatch[0], 10) : 1;
  
  // 验证年级是否有效
  const validGrades = ['初一', '初二', '初三', '高一', '高二', '高三'];
  const finalGrade = validGrades.includes(grade) ? grade : '初一';
  
  // 验证班级号是否在有效范围内
  const finalClass = (classNumber >= 1 && classNumber <= 50) ? classNumber : 1;
  
  return { grade: finalGrade, class: finalClass };
}

/**
 * 执行数据迁移
 */
async function migrateGradeClass() {
  try {
    console.log('🚀 开始迁移grade字段...');
    
    // 使用原生MongoDB查询绕过模型验证
    const collection = mongoose.connection.db.collection('students');
    const students = await collection.find({}).toArray();
    console.log(`📊 找到 ${students.length} 条学生记录`);
    
    if (students.length === 0) {
      console.log('✅ 没有需要迁移的数据');
      return;
    }
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let student of students) {
      try {
        const originalGrade = student.grade;
        
        // 跳过已经迁移过的记录（已经有class字段且为数字类型）
        if (typeof student.class === 'number') {
          console.log(`⏭️  跳过已迁移的学生 ${student.name}`);
          successCount++;
          continue;
        }
        
        // 解析年级和班级
        const { grade, class: classNumber } = parseGradeAndClass(originalGrade);
        
        // 使用原生MongoDB更新记录
        await collection.updateOne(
          { _id: student._id },
          { 
            $set: {
              grade: grade,
              class: classNumber
            }
          }
        );
        
        console.log(`✅ 更新学生 ${student.name}: "${originalGrade}" -> 年级: "${grade}", 班级: ${classNumber}`);
        successCount++;
        
      } catch (error) {
        console.error(`❌ 更新学生 ${student.name} 失败:`, error.message);
        errorCount++;
      }
    }
    
    console.log('\n📈 迁移统计:');
    console.log(`  ✅ 成功: ${successCount} 条`);
    console.log(`  ❌ 失败: ${errorCount} 条`);
    console.log(`  📊 总计: ${students.length} 条`);
    
    if (errorCount === 0) {
      console.log('🎉 迁移完成！所有数据已成功更新');
    } else {
      console.log('⚠️  迁移完成，但有部分数据更新失败，请检查错误日志');
    }
    
  } catch (error) {
    console.error('💥 迁移失败:', error);
    throw error;
  }
}

/**
 * 验证迁移结果
 */
async function validateMigration() {
  try {
    console.log('\n🔍 验证迁移结果...');
    
    // 使用原生MongoDB查询验证结果
    const collection = mongoose.connection.db.collection('students');
    const students = await collection.find({}, { projection: { name: 1, grade: 1, class: 1 } }).toArray();
    
    let validCount = 0;
    let invalidCount = 0;
    
    for (let student of students) {
      const isValidGrade = ['初一', '初二', '初三', '高一', '高二', '高三'].includes(student.grade);
      const isValidClass = typeof student.class === 'number' && student.class >= 1 && student.class <= 50;
      
      if (isValidGrade && isValidClass) {
        validCount++;
      } else {
        invalidCount++;
        console.warn(`⚠️  无效数据 - 学生: ${student.name}, 年级: ${student.grade}, 班级: ${student.class}`);
      }
    }
    
    console.log('\n📊 验证结果:');
    console.log(`  ✅ 有效记录: ${validCount} 条`);
    console.log(`  ❌ 无效记录: ${invalidCount} 条`);
    
    return invalidCount === 0;
    
  } catch (error) {
    console.error('💥 验证失败:', error);
    return false;
  }
}

// 主执行函数
async function main() {
  try {
    // 连接数据库
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/orienteeringx';
    console.log(`🔌 连接数据库: ${mongoUri}`);
    
    await mongoose.connect(mongoUri);
    console.log('✅ 数据库连接成功');
    
    // 执行迁移
    await migrateGradeClass();
    
    // 验证结果
    const isValid = await validateMigration();
    
    if (isValid) {
      console.log('\n🎉 迁移和验证都成功完成！');
      process.exit(0);
    } else {
      console.log('\n⚠️  迁移完成但验证发现问题，请检查数据');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('💥 脚本执行失败:', error);
    process.exit(1);
  } finally {
    // 关闭数据库连接
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('🔌 数据库连接已关闭');
    }
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

// 导出函数供其他模块使用
module.exports = {
  migrateGradeClass,
  validateMigration,
  parseGradeAndClass
};