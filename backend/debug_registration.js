const axios = require('axios');

const testValidation = async () => {
  const EventRegistration = require('./models/EventRegistration');
  
  // 测试1: 正确的团队赛数据（不应该有runOrder）
  const correctTeamData = {
    eventId: '68c58d4782eaf0375a9df722',
    studentId: '6890c4b4e2e61a6f5e2f1fb1',
    gameTypes: [
      {
        name: '团队赛',
        group: '高中组',
        team: {
          name: '团队赛队伍',
          members: [
            { _id: '6890c4b4e2e61a6f5e2f1fb1' },
            { _id: '6890c4b4e2e61a6f5e2f1fb2' }
          ]
        }
      }
    ]
  };
  
  // 测试2: 错误的团队赛数据（不应该有runOrder）
  const incorrectTeamData = {
    eventId: '68c58d4782eaf0375a9df722',
    studentId: '6890c4b4e2e61a6f5e2f1fb1',
    gameTypes: [
      {
        name: '团队赛',
        group: '高中组',
        team: {
          name: '团队赛队伍',
          members: [
            { _id: '6890c4b4e2e61a6f5e2f1fb1', runOrder: 1 },
            { _id: '6890c4b4e2e61a6f5e2f1fb2', runOrder: 2 }
          ]
        }
      }
    ]
  };
  
  // 测试3: 正确的接力赛数据（必须有runOrder）
  const correctRelayData = {
    eventId: '68c58d4782eaf0375a9df722',
    studentId: '6890c4b4e2e61a6f5e2f1fb1',
    gameTypes: [
      {
        name: '接力赛',
        group: '高中组',
        team: {
          name: '接力赛队伍',
          members: [
            { _id: '6890c4b4e2e61a6f5e2f1fb1', runOrder: 1 },
            { _id: '6890c4b4e2e61a6f5e2f1fb2', runOrder: 2 }
          ]
        }
      }
    ]
  };
  
  console.log('🧪 Testing schema validation...');
  
  // 测试正确的团队赛数据
  console.log('\n1. Testing correct team race data (no runOrder):');
  const correctTeam = new EventRegistration(correctTeamData);
  try {
    await correctTeam.validate();
    console.log('✅ Validation passed');
  } catch (err) {
    console.log('❌ Validation failed:', err.message);
  }
  
  // 测试错误的团队赛数据
  console.log('\n2. Testing incorrect team race data (with runOrder):');
  const incorrectTeam = new EventRegistration(incorrectTeamData);
  try {
    await incorrectTeam.validate();
    console.log('❌ Validation should have failed but passed');
  } catch (err) {
    console.log('✅ Validation correctly failed:', err.message);
  }
  
  // 测试正确的接力赛数据
  console.log('\n3. Testing correct relay race data (with runOrder):');
  const correctRelay = new EventRegistration(correctRelayData);
  try {
    await correctRelay.validate();
    console.log('✅ Validation passed');
  } catch (err) {
    console.log('❌ Validation failed:', err.message);
  }
};

const testRegistration = async () => {
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODkwYzRiNGUyZTYxYTZmNWUyZjFmYjEiLCJyb2xlIjoic3R1ZGVudCIsImlhdCI6MTc1ODYzNjcwMiwiZXhwIjoxNzY2NDEyNzAyfQ.WDDCTIG9V066AFWB_AGB0WdLq4cG7nrtasaYHfAC8x4';
  
  const payload = {
    eventId: '68c58d4782eaf0375a9df722',
    gameTypes: [
      {
        name: '短距离',
        group: '高中组'
      },
      {
        name: '接力赛',
        group: '高中组',
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
        group: '高中组',
        team: {
          name: '团队赛队伍',
          members: [
            { $oid: '6890c4b4e2e61a6f5e2f1fb1' },
            { $oid: '6890c4b4e2e61a6f5e2f1fb2' }
          ]
        }
      }
    ],
    notes: '测试报名 - 修复ObjectId转换问题'
  };
  
  console.log('🚀 Testing registration with payload:', JSON.stringify(payload, null, 2));

  try {
    const response = await axios.post('http://localhost:5001/api/registrations', payload, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Success! Response:', response.data);
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    console.error('Status:', error.response?.status);
  }
};

// 首先测试schema验证
(async () => {
  await testValidation();
  console.log('\n' + '='.repeat(50));
  console.log('🚀 Now testing API with user payload...');
  await testRegistration();
})();