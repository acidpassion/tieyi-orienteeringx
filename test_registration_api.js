const axios = require('axios');

// Test the registration API directly
async function testRegistrationAPI() {
  try {
    console.log('Testing registration API...');
    
    // Test the /api/registrations/my endpoint
    const response = await axios.get('http://localhost:5001/api/registrations/my', {
      headers: {
        'Authorization': 'Bearer test-token', // Mock token for testing
        'Content-Type': 'application/json'
      },
      // Mock user context
      params: {
        studentId: '68cc2fd0532158c4fe442576'
      }
    });
    
    console.log('API Response:', response.data);
    
    // Find registration for specific event
    const eventId = '68c58d4782eaf0375a9df722';
    const registration = response.data.find(reg => reg.eventId === eventId);
    
    if (registration) {
      console.log('Found registration for event:', eventId);
      console.log('Game types:', registration.gameTypes);
      
      // Check relay team members
      const relayGame = registration.gameTypes.find(gt => gt.type === '接力赛');
      if (relayGame && relayGame.team && relayGame.team.members) {
        console.log('Relay team members:', relayGame.team.members);
      }
    } else {
      console.log('No registration found for event:', eventId);
    }
    
  } catch (error) {
    console.error('API Error:', error.response?.data || error.message);
  }
}

testRegistrationAPI();