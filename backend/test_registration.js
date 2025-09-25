const axios = require('axios');

// Test the registration API with proper payload format
async function testRegistrationAPI() {
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODkwYzRiNGUyZTYxYTZmNWUyZjFmYjEiLCJyb2xlIjoic3R1ZGVudCIsImlhdCI6MTc1ODYzNjcwMiwiZXhwIjoxNzY2NDEyNzAyfQ.WDDCTIG9V066AFWB_AGB0WdLq4cG7nrtasaYHfAC8x4';
  const eventId = '68c58d4782eaf0375a9df722';
  
  const payload = {
    eventId,
    gameTypes: [
      {
        name: '短距离',
        group: '男子组'
      },
      {
        name: '接力赛',
        group: '混合组',
        team: {
          name: '测试队伍',
          members: [
            { $oid: '6890c4b4e2e61a6f5e2f1fb1', runOrder: 1 },
            { $oid: '6890c4b4e2e61a6f5e2f1fb2', runOrder: 2 }
          ]
        }
      },
      {
        name: '团队赛',
        group: '女子组',
        members: [
          { $oid: '6890c4b4e2e61a6f5e2f1fb1' },
          { $oid: '6890c4b4e2e61a6f5e2f1fb2' }
        ]
      }
    ]
  };
  
  console.log('🚀 Testing registration API...');
  console.log('📤 Payload:', JSON.stringify(payload, null, 2));
  
  try {
    const response = await axios.post('http://localhost:5001/api/registrations', payload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Success! Status:', response.status);
    console.log('📥 Response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log('❌ Error! Status:', error.response?.status);
    console.log('📥 Error Response:', JSON.stringify(error.response?.data, null, 2));
    console.log('🔍 Error Details:', error.message);
  }
}

testRegistrationAPI();
