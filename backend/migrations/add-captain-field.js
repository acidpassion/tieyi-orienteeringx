const { MongoClient } = require('mongodb');

// Database migration script to add captain field to existing relay teams
async function migrateCaptainField() {
  const client = new MongoClient('mongodb://localhost:27017');
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('orienteeringx');
    const collection = db.collection('eventregistrations');
    
    // Step 1: Add captain field to existing relay team members (default to false)
    console.log('Adding captain field to existing relay team members...');
    const result1 = await collection.updateMany(
      { "gameType.name": "接力赛" },
      {
        $set: {
          "gameType.team.$[elem].captain": false
        }
      },
      {
        arrayFilters: [{ "elem.captain": { $exists: false } }]
      }
    );
    console.log(`Updated ${result1.modifiedCount} documents with captain field`);
    
    // Step 2: Set first team member as captain for existing teams
    console.log('Setting first team member as captain for existing teams...');
    
    // Get all unique invite codes for relay teams
    const inviteCodes = await collection.distinct(
      "gameType.inviteCode", 
      { "gameType.name": "接力赛" }
    );
    
    console.log(`Found ${inviteCodes.length} relay teams to update`);
    
    let captainUpdates = 0;
    for (const inviteCode of inviteCodes) {
      // Find the first registration for this team (by creation date)
      const firstRegistration = await collection.findOne(
        { "gameType.inviteCode": inviteCode },
        { sort: { createdAt: 1 } }
      );
      
      if (firstRegistration && firstRegistration.gameType.team.length > 0) {
        const captainStudentId = firstRegistration.gameType.team[0].studentId;
        
        // Update all registrations for this team to set the captain
        const result2 = await collection.updateMany(
          { "gameType.inviteCode": inviteCode },
          {
            $set: {
              "gameType.team.$[elem].captain": true
            }
          },
          {
            arrayFilters: [{ "elem.studentId": captainStudentId }]
          }
        );
        
        captainUpdates += result2.modifiedCount;
        console.log(`Set captain for team ${inviteCode}: ${result2.modifiedCount} documents updated`);
      }
    }
    
    console.log(`Migration completed successfully!`);
    console.log(`Total documents updated with captain field: ${result1.modifiedCount}`);
    console.log(`Total documents updated with captain status: ${captainUpdates}`);
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await client.close();
    console.log('Database connection closed');
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateCaptainField()
    .then(() => {
      console.log('Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateCaptainField };