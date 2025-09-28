const mongoose = require('mongoose');
const EventRegistration = require('./models/EventRegistration');
const Student = require('./models/Student');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/orienteeringx', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function verifyTeamRegistrations() {
  try {
    console.log('🔍 Checking team registrations for event: 68c58d4782eaf0375a9df722');
    
    // Find all registrations for the specific event
    const registrations = await EventRegistration.find({
      eventId: '68c58d4782eaf0375a9df722'
    }).populate('studentId', 'username profile.realName');
    
    console.log(`\n📊 Found ${registrations.length} registrations for this event:`);
    
    for (const registration of registrations) {
      const studentName = registration.studentId?.profile?.realName || registration.studentId?.username || 'Unknown';
      console.log(`\n👤 Student: ${studentName}`);
      console.log(`   Registration ID: ${registration._id}`);
      console.log(`   Student ID: ${registration.studentId?._id || registration.studentId}`);
      console.log(`   Status: ${registration.status}`);
      console.log(`   Game Types: ${registration.gameTypes.length}`);
      
      for (const gameType of registration.gameTypes) {
        console.log(`     - ${gameType.name} (${gameType.group})`);
        if (gameType.team) {
          console.log(`       Team: ${gameType.team.name}`);
          console.log(`       Invite Code: ${gameType.inviteCode}`);
          console.log(`       Members: ${gameType.team.members.length}`);
        }
      }
    }
    
    // Check specifically for relay team registrations
    const relayRegistrations = registrations.filter(reg => 
      reg.gameTypes.some(gt => gt.name === '接力赛')
    );
    
    console.log(`\n🏃 Relay registrations found: ${relayRegistrations.length}`);
    
    if (relayRegistrations.length > 0) {
      const relayGameType = relayRegistrations[0].gameTypes.find(gt => gt.name === '接力赛');
      if (relayGameType && relayGameType.team) {
        console.log(`\n🎯 Expected team members: ${relayGameType.team.members.length}`);
        console.log(`🎯 Actual registrations: ${relayRegistrations.length}`);
        
        if (relayGameType.team.members.length === relayRegistrations.length) {
          console.log('✅ SUCCESS: All team members have registrations!');
        } else {
          console.log('❌ ISSUE: Missing registrations for some team members');
          
          // Find missing members
          const registeredStudentIds = relayRegistrations.map(reg => reg.studentId._id.toString());
          const teamMemberIds = relayGameType.team.members.map(member => member._id.toString());
          
          const missingMembers = teamMemberIds.filter(id => !registeredStudentIds.includes(id));
          
          if (missingMembers.length > 0) {
            console.log('\n🚨 Missing registrations for:');
            for (const memberId of missingMembers) {
              const student = await Student.findById(memberId);
              console.log(`   - ${student ? student.profile.realName : 'Unknown'} (${memberId})`);
            }
          }
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

verifyTeamRegistrations();