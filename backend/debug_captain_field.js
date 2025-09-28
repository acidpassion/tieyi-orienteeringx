const axios = require('axios');
const mongoose = require('mongoose');
const EventRegistration = require('./models/EventRegistration');

// Configuration
const API_BASE_URL = 'http://localhost:5000';
const EVENT_ID = '68c58d4782eaf0375a9df722';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODkwYzRiNGUyZTYxYTZmNWUyZjFmYjEiLCJyb2xlIjoic3R1ZGVudCIsImlhdCI6MTc1ODk1ODAyMSwiZXhwIjoxNzY2NzM0MDIxfQ.0DoJ2Gc4ZSFe-RCjTDMAJz4xaWiOVKrdcEOjHSmyTGw';

// Test payload with captain field
const testPayload = {
  eventId: EVENT_ID,
  gameTypes: [
    {
      name: "短距离",
      group: "小黑马"
    },
    {
      name: "接力赛",
      group: "小黑马",
      team: {
        name: "接力赛队伍",
        members: [
          {
            _id: "6890c4b4e2e61a6f5e2f1fb1",
            runOrder: 1,
            captain: true
          },
          {
            _id: "6890c4b4e2e61a6f5e2f1fa4",
            runOrder: 2,
            captain: false
          },
          {
            _id: "6890c4b4e2e61a6f5e2f1fb3",
            runOrder: 3,
            captain: false
          }
        ]
      }
    }
  ]
};

async function connectToDatabase() {
  try {
    await mongoose.connect('mongodb://localhost:27017/orienteeringx');
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    throw error;
  }
}

async function makeRegistrationRequest() {
  try {
    console.log('\n🚀 Making registration request...');
    console.log('📤 Request payload:');
    console.log(JSON.stringify(testPayload, null, 2));
    
    const response = await axios.post(`${API_BASE_URL}/api/registrations`, testPayload, {
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    console.log('\n✅ Registration request successful');
    console.log('📥 API Response:');
    console.log(JSON.stringify(response.data, null, 2));
    
    return response.data;
  } catch (error) {
    console.error('❌ Registration request failed:');
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
      console.error('Response headers:', error.response.headers);
    } else if (error.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Error message:', error.message);
    }
    console.error('Full error:', error);
    throw error;
  }
}

async function checkDatabaseData(userId) {
  try {
    console.log('\n🔍 Checking database data...');
    
    // Find the registration in database
    const registration = await EventRegistration.findOne({
      eventId: EVENT_ID,
      userId: userId
    }).lean();
    
    if (!registration) {
      console.log('❌ No registration found in database');
      return null;
    }
    
    console.log('✅ Found registration in database');
    console.log('📊 Database data:');
    console.log(JSON.stringify(registration, null, 2));
    
    // Check specifically for captain field in relay game type
    const relayGameType = registration.gameTypes.find(gt => gt.name === '接力赛');
    if (relayGameType && relayGameType.team && relayGameType.team.members) {
      console.log('\n🎯 Relay team members in database:');
      relayGameType.team.members.forEach((member, index) => {
        console.log(`Member ${index + 1}:`);
        console.log(`  - _id: ${member._id}`);
        console.log(`  - runOrder: ${member.runOrder}`);
        console.log(`  - captain: ${member.captain} (type: ${typeof member.captain})`);
      });
    }
    
    return registration;
  } catch (error) {
    console.error('❌ Database check failed:', error);
    throw error;
  }
}

async function compareData(apiResponse, dbData) {
  console.log('\n🔍 Comparing request payload vs database data...');
  
  // Extract captain data from original payload
  const originalRelayTeam = testPayload.gameTypes.find(gt => gt.name === '接力赛');
  const originalMembers = originalRelayTeam?.team?.members || [];
  
  // Extract captain data from database
  const dbRelayTeam = dbData?.gameTypes?.find(gt => gt.name === '接力赛');
  const dbMembers = dbRelayTeam?.team?.members || [];
  
  console.log('\n📤 Original payload captain fields:');
  originalMembers.forEach((member, index) => {
    console.log(`Member ${index + 1}: captain = ${member.captain} (${typeof member.captain})`);
  });
  
  console.log('\n📊 Database captain fields:');
  dbMembers.forEach((member, index) => {
    console.log(`Member ${index + 1}: captain = ${member.captain} (${typeof member.captain})`);
  });
  
  // Check if captain fields match
  let captainFieldsMatch = true;
  for (let i = 0; i < originalMembers.length; i++) {
    if (originalMembers[i]?.captain !== dbMembers[i]?.captain) {
      captainFieldsMatch = false;
      console.log(`❌ Captain field mismatch for member ${i + 1}:`);
      console.log(`   Original: ${originalMembers[i]?.captain}`);
      console.log(`   Database: ${dbMembers[i]?.captain}`);
    }
  }
  
  if (captainFieldsMatch) {
    console.log('✅ Captain fields match between payload and database');
  } else {
    console.log('❌ Captain fields DO NOT match - this is the bug!');
  }
  
  return captainFieldsMatch;
}

async function debugCaptainField() {
  try {
    console.log('🐛 Starting captain field debug test...');
    console.log(`📋 Event ID: ${EVENT_ID}`);
    console.log(`🔑 Using token for user: 6890c4b4e2e61a6f5e2f1fb1`);
    
    // Connect to database
    await connectToDatabase();
    
    // Make the registration request
    const apiResponse = await makeRegistrationRequest();
    
    // Check database data
    const dbData = await checkDatabaseData('6890c4b4e2e61a6f5e2f1fb1');
    
    if (dbData) {
      // Compare the data
      const fieldsMatch = await compareData(apiResponse, dbData);
      
      if (fieldsMatch) {
        console.log('\n🎉 SUCCESS: Captain fields are correctly saved!');
      } else {
        console.log('\n💥 ISSUE CONFIRMED: Captain fields are lost during save!');
      }
    }
    
  } catch (error) {
    console.error('\n💥 Debug test failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the debug test
debugCaptainField();