const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const EventRegistration = require('../models/EventRegistration');
const Student = require('../models/Student');

async function addPerformanceIndexes() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB successfully');

    // Add indexes for EventRegistration collection
    console.log('Adding indexes for EventRegistration collection...');
    
    // Index for eventId queries (used in team conflict detection)
    await EventRegistration.collection.createIndex({ eventId: 1 });
    console.log('✅ Created index on eventId');
    
    // Compound index for eventId and gameTypes.team.members._id (for team conflict queries)
    await EventRegistration.collection.createIndex({ 
      eventId: 1, 
      'gameTypes.team.members._id': 1 
    });
    console.log('✅ Created compound index on eventId and gameTypes.team.members._id');
    
    // Index for userId queries (used in user registration lookups)
    await EventRegistration.collection.createIndex({ userId: 1 });
    console.log('✅ Created index on userId');
    
    // Compound index for eventId and userId (for checking existing registrations)
    await EventRegistration.collection.createIndex({ 
      eventId: 1, 
      userId: 1 
    });
    console.log('✅ Created compound index on eventId and userId');

    // Add indexes for Student collection
    console.log('Adding indexes for Student collection...');
    
    // Text index for name search (used in student search API)
    await Student.collection.createIndex({ name: 'text' });
    console.log('✅ Created text index on name');
    
    // Index for name queries (case-insensitive search)
    await Student.collection.createIndex({ name: 1 });
    console.log('✅ Created index on name');
    
    // Index for grade and class (used in filtering)
    await Student.collection.createIndex({ grade: 1, class: 1 });
    console.log('✅ Created compound index on grade and class');

    console.log('\n🎉 All performance indexes have been created successfully!');
    
    // Display current indexes
    console.log('\n📋 Current indexes:');
    const registrationIndexes = await EventRegistration.collection.listIndexes().toArray();
    console.log('EventRegistration indexes:', registrationIndexes.map(idx => idx.name));
    
    const studentIndexes = await Student.collection.listIndexes().toArray();
    console.log('Student indexes:', studentIndexes.map(idx => idx.name));
    
  } catch (error) {
    console.error('❌ Error adding indexes:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
    process.exit(0);
  }
}

// Run the script
addPerformanceIndexes();