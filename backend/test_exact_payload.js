const mongoose = require('mongoose');
const EventRegistration = require('./models/EventRegistration');

// Exact payload from user
const exactUserPayload = {
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
  status: 'pending'
};

async function testExactPayload() {
  try {
    console.log('🎯 Testing exact user payload...');
    
    // Connect to database
    await mongoose.connect('mongodb://localhost:27017/orienteeringx');
    console.log('✅ Connected to MongoDB');
    
    // Clean up existing data
    await EventRegistration.deleteMany({
      eventId: exactUserPayload.eventId,
      studentId: exactUserPayload.studentId
    });
    console.log('🧹 Cleaned up existing test data');
    
    console.log('\n📤 Exact user payload:');
    console.log(JSON.stringify(exactUserPayload, null, 2));
    
    // Test validation manually
    console.log('\n🧪 Manual validation for mixed game types:');
    
    for (const gameType of exactUserPayload.gameTypes) {
      console.log(`\nValidating game type: ${gameType.name}`);
      
      if (gameType.team && gameType.team.members) {
        console.log(`  Has team with ${gameType.team.members.length} members`);
        
        let captainCount = 0;
        for (const member of gameType.team.members) {
          if (gameType.name === '接力赛') {
            if (!member._id || member.runOrder === undefined) {
              console.log(`  ❌ Invalid relay member: missing _id or runOrder`);
              return;
            }
          } else if (gameType.name === '团队赛') {
            if (!member._id || member.runOrder !== undefined) {
              console.log(`  ❌ Invalid team member: missing _id or has runOrder`);
              return;
            }
          }
          
          if (member.captain === true) {
            captainCount++;
          }
        }
        
        if (captainCount !== 1) {
          console.log(`  ❌ Invalid captain count: ${captainCount}`);
          return;
        }
        
        console.log(`  ✅ Team validation passed (${captainCount} captain)`);
      } else {
        console.log(`  ✅ Individual game type (no team validation needed)`);
      }
    }
    
    console.log('\n🏗️ Creating EventRegistration document...');
    const registration = new EventRegistration(exactUserPayload);
    
    console.log('\n💾 Attempting to save...');
    const savedRegistration = await registration.save();
    
    console.log('\n🎉 SUCCESS: Document saved successfully!');
    console.log('Saved registration ID:', savedRegistration._id);
    
    // Verify captain fields are preserved
    const relayGame = savedRegistration.gameTypes.find(gt => gt.name === '接力赛');
    if (relayGame && relayGame.team && relayGame.team.members) {
      console.log('\n🎯 Captain fields in saved document:');
      relayGame.team.members.forEach((member, index) => {
        console.log(`Member ${index + 1}:`);
        console.log(`  - _id: ${member._id}`);
        console.log(`  - runOrder: ${member.runOrder}`);
        console.log(`  - captain: ${member.captain}`);
      });
      
      const captainCount = relayGame.team.members.filter(m => m.captain === true).length;
      const nonCaptainCount = relayGame.team.members.filter(m => m.captain === false).length;
      
      console.log(`\n📊 Final verification:`);
      console.log(`  - Total members: ${relayGame.team.members.length}`);
      console.log(`  - Captains: ${captainCount}`);
      console.log(`  - Non-captains: ${nonCaptainCount}`);
      
      if (captainCount === 1 && nonCaptainCount === 2) {
        console.log('\n🎉 PERFECT: Captain fields are correctly preserved!');
      } else {
        console.log('\n💥 ISSUE: Captain fields are not correctly preserved!');
      }
    }
    
    // Test retrieval
    console.log('\n🔍 Testing retrieval from database...');
    const retrieved = await EventRegistration.findById(savedRegistration._id).lean();
    const retrievedRelay = retrieved.gameTypes.find(gt => gt.name === '接力赛');
    
    if (retrievedRelay && retrievedRelay.team && retrievedRelay.team.members) {
      console.log('\n📋 Retrieved captain fields:');
      retrievedRelay.team.members.forEach((member, index) => {
        console.log(`Member ${index + 1}: captain = ${member.captain} (${typeof member.captain})`);
      });
    }
    
  } catch (error) {
    console.error('\n💥 Test failed:', error.message);
    if (error.errors) {
      console.error('Validation errors:');
      for (const [key, err] of Object.entries(error.errors)) {
        console.error(`  ${key}: ${err.message}`);
      }
    }
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the test
testExactPayload();