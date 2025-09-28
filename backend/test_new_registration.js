const mongoose = require('mongoose');
const EventRegistration = require('./models/EventRegistration');
const Student = require('./models/Student');
const Event = require('./models/Event');
require('dotenv').config();

async function testNewRegistration() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find some students and an event for testing
    const students = await Student.find().limit(3);
    const event = await Event.findOne();
    
    if (!event || students.length < 3) {
      console.log('❌ Need at least 1 event and 3 students for testing');
      return;
    }

    console.log(`\n🎯 Testing with event: ${event.eventName}`);
    console.log(`👥 Using students: ${students.map(s => s.name || s.username).join(', ')}\n`);

    // Test 1: Create a relay team registration with proper captain field
    console.log('🧪 Test 1: Creating relay team registration...');
    
    const relayGameType = {
      name: '接力赛',
      group: '小黑马',
      team: {
        name: '测试接力队',
        members: students.map((student, index) => ({
          _id: student._id,
          captain: index === 0, // First member is captain
          runOrder: index + 1
        }))
      },
      inviteCode: 'TEST001'
    };

    // Generate invite codes
    const gameTypesWithCodes = await EventRegistration.generateInviteCodesForRelayGames([relayGameType]);
    
    const testRegistration = new EventRegistration({
      eventId: event._id,
      studentId: students[0]._id, // First student is the registrant
      gameTypes: gameTypesWithCodes,
      status: 'confirmed'
    });

    try {
      await testRegistration.save();
      console.log('✅ Test registration created successfully');
      
      // Verify the captain field
      const savedReg = await EventRegistration.findById(testRegistration._id);
      const relayTeam = savedReg.gameTypes.find(gt => gt.name === '接力赛');
      
      if (relayTeam && relayTeam.team && relayTeam.team.members) {
        console.log('\n📋 Team Members:');
        relayTeam.team.members.forEach((member, index) => {
          console.log(`  ${index + 1}. ID: ${member._id}`);
          console.log(`     Captain: ${member.captain === true ? '👑 YES' : '❌ NO'}`);
          console.log(`     Run Order: ${member.runOrder}`);
        });
        
        const captainCount = relayTeam.team.members.filter(m => m.captain === true).length;
        console.log(`\n✅ Captain validation: ${captainCount === 1 ? 'PASSED' : 'FAILED'} (${captainCount} captain(s))`);
      }
      
    } catch (validationError) {
      console.log('❌ Validation failed:', validationError.message);
    }

    // Test 2: Try to create invalid registration (no captain)
    console.log('\n🧪 Test 2: Testing validation with no captain...');
    
    const invalidGameType = {
      name: '接力赛',
      group: '小黑马',
      team: {
        name: '无效接力队',
        members: students.map((student, index) => ({
          _id: student._id,
          captain: false, // No captain - should fail validation
          runOrder: index + 1
        }))
      }
    };

    const invalidRegistration = new EventRegistration({
      eventId: event._id,
      studentId: students[0]._id,
      gameTypes: [invalidGameType],
      status: 'confirmed'
    });

    try {
      await invalidRegistration.save();
      console.log('❌ Invalid registration was saved (this should not happen)');
    } catch (validationError) {
      console.log('✅ Validation correctly rejected invalid registration:', validationError.message);
    }

    // Test 3: Try to create invalid registration (multiple captains)
    console.log('\n🧪 Test 3: Testing validation with multiple captains...');
    
    const multiCaptainGameType = {
      name: '接力赛',
      group: '小黑马',
      team: {
        name: '多队长接力队',
        members: students.map((student, index) => ({
          _id: student._id,
          captain: true, // All captains - should fail validation
          runOrder: index + 1
        }))
      }
    };

    const multiCaptainRegistration = new EventRegistration({
      eventId: event._id,
      studentId: students[0]._id,
      gameTypes: [multiCaptainGameType],
      status: 'confirmed'
    });

    try {
      await multiCaptainRegistration.save();
      console.log('❌ Multi-captain registration was saved (this should not happen)');
    } catch (validationError) {
      console.log('✅ Validation correctly rejected multi-captain registration:', validationError.message);
    }

    console.log('\n🎉 All tests completed!');

  } catch (error) {
    console.error('❌ Test Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the test
testNewRegistration();