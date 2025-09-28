const mongoose = require('mongoose');
const Event = require('../models/Event');
const logger = require('../utils/logger');

/**
 * Migration script to convert gameTypes structure from:
 * gameTypes: ["混合接力赛", "短距离", "团队赛"]
 * gameTypeSettings: {"接力赛": {"teamSize": 2}, "团队赛": {"teamSize": 3}}
 * 
 * To:
 * gameTypes: [{"name": "混合接力赛", "teamSize": 2}, {"name": "短距离"}, {"name": "团队赛", "teamSize": 3}]
 */

async function migrateGameTypesStructure() {
  try {
    console.log('Starting gameTypes structure migration...');
    
    // Find all events that have the old structure
    const events = await Event.find({
      $or: [
        { gameTypes: { $type: 'array', $elemMatch: { $type: 'string' } } },
        { gameTypeSettings: { $exists: true } }
      ]
    });
    
    console.log(`Found ${events.length} events to migrate`);
    
    let migratedCount = 0;
    
    for (const event of events) {
      try {
        const newGameTypes = [];
        
        // Convert old gameTypes array to new structure
        if (Array.isArray(event.gameTypes)) {
          for (const gameTypeName of event.gameTypes) {
            if (typeof gameTypeName === 'string') {
              const gameTypeObj = { name: gameTypeName };
              
              // Check if there's a teamSize setting for this game type
              if (event.gameTypeSettings && event.gameTypeSettings[gameTypeName]) {
                gameTypeObj.teamSize = event.gameTypeSettings[gameTypeName].teamSize;
              }
              
              newGameTypes.push(gameTypeObj);
            } else {
              // Already in new format, keep as is
              newGameTypes.push(gameTypeName);
            }
          }
        }
        
        // Update the event
        const updateData = {
          gameTypes: newGameTypes
        };
        
        // Remove gameTypeSettings field
        const unsetData = {};
        if (event.gameTypeSettings) {
          unsetData.gameTypeSettings = 1;
        }
        
        await Event.updateOne(
          { _id: event._id },
          {
            $set: updateData,
            ...(Object.keys(unsetData).length > 0 ? { $unset: unsetData } : {})
          }
        );
        
        migratedCount++;
        console.log(`Migrated event: ${event.eventName} (${event._id})`);
        
      } catch (error) {
        console.error(`Error migrating event ${event._id}:`, error);
        logger.logError(error, { context: 'gameTypes migration', eventId: event._id });
      }
    }
    
    console.log(`Migration completed. ${migratedCount} events migrated successfully.`);
    
  } catch (error) {
    console.error('Migration failed:', error);
    logger.logError(error, { context: 'gameTypes migration' });
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/orienteeringx')
    .then(() => {
      console.log('Connected to MongoDB');
      return migrateGameTypesStructure();
    })
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateGameTypesStructure };