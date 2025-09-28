const mongoose = require('mongoose');
const EventRegistration = require('./models/EventRegistration');
const Student = require('./models/Student');
const Event = require('./models/Event');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/orienteeringx', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function checkAllRegistrations() {
  try {
    console.log('🔍 Checking all registrations in database...');
    
    // Find all registrations
    const allRegistrations = await EventRegistration.find({}).populate('studentId', 'username profile.realName');
    
    console.log(`\n📊 Total registrations found: ${allRegistrations.length}`);
    
    if (allRegistrations.length > 0) {
      console.log('\n📋 Recent registrations:');
      const recentRegistrations = allRegistrations.slice(-5); // Last 5 registrations
      
      for (const registration of recentRegistrations) {
        console.log(`\n👤 Student: ${registration.studentId.profile.realName} (${registration.studentId.username})`);
        console.log(`   Registration ID: ${registration._id}`);
        console.log(`   Event ID: ${registration.eventId}`);
        console.log(`   Status: ${registration.status}`);
        console.log(`   Registration Date: ${registration.registrationDate}`);
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
    }
    
    // Check events
    console.log('\n🎯 Checking events...');
    const events = await Event.find({}).select('_id eventName organization');
    console.log(`Found ${events.length} events:`);
    
    for (const event of events.slice(-3)) { // Last 3 events
      console.log(`   - ${event.eventName} (${event._id})`);
    }
    
    // Check for the specific event ID from the user's example
    const targetEventId = '68c58d4782eaf0375a9df722';
    const targetEvent = await Event.findById(targetEventId);
    
    if (targetEvent) {
      console.log(`\n✅ Target event found: ${targetEvent.eventName}`);
      
      // Check registrations for this specific event
      const targetRegistrations = await EventRegistration.find({ eventId: targetEventId });
      console.log(`   Registrations for this event: ${targetRegistrations.length}`);
    } else {
      console.log(`\n❌ Target event ${targetEventId} not found`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

checkAllRegistrations();