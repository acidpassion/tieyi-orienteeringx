const mongoose = require('mongoose');
const EventRegistration = require('./models/EventRegistration');

// Test data with captain field
const testRegistrationData = {
  eventId: new mongoose.Types.ObjectId('68c58d4782eaf0375a9df722'),
  studentId: new mongoose.Types.ObjectId('6890c4b4e2e61a6f5e2f1fb1'),
  gameTypes: [
    {
      name: '短距离',
      group: '小黑马'
    },
    {
      name: '接力赛',
      group: '小黑马',
      team: {
        name: '接力赛队伍',
        members: [
          {
            _id: new mongoose.Types.ObjectId('6890c4b4e2e61a6f5e2f1fb1'),
            runOrder: 1,
            captain: true
          },
          {
            _id: new mongoose.Types.ObjectId('6890c4b4e2e61a6f5e2f1fa4'),
            runOrder: 2,
            captain: false
          },
          {
            _id: new mongoose.Types.ObjectId('6890c4b4e2e61a6f5e2f1fb3'),
            runOrder: 3,
            captain: false
          }
        ]
      }
    }
  ],
  status: 'pending',
  registrationDate: new Date(),
  notes: 'Direct database test for captain field'
};

async function testCaptainFieldDirectly() {
  try {
    console.log('🐛 Testing captain field directly in database...');
    
    // Connect to database
    await mongoose.connect('mongodb://localhost:27017/orienteeringx');
    console.log('✅ Connected to MongoDB');
    
    // Delete any existing test registration
    await EventRegistration.deleteMany({
      eventId: testRegistrationData.eventId,
      studentId: testRegistrationData.studentId
    });
    console.log('🧹 Cleaned up existing test data');
    
    console.log('\n📤 Original data to save:');
    console.log(JSON.stringify(testRegistrationData, null, 2));
    
    // Debug validation before creating registration
    console.log('\n🔍 Validating data before save:');
    const relayGameType = testRegistrationData.gameTypes.find(gt => gt.name === '接力赛');
    if (relayGameType && relayGameType.team && relayGameType.team.members) {
      console.log('Relay game type found:', relayGameType.name);
      console.log('Team members count:', relayGameType.team.members.length);
      
      let captainCount = 0;
      relayGameType.team.members.forEach((member, index) => {
        console.log(`Member ${index + 1}:`);
        console.log(`  - _id: ${member._id} (exists: ${!!member._id})`);
        console.log(`  - runOrder: ${member.runOrder} (exists: ${member.runOrder !== undefined})`);
        console.log(`  - captain: ${member.captain} (type: ${typeof member.captain})`);
        if (member.captain === true) captainCount++;
      });
      
      console.log(`Captain count: ${captainCount}`);
      console.log(`Validation should pass: ${captainCount === 1}`);
    }
    
    // Create new registration
    const registration = new EventRegistration(testRegistrationData);
    
    console.log('\n🔍 Before save - registration object:');
    console.log(JSON.stringify(registration.toObject(), null, 2));
    
    // Save to database
    const savedRegistration = await registration.save();
    console.log('\n✅ Registration saved successfully');
    
    console.log('\n📊 Saved registration data:');
    console.log(JSON.stringify(savedRegistration.toObject(), null, 2));
    
    // Retrieve from database to verify
    const retrievedRegistration = await EventRegistration.findById(savedRegistration._id).lean();
    console.log('\n🔍 Retrieved from database:');
    console.log(JSON.stringify(retrievedRegistration, null, 2));
    
    // Check captain fields specifically
    const retrievedRelayGameType = retrievedRegistration.gameTypes.find(gt => gt.name === '接力赛');
    if (retrievedRelayGameType && retrievedRelayGameType.team && retrievedRelayGameType.team.members) {
      console.log('\n🎯 Captain field analysis:');
      retrievedRelayGameType.team.members.forEach((member, index) => {
        console.log(`Member ${index + 1}:`);
        console.log(`  - _id: ${member._id}`);
        console.log(`  - runOrder: ${member.runOrder}`);
        console.log(`  - captain: ${member.captain} (type: ${typeof member.captain})`);
        console.log(`  - captain exists: ${member.hasOwnProperty('captain')}`);
      });
      
      // Verify captain fields are preserved
      const captainCount = retrievedRelayGameType.team.members.filter(m => m.captain === true).length;
      const nonCaptainCount = retrievedRelayGameType.team.members.filter(m => m.captain === false).length;
      
      console.log(`\n📈 Captain field summary:`);
      console.log(`  - Total members: ${retrievedRelayGameType.team.members.length}`);
      console.log(`  - Captains (true): ${captainCount}`);
      console.log(`  - Non-captains (false): ${nonCaptainCount}`);
      console.log(`  - Missing captain field: ${retrievedRelayGameType.team.members.length - captainCount - nonCaptainCount}`);
      
      if (captainCount === 1 && nonCaptainCount === 2) {
        console.log('\n🎉 SUCCESS: Captain fields are correctly preserved!');
      } else {
        console.log('\n💥 ISSUE: Captain fields are not correctly preserved!');
      }
    } else {
      console.log('\n❌ No relay game type found or team structure missing');
    }
    
  } catch (error) {
    console.error('\n💥 Test failed:', error);
    console.error('Error details:', error.message);
    if (error.errors) {
      console.error('Validation errors:', error.errors);
    }
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the test
testCaptainFieldDirectly();