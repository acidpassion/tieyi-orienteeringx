const mongoose = require('mongoose');
const EventRegistration = require('../models/EventRegistration');
const Student = require('../models/Student');
require('dotenv').config();

async function testTeamSync() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🔗 Connected to MongoDB');

    const eventId = '68d9056cb59c12d4df95aa5a';
    const studentId1 = '6890c4b4e2e61a6f5e2f1fb1'; // Student who will leave
    const studentId2 = '6890c4b4e2e61a6f5e2f1fc0'; // Remaining team member

    console.log('\n📋 Before team sync test:');
    
    // Find both registrations
    const reg1 = await EventRegistration.findOne({ 
      eventId, 
      studentId: studentId1 
    }).populate('studentId', 'name');
    
    const reg2 = await EventRegistration.findOne({ 
      eventId, 
      studentId: studentId2 
    }).populate('studentId', 'name');

    if (!reg1 || !reg2) {
      console.log('❌ Could not find both registrations');
      return;
    }

    console.log(`👤 Student 1: ${reg1.studentId.name} (${studentId1})`);
    console.log(`👤 Student 2: ${reg2.studentId.name} (${studentId2})`);

    // Find relay games for both students
    const relayGame1 = reg1.gameTypes.find(gt => gt.name === '接力赛' && gt.inviteCode);
    const relayGame2 = reg2.gameTypes.find(gt => gt.name === '接力赛' && gt.inviteCode);

    if (relayGame1 && relayGame2 && relayGame1.inviteCode === relayGame2.inviteCode) {
      console.log(`🔗 Found shared relay team: ${relayGame1.team?.name}`);
      console.log(`📧 Invite code: ${relayGame1.inviteCode}`);
      console.log(`👥 Team members in reg1: ${relayGame1.team?.members?.length || 0}`);
      console.log(`👥 Team members in reg2: ${relayGame2.team?.members?.length || 0}`);
      
      // Show team member details
      if (relayGame1.team?.members) {
        console.log('📝 Team members in student 1 registration:');
        relayGame1.team.members.forEach((member, index) => {
          console.log(`  ${index + 1}. ${member._id} (runOrder: ${member.runOrder}, captain: ${member.captain})`);
        });
      }
      
      if (relayGame2.team?.members) {
        console.log('📝 Team members in student 2 registration:');
        relayGame2.team.members.forEach((member, index) => {
          console.log(`  ${index + 1}. ${member._id} (runOrder: ${member.runOrder}, captain: ${member.captain})`);
        });
      }
    } else {
      console.log('❌ No shared relay team found or different invite codes');
      if (relayGame1) console.log(`Student 1 invite code: ${relayGame1.inviteCode}`);
      if (relayGame2) console.log(`Student 2 invite code: ${relayGame2.inviteCode}`);
    }

    console.log('\n✅ Team sync test data retrieved successfully');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

testTeamSync();