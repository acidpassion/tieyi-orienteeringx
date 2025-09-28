const mongoose = require('mongoose');
const EventRegistration = require('./models/EventRegistration');
require('dotenv').config();

async function fixCaptainField() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find all registrations with relay or team games that have team members
    const registrations = await EventRegistration.find({
      $or: [
        { 'gameTypes.name': '接力赛' },
        { 'gameTypes.name': '团队赛' }
      ],
      'gameTypes.team.members': { $exists: true, $ne: [] }
    });

    console.log(`\n🔍 Found ${registrations.length} registrations to fix...\n`);

    let fixedCount = 0;
    let errorCount = 0;

    for (const registration of registrations) {
      try {
        let needsUpdate = false;
        
        for (const gameType of registration.gameTypes) {
          if ((gameType.name === '接力赛' || gameType.name === '团队赛') && 
              gameType.team && gameType.team.members && gameType.team.members.length > 0) {
            
            // Check if captain field needs fixing
            const captainCount = gameType.team.members.filter(m => m.captain === true).length;
            
            if (captainCount !== 1) {
              console.log(`🔧 Fixing ${gameType.name} team for student ${registration.studentId}`);
              
              // Set first member as captain, others as non-captain
              gameType.team.members.forEach((member, index) => {
                member.captain = index === 0;
              });
              
              needsUpdate = true;
              
              console.log(`   ✅ Set member ${gameType.team.members[0]._id} as captain`);
              console.log(`   ✅ Set ${gameType.team.members.length - 1} other members as non-captain`);
            }
          }
        }
        
        if (needsUpdate) {
          await registration.save();
          fixedCount++;
          console.log(`   💾 Updated registration ${registration._id}\n`);
        }
        
      } catch (error) {
        console.error(`❌ Error fixing registration ${registration._id}:`, error.message);
        errorCount++;
      }
    }

    console.log(`\n📊 Migration Summary:`);
    console.log(`   ✅ Fixed: ${fixedCount} registrations`);
    console.log(`   ❌ Errors: ${errorCount} registrations`);
    console.log(`   📋 Total processed: ${registrations.length} registrations`);

    // Verify the fix by checking a few registrations
    console.log('\n🔍 Verifying fixes...');
    const verifyRegistrations = await EventRegistration.find({
      $or: [
        { 'gameTypes.name': '接力赛' },
        { 'gameTypes.name': '团队赛' }
      ],
      'gameTypes.team.members': { $exists: true, $ne: [] }
    }).limit(3);

    verifyRegistrations.forEach((reg, index) => {
      console.log(`\n📋 Verification ${index + 1}:`);
      reg.gameTypes.forEach(gameType => {
        if ((gameType.name === '接力赛' || gameType.name === '团队赛') && 
            gameType.team && gameType.team.members) {
          const captainCount = gameType.team.members.filter(m => m.captain === true).length;
          console.log(`   ${gameType.name}: ${captainCount} captain(s) ${captainCount === 1 ? '✅' : '❌'}`);
        }
      });
    });

  } catch (error) {
    console.error('❌ Migration Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the migration
fixCaptainField();