const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const csv = require('csv-parser');
const pinyinLib = require('pinyin');
const { pinyin } = pinyinLib;
const Student = require('../models/Student');
const { verifyToken, verifyCoach } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Helper function to detect Chinese characters and convert to lowercase pinyin
const generateDefaultPassword = (name) => {
  // Check if name contains Chinese characters
  const chineseRegex = /[\u4e00-\u9fff]/;
  
  if (chineseRegex.test(name)) {
    try {
      // Convert Chinese characters to pinyin without tone marks and join as lowercase
      const pinyinResult = pinyin(name, {
        style: 'normal', // No tone marks
        heteronym: false, // Use most common pronunciation
        segment: true // Enable word segmentation
      });
      
      // Flatten the array and join to create a single string
      return pinyinResult.flat().join('').toLowerCase();
    } catch (error) {
      console.error('Pinyin conversion error:', error);
      return 'defaultpassword';
    }
  }
  
  // If no Chinese characters, return default password
  return 'defaultpassword';
};

/**
 * @swagger
 * components:
 *   schemas:
 *     Student:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         name:
 *           type: string
 *         username:
 *           type: string
 *         grade:
 *           type: string
 *           enum: [初一, 初二, 初三, 高一, 高二, 高三, 已毕业队员]
 *         class:
 *           type: number
 *           minimum: 1
 *           maximum: 50
 *         avatar:
 *           type: string
 *         role:
 *           type: string
 *           enum: [student, coach, IT]
 */

/**
 * @swagger
 * /api/students/search:
 *   get:
 *     summary: Search students by name
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: Search term for student name (case insensitive contains)
 *         required: true
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Maximum number of results to return
 *     responses:
 *       200:
 *         description: List of matching students
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                   name:
 *                     type: string
 *                   grade:
 *                     type: string
 *                   class:
 *                     type: number
 */
router.get('/search', verifyToken, async (req, res) => {
  try {
    const { name, limit = 10 } = req.query;
    
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Search name is required' });
    }
    
    const searchRegex = new RegExp(name.trim(), 'i'); // Case insensitive search
    const students = await Student.find(
      { name: searchRegex },
      { _id: 1, name: 1, grade: 1, class: 1 } // Only return necessary fields
    )
    .limit(parseInt(limit))
    .sort({ name: 1 }); // Sort alphabetically
    
    logger.info(`Student search completed for term: ${name}, found ${students.length} results`);
    res.json(students);
  } catch (error) {
    logger.error('Error searching students:', error);
    res.status(500).json({ error: 'Failed to search students' });
  }
});

/**
 * @swagger
 * /api/students:
 *   get:
 *     summary: Get all students (coach only)
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: grade
 *         schema:
 *           type: string
 *         description: Filter by single grade (backward compatibility)
 *       - in: query
 *         name: grades
 *         schema:
 *           type: string
 *         description: Filter by multiple grades (comma-separated)
 *     responses:
 *       200:
 *         description: List of students
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Student'
 *       500:
 *         description: Server error
 */
router.get('/', verifyToken, verifyCoach, async (req, res) => {
  const requestId = req.requestId;
  logger.info('HTTP Request', {
    requestId,
    method: 'GET',
    url: '/api/students',
    userId: req.user._id
  });
  
  try {
    const { grade, grades, class: classNumber } = req.query;
    
    // Build query filter
    let filter = { role: 'student' };
    
    // Handle multiple grades (new multi-select functionality)
    if (grades) {
      const gradeArray = grades.split(',').map(g => g.trim()).filter(g => g);
      if (gradeArray.length > 0) {
        filter.grade = { $in: gradeArray };
        logger.info('Filtering students by multiple grades', {
          requestId,
          grades: gradeArray,
          coachId: req.user._id
        });
      }
    }
    // Handle single grade (exact match)
    else if (grade) {
      filter.grade = grade;
      logger.info('Filtering students by single grade', {
        requestId,
        grade,
        coachId: req.user._id
      });
    }
    
    // Handle class filter (exact match)
    if (classNumber) {
      filter.class = parseInt(classNumber, 10);
      logger.info('Filtering students by class', {
        requestId,
        class: filter.class,
        coachId: req.user._id
      });
    }
    
    logger.logDatabase('Finding students with filter', 'collection', { filter }, {});
    
    const students = await Student.find(filter)
      .select('name username grade class avatar role _id gender birthday')
      .sort({ name: 1 });
    
    logger.info('Students retrieved successfully', {
      requestId,
      count: students.length,
      filter,
      coachId: req.user._id
    });
    
    res.json(students);
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/students/all:
 *   get:
 *     summary: Get all users (students, coaches, IT) - for assignment co-ownership
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Student'
 *       500:
 *         description: Server error
 */
router.get('/all', verifyToken, verifyCoach, async (req, res) => {
  const requestId = req.requestId;
  logger.info('HTTP Request', {
    requestId,
    method: 'GET',
    url: '/api/students/all',
    userId: req.user._id
  });
  
  try {
    logger.logDatabase('Finding all users for co-ownership', 'collection', {}, {});
    
    const users = await Student.find({})
      .select('name username grade class avatar role _id gender birthday')
      .sort({ role: 1, name: 1 });
    
    const roleGroups = users.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {});
    
    logger.info('All users retrieved successfully', {
      requestId,
      totalCount: users.length,
      roleDistribution: roleGroups,
      coachId: req.user._id
    });
    
    res.json(users);
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/students:
 *   post:
 *     summary: Create new student (coach only)
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - grade
 *               - class
 *             properties:
 *               name:
 *                 type: string
 *               grade:
 *                 type: string
 *                 enum: [初一, 初二, 初三, 高一, 高二, 高三, 已毕业队员]
 *               class:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 50
 *                 description: "Not required for graduated students (已毕业队员)"
 *               role:
 *                 type: string
 *                 enum: [student, coach, IT]
 *                 default: student
 *               avatar:
 *                 type: string
 *     responses:
 *       201:
 *         description: Student created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Student'
 *       400:
 *         description: Invalid input or username already exists
 *       500:
 *         description: Server error
 */
router.post('/', verifyToken, verifyCoach, async (req, res) => {
  const requestId = req.requestId;
  logger.info('HTTP Request', {
    requestId,
    method: 'POST',
    url: '/api/students',
    userId: req.user._id
  });
  
  try {
    const { name, grade, class: classNumber, role, avatar } = req.body;
    
    // Validate required fields
    if (!name || !grade) {
      logger.warn('Student creation failed - missing required fields', {
        requestId,
        providedFields: { name: !!name, grade: !!grade },
        coachId: req.user._id
      });
      return res.status(400).json({ message: 'Name and grade are required' });
    }
    
    // Validate grade enum
    const validGrades = ['初一', '初二', '初三', '高一', '高二', '高三', '已毕业队员'];
    if (!validGrades.includes(grade)) {
      logger.warn('Student creation failed - invalid grade', {
        requestId,
        grade,
        validGrades,
        coachId: req.user._id
      });
      return res.status(400).json({ message: 'Grade must be one of: ' + validGrades.join(', ') });
    }
    
    // Validate class number (not required for graduated students)
    if (grade !== '已毕业队员') {
      if (classNumber === undefined || classNumber === null) {
        logger.warn('Student creation failed - missing class for non-graduated student', {
          requestId,
          grade,
          coachId: req.user._id
        });
        return res.status(400).json({ message: 'Class is required for non-graduated students' });
      }
      
      if (typeof classNumber !== 'number' || classNumber < 1 || classNumber > 50) {
        logger.warn('Student creation failed - invalid class number', {
          requestId,
          classNumber,
          coachId: req.user._id
        });
        return res.status(400).json({ message: 'Class must be a number between 1 and 50' });
      }
    }
    
    // Generate username from name (lowercase, no spaces)
    const username = name.toLowerCase().replace(/\s+/g, '');
    
    logger.logDatabase('Checking for existing username', 'collection', { username }, {});
    
    // Check if username already exists
    const existingStudent = await Student.findOne({ username });
    if (existingStudent) {
      logger.warn('Student creation failed - username already exists', {
        requestId,
        username,
        existingStudentId: existingStudent._id,
        coachId: req.user._id
      });
      return res.status(400).json({ message: 'A student with this name already exists' });
    }
    
    // Create new student
    const studentData = {
      name,
      username,
      grade,
      class: grade === '已毕业队员' ? null : classNumber,
      role: role || 'student',
      avatar: avatar || '',
      password: generateDefaultPassword(name) // Generate password based on name
    };
    
    logger.logDatabase('Creating new student', 'collection', { studentData: { ...studentData, password: '[REDACTED]' } }, {});
    
    const newStudent = new Student(studentData);
    await newStudent.save();
    
    logger.info('Student created successfully', {
      requestId,
      studentId: newStudent._id,
      name: newStudent.name,
      username: newStudent.username,
      grade: newStudent.grade,
      class: newStudent.class,
      role: newStudent.role,
      coachId: req.user._id
    });
    
    // Return created student without password
    const createdStudent = await Student.findById(newStudent._id).select('-password');
    res.status(201).json(createdStudent);
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/students/batch-promote:
 *   put:
 *     summary: Batch promote students grade (coach only)
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - studentIds
 *               - currentGrade
 *               - nextGrade
 *             properties:
 *               studentIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               currentGrade:
 *                 type: string
 *               nextGrade:
 *                 type: string
 *     responses:
 *       200:
 *         description: Students promoted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 updatedCount:
 *                   type: number
 *       400:
 *         description: Invalid input or grade progression
 *       404:
 *         description: No students found with specified grade
 *       500:
 *         description: Server error
 */
router.put('/batch-promote', verifyToken, verifyCoach, async (req, res) => {
  const requestId = req.requestId;
  logger.info('HTTP Request', {
    requestId,
    method: 'PUT',
    url: '/api/students/batch-promote',
    userId: req.user._id
  });
  
  try {
    const { studentIds, currentGrade, nextGrade } = req.body;
    
    // Validate required fields
    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      logger.warn('Batch promotion failed - invalid student IDs', {
        requestId,
        studentIds,
        coachId: req.user._id
      });
      return res.status(400).json({ message: 'Student IDs are required' });
    }
    
    if (!currentGrade || !nextGrade) {
      logger.warn('Batch promotion failed - missing grade information', {
        requestId,
        currentGrade,
        nextGrade,
        coachId: req.user._id
      });
      return res.status(400).json({ message: 'Current grade and next grade are required' });
    }
    
    // Validate grade progression
    const validGradeMap = {
      '初一': '初二',
      '初二': '初三', 
      '初三': '已毕业',
      '高一': '高二',
      '高二': '高三',
      '高三': '已毕业'
    };
    
    if (validGradeMap[currentGrade] !== nextGrade) {
      logger.warn('Batch promotion failed - invalid grade progression', {
        requestId,
        currentGrade,
        nextGrade,
        validProgression: validGradeMap[currentGrade],
        coachId: req.user._id
      });
      return res.status(400).json({ 
        message: `Invalid grade progression from ${currentGrade} to ${nextGrade}` 
      });
    }
    
    logger.logDatabase('Finding students for batch promotion', 'collection', {
      studentIds,
      currentGrade,
      nextGrade
    }, {});
    
    // Find all students to be updated
    const students = await Student.find({
      _id: { $in: studentIds },
      role: 'student',
      grade: currentGrade
    });
    
    if (students.length === 0) {
      logger.warn('Batch promotion failed - no valid students found', {
        requestId,
        studentIds,
        currentGrade,
        coachId: req.user._id
      });
      return res.status(404).json({ 
        message: 'No students found with the specified grade' 
      });
    }
    
    if (students.length !== studentIds.length) {
      logger.warn('Batch promotion partial match - some students not found or have different grades', {
        requestId,
        requestedCount: studentIds.length,
        foundCount: students.length,
        foundStudents: students.map(s => ({ id: s._id, grade: s.grade })),
        coachId: req.user._id
      });
      return res.status(400).json({ 
        message: 'Some students were not found or do not have the expected grade' 
      });
    }
    
    logger.logDatabase('Updating student grades', 'collection', {
      studentCount: students.length,
      fromGrade: currentGrade,
      toGrade: nextGrade
    }, {});
    
    // Update all students' grades
    const updateResult = await Student.updateMany(
      {
        _id: { $in: studentIds },
        role: 'student',
        grade: currentGrade
      },
      {
        $set: { grade: nextGrade }
      }
    );
    
    logger.info('Batch promotion completed successfully', {
      requestId,
      updatedCount: updateResult.modifiedCount,
      fromGrade: currentGrade,
      toGrade: nextGrade,
      studentIds,
      coachId: req.user._id
    });
    
    res.json({
      success: true,
      message: `Successfully upgraded ${updateResult.modifiedCount} students from ${currentGrade} to ${nextGrade}`,
      updatedCount: updateResult.modifiedCount
    });
    
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ message: 'Server error during batch upgrade' });
  }
});

/**
 * @swagger
 * /api/students/batch-delete:
 *   delete:
 *     summary: Batch delete students (coach only)
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - studentIds
 *             properties:
 *               studentIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Students deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 deletedCount:
 *                   type: number
 *       400:
 *         description: Invalid input
 *       404:
 *         description: No students found
 *       500:
 *         description: Server error
 */
router.delete('/batch-delete', verifyToken, verifyCoach, async (req, res) => {
  const requestId = req.requestId;
  logger.info('HTTP Request', {
    requestId,
    method: 'DELETE',
    url: '/api/students/batch-delete',
    userId: req.user._id
  });
  
  try {
    const { studentIds } = req.body;
    
    // Validate required fields
    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      logger.warn('Batch deletion failed - invalid student IDs', {
        requestId,
        studentIds,
        coachId: req.user._id
      });
      return res.status(400).json({ message: 'Student IDs are required' });
    }
    
    logger.logDatabase('Finding students for batch deletion', 'collection', {
      studentIds
    }, {});
    
    // Find all students to be deleted
    const students = await Student.find({
      _id: { $in: studentIds },
      role: 'student'
    });
    
    if (students.length === 0) {
      logger.warn('Batch deletion failed - no valid students found', {
        requestId,
        studentIds,
        coachId: req.user._id
      });
      return res.status(404).json({ 
        message: 'No students found with the specified IDs' 
      });
    }
    
    logger.logDatabase('Deleting students', 'collection', {
      studentCount: students.length
    }, {});
    
    // Delete all students
    const deleteResult = await Student.deleteMany({
      _id: { $in: studentIds },
      role: 'student'
    });
    
    logger.info('Batch deletion completed successfully', {
      requestId,
      deletedCount: deleteResult.deletedCount,
      studentIds,
      coachId: req.user._id
    });
    
    res.json({
      success: true,
      message: `Successfully deleted ${deleteResult.deletedCount} students`,
      deletedCount: deleteResult.deletedCount
    });
    
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ message: 'Server error during batch deletion' });
  }
});

/**
 * @swagger
 * /api/students/batch-update-gender:
 *   put:
 *     summary: Batch update students gender (coach only)
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - studentIds
 *               - gender
 *             properties:
 *               studentIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               gender:
 *                 type: string
 *                 enum: [male, female]
 *     responses:
 *       200:
 *         description: Students gender updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 updatedCount:
 *                   type: number
 *       400:
 *         description: Invalid input
 *       404:
 *         description: No students found
 *       500:
 *         description: Server error
 */
router.put('/batch-update-gender', verifyToken, verifyCoach, async (req, res) => {
  const requestId = req.requestId;
  logger.info('HTTP Request', {
    requestId,
    method: 'PUT',
    url: '/api/students/batch-update-gender',
    userId: req.user._id
  });
  
  try {
    const { studentIds, gender } = req.body;
    
    // Validate required fields
    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      logger.warn('Batch gender update failed - invalid student IDs', {
        requestId,
        studentIds,
        coachId: req.user._id
      });
      return res.status(400).json({ message: 'Student IDs are required' });
    }
    
    if (!gender || !['男', '女'].includes(gender)) {
      logger.warn('Batch gender update failed - invalid gender', {
        requestId,
        gender,
        coachId: req.user._id
      });
      return res.status(400).json({ message: 'Valid gender (男 or 女) is required' });
    }
    
    logger.logDatabase('Finding students for batch gender update', 'collection', {
      studentIds,
      gender
    }, {});
    
    // Find all students to be updated
    const students = await Student.find({
      _id: { $in: studentIds },
      role: 'student'
    });
    
    if (students.length === 0) {
      logger.warn('Batch gender update failed - no valid students found', {
        requestId,
        studentIds,
        coachId: req.user._id
      });
      return res.status(404).json({ 
        message: 'No students found with the specified IDs' 
      });
    }
    
    logger.logDatabase('Updating student genders', 'collection', {
      studentCount: students.length,
      newGender: gender
    }, {});
    
    // Update all students' genders
    const updateResult = await Student.updateMany(
      {
        _id: { $in: studentIds },
        role: 'student'
      },
      {
        $set: { gender: gender }
      }
    );
    
    logger.info('Batch gender update completed successfully', {
      requestId,
      updatedCount: updateResult.modifiedCount,
      newGender: gender,
      studentIds,
      coachId: req.user._id
    });
    
    res.json({
      success: true,
      message: `Successfully updated gender for ${updateResult.modifiedCount} students`,
      updatedCount: updateResult.modifiedCount
    });
    
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ message: 'Server error during batch gender update' });
  }
});

/**
 * @swagger
 * /api/students/{id}:
 *   put:
 *     summary: Update student (coach only)
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Student ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Student'
 *     responses:
 *       200:
 *         description: Student updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Student'
 *       404:
 *         description: Student not found
 *       500:
 *         description: Server error
 */
router.put('/:id', verifyToken, verifyCoach, async (req, res) => {
  const requestId = req.requestId;
  logger.logRequest(requestId, 'PUT', `/api/students/${req.params.id}`, req.user._id, req.body);
  
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Remove sensitive fields that shouldn't be updated
    delete updateData.password;
    delete updateData.role;
    
    // If grade is being updated to '已毕业队员', set class to null
    if (updateData.grade === '已毕业队员') {
      updateData.class = null;
    }
    
    logger.logDatabase('Updating student', 'collection', {
      studentId: id,
      updateFields: Object.keys(updateData),
      coachId: req.user._id
    }, {});
    
    // For updates involving grade changes, we need to handle validation carefully
    let updatedStudent;
    if (updateData.grade === '已毕业队员') {
      // First update without validation, then validate manually
      updatedStudent = await Student.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: false }
      ).select('-password');
      
      // Manually validate the updated document
      if (updatedStudent) {
        await updatedStudent.validate();
      }
    } else {
      updatedStudent = await Student.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      ).select('-password');
    }
    
    if (!updatedStudent) {
      logger.warn('Student update failed - student not found', {
        requestId,
        studentId: id,
        coachId: req.user._id
      });
      return res.status(404).json({ message: 'Student not found' });
    }
    
    logger.info('Student updated successfully', {
      requestId,
      studentId: id,
      updatedFields: Object.keys(updateData),
      coachId: req.user._id
    });
    
    res.json(updatedStudent);
    
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/students/{id}:
 *   delete:
 *     summary: Delete student (coach only)
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Student ID
 *     responses:
 *       200:
 *         description: Student deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       404:
 *         description: Student not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', verifyToken, verifyCoach, async (req, res) => {
  const requestId = req.requestId;
  logger.logRequest(requestId, 'DELETE', `/api/students/${req.params.id}`, req.user._id);
  
  try {
    const { id } = req.params;
    
    logger.logDatabase('Deleting student', 'collection', {
      studentId: id,
      coachId: req.user._id
    }, {});
    
    const deletedStudent = await Student.findByIdAndDelete(id);
    
    if (!deletedStudent) {
      logger.warn('Student deletion failed - student not found', {
        requestId,
        studentId: id,
        coachId: req.user._id
      });
      return res.status(404).json({ message: 'Student not found' });
    }
    
    logger.info('Student deleted successfully', {
      requestId,
      studentId: id,
      deletedStudentName: deletedStudent.name,
      coachId: req.user._id
    });
    
    res.json({ message: 'Student deleted successfully' });
    
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ message: 'Server error' });
  }
});

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv', // .csv
      'application/csv', // .csv alternative
      'text/plain' // .csv sometimes detected as plain text
    ];
    
    // Also check file extension as fallback
    const fileName = file.originalname.toLowerCase();
    const isValidExtension = fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv');
    
    if (allowedTypes.includes(file.mimetype) || isValidExtension) {
      cb(null, true);
    } else {
      console.log('File rejected - MIME type:', file.mimetype, 'Filename:', file.originalname);
      cb(new Error('只支持 Excel (.xlsx, .xls) 和 CSV 文件格式'));
    }
  }
});

// Helper function to parse grade format
const parseGradeFormat = (gradeStr) => {
  if (!gradeStr || typeof gradeStr !== 'string') {
    return null;
  }
  
  const trimmed = gradeStr.trim();
  
  // Match patterns like "初一3班", "高二14班", "初一3", "高二14"
  const match = trimmed.match(/^(初|高)(一|二|三)(\d+)班?$/);
  
  if (match) {
    const [, level, grade, classNum] = match;
    return {
      grade: `${level}${grade}`,
      class: parseInt(classNum, 10)
    };
  }
  
  return null;
};

// Helper function to parse Excel file
const parseExcelFile = (buffer) => {
  const workbook = xlsx.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(worksheet);
  
  return data.map(row => ({
    name: row['姓名'] || row['name'] || '',
    grade: row['班级'] || row['grade'] || '',
    gender: row['性别'] || row['姓别'] || row['gender'] || '',
    birthday: row['生日'] || row['birthday'] || ''
  }));
};

// Helper function to parse CSV file
const parseCsvFile = (buffer) => {
  return new Promise((resolve, reject) => {
    const results = [];
    const stream = require('stream');
    const readable = new stream.Readable();
    readable.push(buffer);
    readable.push(null);
    
    readable
      .pipe(csv())
      .on('data', (row) => {
        let birthday = row['生日'] || row['birthday'] || '';
        
        // Convert numeric string to number for Excel date serial numbers
        if (birthday && typeof birthday === 'string' && /^\d+$/.test(birthday.trim())) {
          birthday = parseInt(birthday.trim(), 10);
        }
        
        results.push({
          name: row['姓名'] || row['name'] || '',
          grade: row['班级'] || row['grade'] || '',
          gender: row['性别'] || row['姓别'] || row['gender'] || '',
          birthday: birthday
        });
      })
      .on('end', () => resolve(results))
      .on('error', reject);
  });
};

/**
 * @swagger
 * /api/students/batch-upload:
 *   post:
 *     summary: Batch upload students from Excel or CSV file (coach only)
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Excel (.xlsx, .xls) or CSV file with columns 姓名,班级,性别,生日
 *     responses:
 *       200:
 *         description: Batch upload completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 results:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: number
 *                     created:
 *                       type: number
 *                     duplicates:
 *                       type: number
 *                     errors:
 *                       type: number
 *                     errorDetails:
 *                       type: array
 *                       items:
 *                         type: object
 *       400:
 *         description: Invalid file or data
 *       500:
 *         description: Server error
 */
router.post('/batch-upload', verifyToken, verifyCoach, upload.single('file'), async (req, res) => {
  const requestId = req.requestId;
  logger.info('HTTP Request', {
    requestId,
    method: 'POST',
    url: '/api/students/batch-upload',
    userId: req.user._id,
    fileName: req.file?.originalname
  });
  
  try {
    if (!req.file) {
      return res.status(400).json({ message: '请选择要上传的文件' });
    }
    
    let studentsData = [];
    
    // Parse file based on type
    const fileName = req.file.originalname.toLowerCase();
    
    if (req.file.mimetype.includes('sheet') || req.file.mimetype.includes('excel') || fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      // Excel file
      studentsData = parseExcelFile(req.file.buffer);
    } else if (req.file.mimetype.includes('csv') || req.file.mimetype === 'text/plain' || fileName.endsWith('.csv')) {
      // CSV file
      studentsData = await parseCsvFile(req.file.buffer);
    } else {
      console.log('Unsupported file type - MIME:', req.file.mimetype, 'Filename:', req.file.originalname);
      return res.status(400).json({ message: '不支持的文件格式' });
    }
    
    if (studentsData.length === 0) {
      return res.status(400).json({ message: '文件中没有找到有效的学生数据' });
    }
    
    const results = {
      total: studentsData.length,
      created: 0,
      duplicates: 0,
      errors: 0,
      errorDetails: []
    };
    
    // Process each student
    for (let i = 0; i < studentsData.length; i++) {
      const studentData = studentsData[i];
      const rowNumber = i + 2; // Excel/CSV row number (assuming header in row 1)
      
      try {
        // Validate required fields
        if (!studentData.name || !studentData.grade) {
          results.errors++;
          results.errorDetails.push({
            row: rowNumber,
            name: studentData.name || '未知',
            error: '姓名和班级不能为空'
          });
          continue;
        }
        
        // Parse and validate grade format
        const parsedGrade = parseGradeFormat(studentData.grade);
        if (!parsedGrade) {
          results.errors++;
          results.errorDetails.push({
            row: rowNumber,
            name: studentData.name,
            error: `班级格式不正确: ${studentData.grade}，应为如"初一3班"或"高二14班"`
          });
          continue;
        }
        
        // Validate gender if provided
        if (studentData.gender && !['男', '女'].includes(studentData.gender.trim())) {
          results.errors++;
          results.errorDetails.push({
            row: rowNumber,
            name: studentData.name,
            error: `性别格式不正确: ${studentData.gender}，应为"男"或"女"`
          });
          continue;
        }
        
        // Validate birthday format if provided
        let parsedBirthday = null;
        if (studentData.birthday) {
          let birthdayValue = studentData.birthday;
          
          // Handle numeric date values from Excel (Excel serial date numbers)
          if (typeof birthdayValue === 'number') {
            // Excel date serial number: days since January 1, 1900
            // Convert to JavaScript date
            const excelEpoch = new Date(1900, 0, 1);
            const daysSinceEpoch = birthdayValue - 2; // Excel has a leap year bug for 1900
            parsedBirthday = new Date(excelEpoch.getTime() + daysSinceEpoch * 24 * 60 * 60 * 1000);
            
            if (isNaN(parsedBirthday.getTime())) {
              results.errors++;
              results.errorDetails.push({
                row: rowNumber,
                name: studentData.name,
                error: `生日格式不正确: ${studentData.birthday}，无法解析Excel日期格式`
              });
              continue;
            }
          } else if (typeof birthdayValue === 'string' && birthdayValue.trim()) {
            const birthdayStr = birthdayValue.trim();
            // Support multiple date formats: YYYY-MM-DD, YYYY/MM/DD, MM/DD/YYYY
            const dateRegex = /^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$|^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/;
            if (dateRegex.test(birthdayStr)) {
              parsedBirthday = new Date(birthdayStr);
              if (isNaN(parsedBirthday.getTime())) {
                results.errors++;
                results.errorDetails.push({
                  row: rowNumber,
                  name: studentData.name,
                  error: `生日格式不正确: ${studentData.birthday}，应为如"2008-01-15"或"01/15/2008"`
                });
                continue;
              }
            } else {
              results.errors++;
              results.errorDetails.push({
                row: rowNumber,
                name: studentData.name,
                error: `生日格式不正确: ${studentData.birthday}，应为如"2008-01-15"或"01/15/2008"`
              });
              continue;
            }
          }
        }
        
        // Generate username
        const username = studentData.name.toLowerCase().replace(/\s+/g, '');
        
        // Check for existing student by grade and name (upsert logic)
        const existingStudent = await Student.findOne({ 
          name: studentData.name.trim(),
          grade: parsedGrade.grade,
          class: parsedGrade.class
        });
        
        // Prepare student data object
        const studentObj = {
          name: studentData.name.trim(),
          username,
          grade: parsedGrade.grade,
          class: parsedGrade.class,
          role: 'student',
          avatar: '',
          password: generateDefaultPassword(studentData.name.trim())
        };
        
        // Add optional fields if provided
        if (studentData.gender && studentData.gender.trim()) {
          studentObj.gender = studentData.gender.trim();
        }
        if (parsedBirthday) {
          studentObj.birthday = parsedBirthday;
        }
        
        if (existingStudent) {
          // Update existing student
          Object.assign(existingStudent, studentObj);
          await existingStudent.save();
          results.duplicates++;
          
          logger.info('Student updated via batch upload', {
            requestId,
            studentId: existingStudent._id,
            name: existingStudent.name,
            grade: existingStudent.grade,
            row: rowNumber,
            coachId: req.user._id
          });
        } else {
          // Create new student
          const newStudent = new Student(studentObj);
          await newStudent.save();
          results.created++;
          
          logger.info('Student created via batch upload', {
            requestId,
            studentId: newStudent._id,
            name: newStudent.name,
            grade: newStudent.grade,
            row: rowNumber,
            coachId: req.user._id
          });
        }
        
      } catch (error) {
        results.errors++;
        results.errorDetails.push({
          row: rowNumber,
          name: studentData.name || '未知',
          error: error.message || '创建学生时发生错误'
        });
        
        logger.warn('Error creating student in batch upload', {
          requestId,
          row: rowNumber,
          studentData,
          error: error.message,
          coachId: req.user._id
        });
      }
    }
    
    logger.info('Batch upload completed', {
      requestId,
      fileName: req.file.originalname,
      results,
      coachId: req.user._id
    });
    
    const message = `批量上传完成：成功创建 ${results.created} 个学生，更新 ${results.duplicates} 个学生，${results.errors} 个错误`;
    
    res.json({
      success: true,
      message,
      results
    });
    
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ message: '服务器错误：' + error.message });
  }
});

/**
 * @swagger
 * /api/students/roster:
 *   get:
 *     summary: Get student roster grouped by grade with gender statistics
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Student roster data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalCount:
 *                       type: number
 *                     gradeGroups:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           gradeName:
 *                             type: string
 *                           totalCount:
 *                             type: number
 *                           maleCount:
 *                             type: number
 *                           femaleCount:
 *                             type: number
 *                           students:
 *                             type: array
 *                             items:
 *                               $ref: '#/components/schemas/Student'
 *       500:
 *         description: Server error
 */
router.get('/roster', verifyToken, async (req, res) => {
  const requestId = req.requestId;
  logger.info('HTTP Request', {
    requestId,
    method: 'GET',
    url: '/api/students/roster',
    userId: req.user._id
  });
  
  try {
    // Get all students
    const students = await Student.find({ role: 'student' })
      .select('name username grade class gender avatar _id birthday')
      .sort({ name: 1 });
    
    // Extract grade level from grade string (e.g., "初二12班" -> "初二")
    function extractGradeLevel(gradeString) {
      const gradeMap = {
        '初一': '初一',
        '初二': '初二', 
        '初三': '初三',
        '高一': '高一',
        '高二': '高二',
        '高三': '高三',
        '已毕业队员': '已毕业队员'
      };
      
      for (const [key, value] of Object.entries(gradeMap)) {
        if (gradeString.includes(key)) {
          return value;
        }
      }
      return '其他';
    }
    
    // Group students by grade level
    function groupStudentsByGrade(students) {
      const gradeOrder = ['初一', '初二', '初三', '高一', '高二', '高三', '已毕业队员'];
      const grouped = {};
      
      // Group students by grade level
      students.forEach(student => {
        const gradeLevel = extractGradeLevel(student.grade);
        if (!grouped[gradeLevel]) {
          grouped[gradeLevel] = [];
        }
        grouped[gradeLevel].push(student);
      });
      
      // Sort by predefined order and calculate statistics
      return gradeOrder.map(grade => {
        const gradeStudents = grouped[grade] || [];
        const maleCount = gradeStudents.filter(s => s.gender === '男').length;
        const femaleCount = gradeStudents.filter(s => s.gender === '女').length;
        
        return {
          gradeName: grade,
          totalCount: gradeStudents.length,
          maleCount,
          femaleCount,
          students: gradeStudents
        };
      }).filter(group => group.totalCount > 0);
    }
    
    const gradeGroups = groupStudentsByGrade(students);
    const totalCount = students.length;
    

    
    logger.info('Student roster retrieved successfully', {
      requestId,
      totalCount,
      gradeGroupsCount: gradeGroups.length,
      gradeGroups: gradeGroups.map(g => ({ grade: g.gradeName, count: g.totalCount })),
      userId: req.user._id
    });
    
    res.json({
      success: true,
      data: {
        totalCount,
        gradeGroups
      }
    });
    
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
});

/**
 * @swagger
 * /api/students/{id}/profile:
 *   get:
 *     summary: Get student profile with completion records
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Student ID
 *     responses:
 *       200:
 *         description: Student profile data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     student:
 *                       $ref: '#/components/schemas/Student'
 *                     completionRecords:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/CompletionRecord'
 *       404:
 *         description: Student not found
 *       500:
 *         description: Server error
 */
router.get('/:id/profile', verifyToken, async (req, res) => {
  const requestId = req.requestId;
  const { id } = req.params;
  
  logger.info('HTTP Request', {
    requestId,
    method: 'GET',
    url: `/api/students/${id}/profile`,
    userId: req.user._id
  });
  
  try {
    // Check if user is accessing their own profile or is a coach
    const isOwnProfile = req.user._id.toString() === id;
    const isCoach = req.user.role === 'coach' || req.user.role === 'IT';
    
    if (!isOwnProfile && !isCoach) {
      logger.warn('Unauthorized profile access attempt', {
        requestId,
        requestedId: id,
        userId: req.user._id,
        userRole: req.user.role
      });
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }
    
    logger.logDatabase('Finding student by ID', 'students', { _id: id }, {});
    
    const student = await Student.findById(id)
      .select('name username grade gender birthday avatar role _id')
      .lean();
    
    if (!student) {
      logger.warn('Student not found for profile', {
        requestId,
        studentId: id,
        userId: req.user._id
      });
      return res.status(404).json({ 
        success: false, 
        message: 'Student not found' 
      });
    }
    
    // Get completion records for this student
    const CompletionRecord = require('../models/CompletionRecord');
    
    logger.logDatabase('Finding completion records for student', 'completionRecords', { name: student.name }, {});
    
    const completionRecords = await CompletionRecord.find({ name: student.name })
      .sort({ eventDate: -1 })
      .lean();
    
    logger.info('Student profile retrieved successfully', {
      requestId,
      studentId: id,
      studentName: student.name,
      completionRecordsCount: completionRecords.length,
      userId: req.user._id
    });
    
    res.json({
      success: true,
      data: {
        student,
        completionRecords
      }
    });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

/**
 * @swagger
 * /api/students/{id}/profile:
 *   put:
 *     summary: Update student profile
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Student ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               grade:
 *                 type: string
 *               gender:
 *                 type: string
 *                 enum: [男, 女]
 *               birthday:
 *                 type: string
 *                 format: date
 *               avatar:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Student'
 *       403:
 *         description: Access denied
 *       404:
 *         description: Student not found
 *       500:
 *         description: Server error
 */
router.put('/:id/profile', verifyToken, async (req, res) => {
  const requestId = req.requestId;
  const { id } = req.params;
  
  logger.info('HTTP Request', {
    requestId,
    method: 'PUT',
    url: `/api/students/${id}/profile`,
    userId: req.user._id
  });
  
  try {
    // Check if user is updating their own profile or is a coach
    const isOwnProfile = req.user._id.toString() === id;
    const isCoach = req.user.role === 'coach' || req.user.role === 'IT';
    
    if (!isOwnProfile && !isCoach) {
      logger.warn('Unauthorized profile update attempt', {
        requestId,
        requestedId: id,
        userId: req.user._id,
        userRole: req.user.role
      });
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }
    
    const updateData = req.body;
    
    // Remove fields that shouldn't be updated via this endpoint
    delete updateData.username;
    delete updateData.password;
    delete updateData.role;
    delete updateData._id;
    
    logger.logDatabase('Updating student profile', 'students', { _id: id }, updateData);
    
    const updatedStudent = await Student.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).select('name username grade gender birthday avatar role _id');
    
    if (!updatedStudent) {
      logger.warn('Student not found for profile update', {
        requestId,
        studentId: id,
        userId: req.user._id
      });
      return res.status(404).json({ 
        success: false, 
        message: 'Student not found' 
      });
    }
    
    logger.info('Student profile updated successfully', {
      requestId,
      studentId: id,
      studentName: updatedStudent.name,
      updatedFields: Object.keys(updateData),
      userId: req.user._id
    });
    
    res.json({
      success: true,
      data: updatedStudent
    });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

module.exports = router;