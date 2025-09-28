const axios = require('axios');

// Test script to verify captain field is preserved
async function testCaptainField() {
  try {
    console.log('🔐 Logging in to get token...');
    
    // Use existing token from debug file
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODkwYzRiNGUyZTYxYTZmNWUyZjFmYjEiLCJyb2xlIjoic3R1ZGVudCIsImlhdCI6MTc1ODYzNjcwMiwiZXhwIjoxNzY2NDEyNzAyfQ.WDDCTIG9V066AFWB_AGB0WdLq4cG7nrtasaYHfAC8x4';
    console.log('✅ Using existing token');
    
    console.log('🏃 Creating test event...');
    
    // Create a test event first
    const eventData = {
      eventName: '测试接力赛事件-Captain字段测试',
      organization: '小马越野',
      startDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Day after tomorrow
      registrationDeadline: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours from now
      location: '测试地点',
      description: '测试Captain字段保存的接力赛事件',
      gameTypes: [
        {
          name: '接力赛',
          groups: ['小黑马', '大黑马'],
          teamSize: { min: 2, max: 4 },
          requiresRunOrder: true
        }
      ]
    };
    
    const eventResponse = await axios.post('http://localhost:5001/api/events', eventData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const eventId = eventResponse.data._id;
    console.log('✅ Test event created with ID:', eventId);
    
    console.log('📝 Testing registration with captain field...');
    
    // Test registration with captain field using the newly created event
    const registrationData = {
      eventId: eventId,  // Use the newly created event ID
      gameTypes: [{
        name: '接力赛',
        group: '小黑马',
        team: {
          name: '测试队伍',
          members: [{
            _id: '6890c4b4e2e61a6f5e2f1fb1',
            runOrder: 1,
            captain: true
          }, {
            _id: '6890c4b4e2e61a6f5e2f1fa4',
            runOrder: 2,
            captain: false
          }]
        }
      }]
    };
    
    const registrationResponse = await axios.post('http://localhost:5001/api/registrations', registrationData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📊 Registration Response:');
    console.log(JSON.stringify(registrationResponse.data, null, 2));
    
    // Check if captain field is preserved
    const relayGame = registrationResponse.data.gameTypes.find(gt => gt.name === '接力赛');
    if (relayGame && relayGame.team && relayGame.team.members) {
      console.log('\n🔍 Checking captain field in response:');
      relayGame.team.members.forEach((member, index) => {
        console.log(`Member ${index + 1}:`, {
          _id: member._id,
          runOrder: member.runOrder,
          captain: member.captain
        });
        
        if (member.captain !== undefined) {
          console.log(`✅ Captain field preserved for member ${index + 1}`);
        } else {
          console.log(`❌ Captain field missing for member ${index + 1}`);
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testCaptainField();