const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const Event = require('../models/Event');

async function addExternalGameIdField() {
  try {
    console.log('🔄 Starting migration to add externalGameId field to gameTypes...');
    
    // Find all events
    const events = await Event.find({});
    console.log(`📊 Found ${events.length} events to process`);
    
    let updatedCount = 0;
    
    for (const event of events) {
      let needsUpdate = false;
      
      // Check if gameTypes need to be updated
      if (event.gameTypes && event.gameTypes.length > 0) {
        const updatedGameTypes = event.gameTypes.map(gameType => {
          // If it's a string (old format), convert to object
          if (typeof gameType === 'string') {
            needsUpdate = true;
            return {
              name: gameType,
              externalGameId: ''
            };
          }
          // If it's an object but missing externalGameId
          else if (typeof gameType === 'object' && !gameType.hasOwnProperty('externalGameId')) {
            needsUpdate = true;
            return {
              ...gameType,
              externalGameId: ''
            };
          }
          // Already has externalGameId
          return gameType;
        });
        
        if (needsUpdate) {
          await Event.findByIdAndUpdate(event._id, {
            gameTypes: updatedGameTypes
          });
          updatedCount++;
          console.log(`✅ Updated event: ${event.eventName} (${event._id})`);
        }
      }
    }
    
    console.log(`🎉 Migration completed successfully!`);
    console.log(`📈 Updated ${updatedCount} events out of ${events.length} total events`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    mongoose.connection.close();
  }
}

// Run the migration
addExternalGameIdField();