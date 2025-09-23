const jwt = require('jsonwebtoken');
const Student = require('../models/Student');

const verifyToken = async (req, res, next) => {
  console.log('🔐 Auth middleware - verifyToken');
  console.log('Authorization header:', req.header('Authorization'));
  
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      console.log('❌ No token provided');
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    console.log('🔍 Verifying token...');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ Token decoded:', { userId: decoded.userId, role: decoded.role });
    
    const user = await Student.findById(decoded.userId).select('-password');
    
    if (!user) {
      console.log('❌ User not found for token');
      return res.status(401).json({ message: 'Token is not valid' });
    }

    console.log('✅ User found:', { id: user._id, name: user.name, role: user.role });
    req.user = user;
    next();
  } catch (error) {
    console.log('❌ Token verification error:', error.message);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

const verifyCoach = (req, res, next) => {
  console.log('👨‍🏫 Auth middleware - verifyCoach');
  console.log('User role:', req.user.role);
  
  if (req.user.role !== 'coach') {
    console.log('❌ Access denied - not a coach');
    return res.status(403).json({ message: 'Access denied. Coach role required.' });
  }
  
  console.log('✅ Coach access granted');
  next();
};

const verifyStudent = (req, res, next) => {
  console.log('👨‍🎓 Auth middleware - verifyStudent');
  console.log('User role:', req.user.role);
  
  if (req.user.role !== 'student') {
    console.log('❌ Access denied - not a student');
    return res.status(403).json({ message: 'Access denied. Student role required.' });
  }
  
  console.log('✅ Student access granted');
  next();
};

const verifyCoachOrStudent = (req, res, next) => {
  console.log('👥 Auth middleware - verifyCoachOrStudent');
  console.log('User role:', req.user.role);
  
  if (req.user.role !== 'coach' && req.user.role !== 'student') {
    console.log('❌ Access denied - not a coach or student');
    return res.status(403).json({ message: 'Access denied. Coach or Student role required.' });
  }
  
  console.log('✅ Coach or Student access granted');
  next();
};

const verifyCoachOrOwner = async (req, res, next) => {
  console.log('🔐 Auth middleware - verifyCoachOrOwner');
  console.log('User role:', req.user.role, 'User name:', req.user.name);
  
  // If user is a coach, allow access
  if (req.user.role === 'coach') {
    console.log('✅ Coach access granted');
    return next();
  }
  
  // If user is a student, check if they own the record
  if (req.user.role === 'student') {
    try {
      const CompletionRecord = require('../models/CompletionRecord');
      const recordId = req.params.id;
      
      if (!recordId) {
        console.log('❌ No record ID provided');
        return res.status(400).json({ message: 'Record ID is required' });
      }
      
      const record = await CompletionRecord.findById(recordId);
      
      if (!record) {
        console.log('❌ Record not found');
        return res.status(404).json({ message: 'Record not found' });
      }
      
      // Check if the student owns this record (by name)
      if (record.name === req.user.name) {
        console.log('✅ Student owns the record - access granted');
        return next();
      } else {
        console.log('❌ Student does not own this record');
        return res.status(403).json({ message: 'Access denied. You can only manage your own records.' });
      }
    } catch (error) {
      console.log('❌ Error checking record ownership:', error.message);
      return res.status(500).json({ message: 'Server error while checking permissions' });
    }
  }
  
  console.log('❌ Access denied - invalid role');
  return res.status(403).json({ message: 'Access denied. Invalid role.' });
};

module.exports = { verifyToken, verifyCoach, verifyStudent, verifyCoachOrStudent, verifyCoachOrOwner };