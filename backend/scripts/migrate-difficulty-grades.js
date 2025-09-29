const mongoose = require('mongoose');
const Configuration = require('../models/Configuration');
require('dotenv').config();

// Color mapping from hex codes to Chinese names
const colorMapping = {
  '#BBF451': '浅绿色',
  '#FFFFFF': '白色',
  '#FFF085': '浅黄色',
  '#FFB93B': '橙色',
  '#FF6467': '红色',
  '#8207DB': '紫色',
  '#2B7FFF': '蓝色',
  '#000000': '黑色',
  '#3B82F6': '蓝色',
  '#EF4444': '红色',
  '#10B981': '绿色',
  '#F59E0B': '黄色',
  '#8B5CF6': '紫色',
  '#EC4899': '粉色',
  '#06B6D4': '青色',
  '#84CC16': '青绿色',
  '#F97316': '橙红色',
  '#6366F1': '靛蓝色'
};

async function migrateDifficultyGrades() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const config = await Configuration.getSingleton();
    console.log(`📊 Found configuration with ${config.difficultyGrades.length} difficulty grades`);

    let migrationNeeded = false;
    const updatedGrades = config.difficultyGrades.map((grade, index) => {
      // Check if this grade needs migration (has old 'color' field but no 'colorCode')
      if (grade.color && !grade.colorCode) {
        console.log(`🔄 Migrating grade ${index + 1}: ${grade.level}`);
        console.log(`   Old color field: ${grade.color}`);
        
        // If the color field contains a hex code, migrate it
        if (/^#[0-9A-F]{6}$/i.test(grade.color)) {
          const hexCode = grade.color;
          const colorName = colorMapping[hexCode] || '未知颜色';
          
          console.log(`   ✅ Migrating hex code ${hexCode} to colorCode`);
          console.log(`   ✅ Setting color name to: ${colorName}`);
          
          migrationNeeded = true;
          return {
            ...grade.toObject(),
            colorCode: hexCode,
            color: colorName
          };
        } else {
          // If color field contains a name, keep it and set a default colorCode
          console.log(`   ✅ Keeping color name: ${grade.color}`);
          console.log(`   ✅ Setting default colorCode: #3B82F6`);
          
          migrationNeeded = true;
          return {
            ...grade.toObject(),
            colorCode: '#3B82F6',
            color: grade.color
          };
        }
      } else if (grade.colorCode && grade.color) {
        console.log(`✅ Grade ${index + 1} already migrated: ${grade.level}`);
        return grade.toObject();
      } else {
        console.log(`⚠️  Grade ${index + 1} has incomplete data: ${grade.level}`);
        migrationNeeded = true;
        return {
          ...grade.toObject(),
          colorCode: grade.colorCode || grade.color || '#3B82F6',
          color: grade.color || '未知颜色'
        };
      }
    });

    if (migrationNeeded) {
      console.log('\n💾 Saving migrated configuration...');
      config.difficultyGrades = updatedGrades;
      await config.save();
      console.log('✅ Migration completed successfully!');
      
      console.log('\n📋 Migration Summary:');
      updatedGrades.forEach((grade, index) => {
        console.log(`   ${index + 1}. ${grade.level}: ${grade.color} (${grade.colorCode})`);
      });
    } else {
      console.log('✅ No migration needed - all grades already have both colorCode and color fields');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the migration
if (require.main === module) {
  migrateDifficultyGrades();
}

module.exports = { migrateDifficultyGrades };