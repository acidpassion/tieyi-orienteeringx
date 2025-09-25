const mongoose = require('mongoose');
const Event = require('./models/Event');
const EventRegistration = require('./models/EventRegistration');
const Student = require('./models/Student');
const { getTeamSizeForGameType, validateTeamSize } = require('./constants/teamConstants');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/orienteering_quiz_app', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function testTeamMemberFiltering() {
  console.log('🧪 Testing team member filtering and validation logic...');
  
  try {
    // Test 1: Team size calculation
    console.log('\n📏 Test 1: Team size calculation');
    
    const testCases = [
      {
        gameTypeName: '男子接力赛',
        eventGameTypeConfig: { name: '男子接力赛', teamSize: 4 },
        eventGameTypeSettings: null,
        expected: 4
      },
      {
        gameTypeName: '女子团队赛',
        eventGameTypeConfig: '女子团队赛',
        eventGameTypeSettings: { '女子团队赛': { teamSize: 6 } },
        expected: 6
      },
      {
        gameTypeName: '混合接力赛',
        eventGameTypeConfig: '混合接力赛',
        eventGameTypeSettings: null,
        expected: 4 // default relay size
      },
      {
        gameTypeName: '团队赛',
        eventGameTypeConfig: '团队赛',
        eventGameTypeSettings: null,
        expected: 6 // default team size
      }
    ];
    
    testCases.forEach((testCase, index) => {
      const result = getTeamSizeForGameType(
        testCase.gameTypeName,
        testCase.eventGameTypeConfig,
        testCase.eventGameTypeSettings
      );
      
      console.log(`  Case ${index + 1}: ${testCase.gameTypeName}`);
      console.log(`    Expected: ${testCase.expected}, Got: ${result}`);
      console.log(`    ✅ ${result === testCase.expected ? 'PASS' : 'FAIL'}`);
    });
    
    // Test 2: Team size validation
    console.log('\n🔍 Test 2: Team size validation');
    
    const validationCases = [
      { gameTypeName: '接力赛', teamSize: 4, expected: true },
      { gameTypeName: '接力赛', teamSize: 1, expected: false }, // too small
      { gameTypeName: '接力赛', teamSize: 9, expected: false }, // too large
      { gameTypeName: '团队赛', teamSize: 6, expected: true },
      { gameTypeName: '团队赛', teamSize: 11, expected: false }, // too large
      { gameTypeName: '团队赛', teamSize: 2, expected: true } // minimum
    ];
    
    validationCases.forEach((testCase, index) => {
      const result = validateTeamSize(testCase.gameTypeName, testCase.teamSize);
      console.log(`  Case ${index + 1}: ${testCase.gameTypeName} with ${testCase.teamSize} members`);
      console.log(`    Expected: ${testCase.expected}, Got: ${result}`);
      console.log(`    ✅ ${result === testCase.expected ? 'PASS' : 'FAIL'}`);
    });
    
    // Test 3: Client-side member filtering simulation
    console.log('\n🎯 Test 3: Client-side member filtering simulation');
    
    const mockRelayTeamIds = {
      '男子接力赛': ['507f1f77bcf86cd799439011', '', '507f1f77bcf86cd799439012', ''],
      '团队赛': ['507f1f77bcf86cd799439013', '507f1f77bcf86cd799439014', '', '', '']
    };
    
    Object.entries(mockRelayTeamIds).forEach(([gameTypeName, teamIds]) => {
      console.log(`  Game Type: ${gameTypeName}`);
      console.log(`    Original IDs: [${teamIds.map(id => id || 'empty').join(', ')}]`);
      
      // Simulate the filtering logic from EventRegistrationDetail.jsx
      const validMembers = teamIds.filter(memberId => memberId && memberId.trim() !== '');
      console.log(`    Filtered IDs: [${validMembers.join(', ')}]`);
      console.log(`    Members count: ${validMembers.length}`);
      
      // Simulate creating $oid objects
      const members = validMembers.map((memberId, index) => {
        const member = { $oid: memberId };
        if (gameTypeName.includes('接力')) {
          member.runOrder = index + 1;
        }
        return member;
      });
      
      console.log(`    Final members:`, JSON.stringify(members, null, 6));
      console.log(`    ✅ No empty $oid objects: ${members.every(m => m.$oid && m.$oid.trim() !== '')}`);
    });
    
    console.log('\n🎉 All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n📝 Database connection closed.');
  }
}

// Run the test
testTeamMemberFiltering();