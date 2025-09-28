const mongoose = require('mongoose');
const EventRegistration = require('./models/EventRegistration');

// Simple test data with just relay race
const simpleTestData = {
  eventId: new mongoose.Types.ObjectId('68c58d4782eaf0375a9df722'),
  studentId: new mongoose.Types.ObjectId('6890c4b4e2e61a6f5e2f1fb1'),
  gameTypes: [
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
          }
        ]
      }
    }
  ],
  status: 'pending'
};

async function testValidationOnly() {
  try {
    console.log('🔍 Testing validation logic only...');
    
    // Connect to database
    await mongoose.connect('mongodb://localhost:27017/orienteeringx');
    console.log('✅ Connected to MongoDB');
    
    console.log('\n📤 Test data:');
    console.log(JSON.stringify(simpleTestData, null, 2));
    
    // Test the validation function manually
    const gameTypes = simpleTestData.gameTypes;
    console.log('\n🧪 Manual validation test:');
    
    for (const gameType of gameTypes) {
      console.log(`\nTesting game type: ${gameType.name}`);
      
      if (gameType.team && gameType.team.members) {
        console.log(`Team members count: ${gameType.team.members.length}`);
        
        let captainCount = 0;
        let validationPassed = true;
        
        for (const member of gameType.team.members) {
          console.log(`Member validation:`);
          console.log(`  - _id: ${member._id} (exists: ${!!member._id})`);
          console.log(`  - runOrder: ${member.runOrder} (exists: ${member.runOrder !== undefined})`);
          console.log(`  - captain: ${member.captain}`);
          
          if (gameType.name === '接力赛') {
            // 接力赛需要 _id 和 runOrder
            if (!member._id || member.runOrder === undefined) {
              console.log(`  ❌ Validation failed: missing _id or runOrder for relay race`);
              validationPassed = false;
            } else {
              console.log(`  ✅ Relay race member validation passed`);
            }
          } else if (gameType.name === '团队赛') {
            // 团队赛只需要 _id，不需要 runOrder
            if (!member._id || member.runOrder !== undefined) {
              console.log(`  ❌ Validation failed: missing _id or has runOrder for team race`);
              validationPassed = false;
            } else {
              console.log(`  ✅ Team race member validation passed`);
            }
          }
          
          // 统计队长数量
          if (member.captain === true) {
            captainCount++;
          }
        }
        
        console.log(`\nCaptain count: ${captainCount}`);
        
        // 确保每个团队只有一个队长
        if (captainCount !== 1) {
          console.log(`❌ Captain count validation failed: expected 1, got ${captainCount}`);
          validationPassed = false;
        } else {
          console.log(`✅ Captain count validation passed`);
        }
        
        console.log(`Overall validation for ${gameType.name}: ${validationPassed ? '✅ PASSED' : '❌ FAILED'}`);
      }
    }
    
    // Now try to create the document
    console.log('\n🏗️ Creating EventRegistration document...');
    const registration = new EventRegistration(simpleTestData);
    
    console.log('\n💾 Attempting to save...');
    const savedRegistration = await registration.save();
    
    console.log('\n🎉 SUCCESS: Document saved successfully!');
    console.log('Saved registration ID:', savedRegistration._id);
    
    // Check the saved data
    const relayGame = savedRegistration.gameTypes.find(gt => gt.name === '接力赛');
    if (relayGame && relayGame.team && relayGame.team.members) {
      console.log('\n🎯 Captain fields in saved document:');
      relayGame.team.members.forEach((member, index) => {
        console.log(`Member ${index + 1}: captain = ${member.captain}`);
      });
    }
    
  } catch (error) {
    console.error('\n💥 Test failed:', error.message);
    if (error.errors) {
      console.error('Validation errors:', Object.keys(error.errors));
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
testValidationOnly();