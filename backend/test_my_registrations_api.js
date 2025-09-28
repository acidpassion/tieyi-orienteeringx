const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config();

// Test the /api/registrations/my endpoint
async function testMyRegistrationsAPI() {
  try {
    console.log('🚀 Testing /api/registrations/my API...');
    
    // Connect to MongoDB to check data
    await mongoose.connect('mongodb://localhost:27017/orienteeringx');
    console.log('🔌 Connected to MongoDB');
    
    const EventRegistration = require('./models/EventRegistration');
    const Student = require('./models/Student');
    
    // First, let's check what students exist in the database
    console.log('\n👥 Checking students in database...');
    const allStudents = await Student.find({}).limit(10);
    console.log(`Found ${allStudents.length} students:`);
    allStudents.forEach((student, index) => {
      console.log(`Student ${index + 1}:`, {
        _id: student._id,
        name: student.name,
        realName: student.realName,
        username: student.username,
        grade: student.grade,
        class: student.class
      });
    });
    
    // Check specific student IDs from the registration
    const studentIds = ['6890c4b4e2e61a6f5e2f1fb1', '6890c4b4e2e61a6f5e2f1fb3', '68cc301b532158c4fe44258b'];
    console.log('\n🔍 Checking specific student IDs from registration...');
    
    for (const studentId of studentIds) {
      try {
        const student = await Student.findById(studentId);
        if (student) {
          console.log(`Student ${studentId}:`, {
            _id: student._id,
            name: student.name,
            realName: student.realName,
            username: student.username,
            grade: student.grade,
            class: student.class,
            allFields: Object.keys(student.toObject())
          });
        } else {
          console.log(`Student ${studentId}: NOT FOUND`);
        }
      } catch (error) {
        console.log(`Student ${studentId}: ERROR -`, error.message);
      }
    }
    
    // Test API call with eventId
    console.log('\n🌐 Testing API call with eventId...');
    const response = await axios.get('http://localhost:5001/api/registrations/my?eventId=68d73196a30c3b880e1e09a2', {
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODkwYzRiNGUyZTYxYTZmNWUyZjFmYjEiLCJyb2xlIjoic3R1ZGVudCIsImlhdCI6MTc1ODYzNjcwMiwiZXhwIjoxNzY2NDEyNzAyfQ.WDDCTIG9V066AFWB_AGB0WdLq4cG7nrtasaYHfAC8x4'
      }
    });
    
    console.log('API Response:');
    console.log('Number of registrations:', response.data.length);
    
    response.data.forEach((reg, index) => {
      console.log(`\nRegistration ${index + 1}:`);
      console.log('  Event ID:', reg.eventId?._id);
      console.log('  Event Name:', reg.eventId?.eventName);
      console.log('  Game Types:', reg.gameTypes?.length || 0);
      
      if (reg.gameTypes) {
        reg.gameTypes.forEach((gt, gtIndex) => {
          console.log(`  Game Type ${gtIndex + 1}: ${gt.name}`);
          if (gt.team && gt.team.members) {
            console.log(`    Team Members (${gt.team.members.length}):`);
            gt.team.members.forEach((member, mIndex) => {
              console.log(`      Member ${mIndex + 1}:`, {
                _id: member._id,
                name: member.name,
                realName: member.realName,
                username: member.username,
                runOrder: member.runOrder,
                captain: member.captain
              });
            });
          }
        });
      }
    });
    
  } catch (error) {
    console.error('❌ Error testing API:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

testMyRegistrationsAPI();