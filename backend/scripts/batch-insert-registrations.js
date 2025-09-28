const mongoose = require('mongoose');
const EventRegistration = require('../models/EventRegistration');
const Student = require('../models/Student');
const Event = require('../models/Event');
require('dotenv').config();

// Team combinations data
const teamCombinations = [
  '谢宇涛+梁琦东',
  '上官博升+陈彦霖',
  '朱子隽+朱浩铭', // Fixed the character
  '姚叶+冼小乔',
  '李皓宇+周熠家',
  '陈茵彤+谭湲梦',
  '程昶然+陈煜之',
  '周雨桐+凌子淇',
  '李潍旭+漆修睿',
  '黄俊智+谢柏乔',
  '周泽铭+曾梓鸿',
  '劳颖琳+胡婉仪',
  '郑荷馨+谢语涵',
  '黄启程+邝家乐',
  '宋沅羲+黄煜岚',
  '谭语晴+孙雯汐',
  '盘子宽+王鹏扬', // Fixed the character
  '廖思诚+卢钊浩',
  '徐嘉泽+叶怀逊'
];

const eventId = '68d9056cb59c12d4df95aa5a';

// Generate unique invite code
function generateInviteCode() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return `${timestamp}${random}`.toUpperCase();
}

async function findStudentByName(name) {
  try {
    const student = await Student.findOne({ name: name.trim() });
    if (!student) {
      console.warn(`⚠️  Student not found: ${name}`);
      return null;
    }
    return student;
  } catch (error) {
    console.error(`❌ Error finding student ${name}:`, error.message);
    return null;
  }
}

async function createRegistrations() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Verify event exists
    const event = await Event.findById(eventId);
    if (!event) {
      throw new Error(`Event with ID ${eventId} not found`);
    }
    console.log(`📅 Event found: ${event.name}`);

    const registrations = [];
    const allStudents = new Set(); // Track all unique students

    console.log('\n🔍 Processing team combinations...');
    
    for (let i = 0; i < teamCombinations.length; i++) {
      const combination = teamCombinations[i];
      console.log(`\n📝 Processing team ${i + 1}: ${combination}`);
      
      // Parse team members
      const memberNames = combination.split('+').map(name => name.trim());
      if (memberNames.length !== 2) {
        console.warn(`⚠️  Invalid team format: ${combination}`);
        continue;
      }

      // Find students
      const students = [];
      for (const name of memberNames) {
        const student = await findStudentByName(name);
        if (student) {
          students.push(student);
          allStudents.add(student._id.toString());
        }
      }

      if (students.length !== 2) {
        console.warn(`⚠️  Could not find all students for team: ${combination}`);
        continue;
      }

      const [captain, member] = students;
      const teamName = `${captain.name}+${member.name}`;
      const inviteCode = generateInviteCode();

      console.log(`   👥 Team: ${teamName}`);
      console.log(`   👑 Captain: ${captain.name} (${captain._id})`);
      console.log(`   👤 Member: ${member.name} (${member._id})`);
      console.log(`   🔑 Invite Code: ${inviteCode}`);

      // Create team member data for relay
      const teamMembers = [
        {
          _id: captain._id,
          runOrder: 1,
          captain: true
        },
        {
          _id: member._id,
          runOrder: 2,
          captain: false
        }
      ];

      // Create registrations for both team members
      for (const student of students) {
        const isCaptain = student._id.equals(captain._id);
        
        const registration = {
          eventId: new mongoose.Types.ObjectId(eventId),
          studentId: student._id,
          gameTypes: [
            // 短距离 - individual registration
            {
              name: '短距离',
              group: '专业组'
            },
            // 接力赛 - team registration
            {
              name: '接力赛',
              group: '专业组',
              team: {
                name: teamName,
                members: teamMembers
              },
              inviteCode: inviteCode
            }
          ],
          status: 'confirmed',
          registeredAt: new Date()
        };

        registrations.push(registration);
        console.log(`   ✅ Registration created for ${student.name}`);
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Teams processed: ${teamCombinations.length}`);
    console.log(`   Registrations to create: ${registrations.length}`);
    console.log(`   Unique students: ${allStudents.size}`);

    // Insert registrations
    if (registrations.length > 0) {
      console.log('\n💾 Inserting registrations...');
      
      // Check for existing registrations first
      const existingRegistrations = await EventRegistration.find({
        eventId: eventId,
        studentId: { $in: Array.from(allStudents).map(id => new mongoose.Types.ObjectId(id)) }
      });

      if (existingRegistrations.length > 0) {
        console.log(`⚠️  Found ${existingRegistrations.length} existing registrations. Please clean up first or modify the script to handle updates.`);
        
        // Show existing registrations
        for (const reg of existingRegistrations) {
          const student = await Student.findById(reg.studentId);
          console.log(`   - ${student?.name || 'Unknown'} (${reg.studentId})`);
        }
        
        console.log('\n❓ Do you want to continue anyway? This will create duplicate registrations.');
        console.log('   To clean up, run: db.eventregistrations.deleteMany({eventId: ObjectId("68d9056cb59c12d4df95aa5a")})');
      } else {
        const result = await EventRegistration.insertMany(registrations);
        console.log(`✅ Successfully inserted ${result.length} registrations`);
        
        // Show summary by game type
        const shortDistanceCount = result.length; // All students register for 短距离
        const relayCount = result.length; // All students also register for 接力赛
        const teamCount = teamCombinations.length;
        
        console.log(`\n📈 Registration Summary:`);
        console.log(`   短距离 registrations: ${shortDistanceCount}`);
        console.log(`   接力赛 registrations: ${relayCount}`);
        console.log(`   接力赛 teams: ${teamCount}`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the script
if (require.main === module) {
  createRegistrations();
}

module.exports = { createRegistrations };