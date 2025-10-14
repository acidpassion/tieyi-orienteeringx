const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const CompletionRecord = require('../models/CompletionRecord');

async function addRelayPersonalTimeField() {
  try {
    console.log('🔄 Starting migration to add relayPersonalTotalTime field to CompletionRecord...');
    
    // Find all completion records
    const records = await CompletionRecord.find({});
    console.log(`📊 Found ${records.length} completion records to process`);
    
    let updatedCount = 0;
    
    for (const record of records) {
      let needsUpdate = false;
      const updateData = {};
      
      // Add relayPersonalTotalTime field if it doesn't exist
      if (!record.hasOwnProperty('relayPersonalTotalTime')) {
        updateData.relayPersonalTotalTime = null;
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        await CompletionRecord.findByIdAndUpdate(record._id, updateData);
        updatedCount++;
        console.log(`✅ Updated record: ${record.name} - ${record.eventName} (${record._id})`);
      }
    }
    
    console.log(`🎉 Migration completed successfully!`);
    console.log(`📈 Updated ${updatedCount} records out of ${records.length} total records`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    mongoose.connection.close();
  }
}

// Run the migration
addRelayPersonalTimeField();