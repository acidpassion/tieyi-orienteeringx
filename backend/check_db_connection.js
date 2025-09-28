const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/orienteeringx', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function checkDatabase() {
  try {
    console.log('🔍 Checking database connection and collections...');
    
    // Check connection
    const db = mongoose.connection.db;
    console.log(`✅ Connected to database: ${db.databaseName}`);
    
    // List all collections
    const collections = await db.listCollections().toArray();
    console.log(`\n📊 Found ${collections.length} collections:`);
    
    for (const collection of collections) {
      console.log(`   - ${collection.name}`);
      
      // Count documents in each collection
      const count = await db.collection(collection.name).countDocuments();
      console.log(`     Documents: ${count}`);
      
      // Show sample document if exists
      if (count > 0) {
        const sample = await db.collection(collection.name).findOne();
        console.log(`     Sample: ${JSON.stringify(sample, null, 2).substring(0, 200)}...`);
      }
    }
    
    // Specifically check eventregistrations collection
    console.log('\n🎯 Checking eventregistrations collection specifically...');
    const eventRegistrations = await db.collection('eventregistrations').find({}).toArray();
    console.log(`Found ${eventRegistrations.length} event registrations`);
    
    if (eventRegistrations.length > 0) {
      console.log('Recent registrations:');
      eventRegistrations.slice(-3).forEach((reg, index) => {
        console.log(`${index + 1}. ID: ${reg._id}, Event: ${reg.eventId}, Student: ${reg.studentId}`);
      });
    }
    
    // Check events collection
    console.log('\n🎯 Checking events collection specifically...');
    const events = await db.collection('events').find({}).toArray();
    console.log(`Found ${events.length} events`);
    
    if (events.length > 0) {
      console.log('Recent events:');
      events.slice(-3).forEach((event, index) => {
        console.log(`${index + 1}. ID: ${event._id}, Name: ${event.eventName}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

checkDatabase();