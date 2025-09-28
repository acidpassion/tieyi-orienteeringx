const axios = require('axios');

async function testAPI() {
  try {
    console.log('\n=== Testing /api/registrations/my API ===\n');
    
    const response = await axios.get('http://localhost:5001/api/registrations/my?eventId=68d73196a30c3b880e1e09a2', {
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODkwYzRiNGUyZTYxYTZmNWUyZjFmYjEiLCJyb2xlIjoic3R1ZGVudCIsImlhdCI6MTc1ODYzNjcwMiwiZXhwIjoxNzY2NDEyNzAyfQ.WDDCTIG9V066AFWB_AGB0WdLq4cG7nrtasaYHfAC8x4'
      }
    });
    
    console.log('Status:', response.status);
    
    // Check if response has debug info
    if (response.data.debug) {
      console.log('\nDEBUG INFO:');
      console.log('Population executed:', response.data.debug.populationExecuted);
      console.log('Registrations count:', response.data.debug.registrationsCount);
      console.log('Game types processed:', response.data.debug.gameTypesProcessed);
      console.log('Members processed:', response.data.debug.membersProcessed);
    }
    
    const registrations = response.data.registrations || response.data;
    console.log('Registrations count:', registrations.length);
    
    if (registrations.length > 0) {
      const reg = registrations[0];
      console.log('\nFirst registration team members:');
      
      if (reg.gameTypes && reg.gameTypes.length > 0) {
        reg.gameTypes.forEach((gt, i) => {
          console.log(`\nGame Type ${i + 1}: ${gt.name}`);
          if (gt.team && gt.team.members) {
            gt.team.members.forEach((member, j) => {
              console.log(`  Member ${j + 1}:`);
              console.log(`    _id: ${member._id}`);
              console.log(`    name: ${member.name}`);
              console.log(`    runOrder: ${member.runOrder}`);
              console.log(`    captain: ${member.captain}`);
            });
          }
        });
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

testAPI();