const mongoose = require('mongoose');
const EventRegistration = require('./models/EventRegistration');
const Student = require('./models/Student');

async function checkStudentIds() {
  try {
    await mongoose.connect('mongodb://localhost:27017/orienteeringx');
    console.log('=== CHECKING STUDENT IDS ===');
    
    const reg = await EventRegistration.findOne();
    if (reg) {
      console.log('Registration member IDs:');
      reg.gameTypes.forEach((gt, i) => {
        console.log(`Game Type ${i+1}: ${gt.name}`);
        gt.team.members.forEach((m, j) => {
          console.log(`  Member ${j+1}: ${m._id}`);
        });
      });
    }
    
    console.log('\n=== ACTUAL STUDENTS IN DB ===');
    const students = await Student.find({}, '_id name realName username');
    students.forEach(s => {
      console.log(`${s._id}: ${s.name} (${s.realName}) - ${s.username}`);
    });
    
    mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkStudentIds();