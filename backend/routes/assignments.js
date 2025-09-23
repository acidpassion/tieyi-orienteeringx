const express = require('express');
const router = express.Router();
const Assignment = require('../models/Assignment');
const Student = require('../models/Student');
const QuizResult = require('../models/QuizResult');
const { verifyToken, verifyStudent, verifyCoach } = require('../middleware/auth');
const logger = require('../utils/logger');

/**
 * @swagger
 * components:
 *   schemas:
 *     Assignment:
 *       type: object
 *       required:
 *         - title
 *         - quizId
 *         - assignedTo
 *         - assignedBy
 *       properties:
 *         _id:
 *           type: string
 *           description: Assignment ID
 *         title:
 *           type: string
 *           description: Assignment title
 *         title_cn:
 *           type: string
 *           description: Assignment title in Chinese
 *         description:
 *           type: string
 *           description: Assignment description
 *         description_cn:
 *           type: string
 *           description: Assignment description in Chinese
 *         quizId:
 *           type: string
 *           description: Quiz ID
 *         assignedTo:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               studentId:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [pending, completed]
 *         assignedBy:
 *           type: string
 *           description: Coach ID who assigned
 *         co_owned:
 *           type: array
 *           items:
 *             type: string
 *           description: Co-owner coach IDs
 *         dueDate:
 *           type: string
 *           format: date-time
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/assignments/student:
 *   get:
 *     summary: Get assignments for logged-in student
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of assignments for the student
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Assignment'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/student', verifyToken, verifyStudent, async (req, res) => {
  const requestId = req.requestId;
  logger.info('HTTP Request', {
    requestId,
    method: 'GET',
    url: '/api/assignments/student',
    userId: req.user._id
  });
  
  try {
    logger.logDatabase('find', 'assignments', { studentId: req.user._id }, {});
    
    const assignments = await Assignment.find({
      'assignedTo.studentId': req.user._id
    })
    .populate('quizId', 'quiz_title quiz_title_cn description description_cn category category_cn difficulty maxTime')
    .populate('assignedBy', 'name username')
    .sort({ createdAt: -1 });
    
    // Add studentStatus field to each assignment based on current student's status
    const assignmentsWithStatus = assignments.map(assignment => {
      const assignmentObj = assignment.toObject();
      const studentAssignment = assignment.assignedTo.find(item => 
        item.studentId.toString() === req.user._id.toString()
      );
      assignmentObj.studentStatus = studentAssignment ? studentAssignment.status : 'pending';
      return assignmentObj;
    });
    
    logger.info('Student assignments retrieved successfully', {
      requestId,
      studentId: req.user._id,
      assignmentCount: assignments.length
    });
    
    res.json(assignmentsWithStatus);
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/assignments:
 *   post:
 *     summary: Create new assignment (coach only)
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - quizId
 *               - assignedTo
 *             properties:
 *               title:
 *                 type: string
 *               title_cn:
 *                 type: string
 *               description:
 *                 type: string
 *               description_cn:
 *                 type: string
 *               quizId:
 *                 type: string
 *               assignedTo:
 *                 type: array
 *                 items:
 *                   type: string
 *               co_owned:
 *                 type: array
 *                 items:
 *                   type: string
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Assignment created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Assignment'
 *       400:
 *         description: Missing required fields
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/', verifyToken, verifyCoach, async (req, res) => {
  const requestId = req.requestId;
  logger.info('HTTP Request', {
    requestId,
    method: 'POST',
    url: '/api/assignments',
    userId: req.user._id
  });
  
  try {
    const { title, title_cn, description, description_cn, quizId, assignedTo, co_owned, dueDate } = req.body;
    
    // Validate required fields
    if (!title || !quizId || !assignedTo || assignedTo.length === 0) {
      logger.warn('Assignment creation failed - missing required fields', {
        requestId,
        coachId: req.user._id,
        providedFields: { title: !!title, quizId: !!quizId, assignedTo: !!assignedTo }
      });
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    logger.logDatabase('create', 'assignments', { title, quizId }, {});
    
    // Create assignment
    const assignment = new Assignment({
      title,
      title_cn,
      description,
      description_cn,
      quizId,
      assignedTo: assignedTo.map(studentId => ({
        studentId,
        status: 'pending'
      })),
      assignedBy: req.user._id,
      co_owned: co_owned || [],
      dueDate
    });
    
    await assignment.save();
    
    // Populate the saved assignment for response
    const populatedAssignment = await Assignment.findById(assignment._id)
      .populate('quizId', 'quiz_title quiz_title_cn description description_cn category category_cn difficulty maxTime')
      .populate('assignedBy', 'name username')
      .populate('co_owned', 'name username');
    
    logger.info('Assignment created successfully', {
      requestId,
      assignmentId: assignment._id,
      title,
      coachId: req.user._id,
      assignedToCount: assignedTo.length
    });
    
    res.status(201).json(populatedAssignment);
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/assignments/coach:
 *   get:
 *     summary: Get assignments created by coach or co-owned by coach
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of assignments created by or co-owned by the coach
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Assignment'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/coach', verifyToken, verifyCoach, async (req, res) => {
  const requestId = req.requestId;
  logger.info('HTTP Request', {
    requestId,
    method: 'GET',
    url: '/api/assignments/coach',
    userId: req.user._id
  });
  
  try {
    logger.logDatabase('find', 'assignments', { coachId: req.user._id }, {});
    
    // Find assignments where user is either the creator or co-owner
    const assignments = await Assignment.find({
      $or: [
        { assignedBy: req.user._id },
        { co_owned: { $in: [req.user._id] } }
      ]
    })
      .populate('quizId', 'quiz_title quiz_title_cn')
      .populate('assignedTo.studentId', 'name username grade')
      .populate('co_owned', 'name username role')
      .populate('assignedBy', 'name username')
      .sort({ createdAt: -1 });
    
    logger.info('Coach assignments retrieved successfully', {
      requestId,
      coachId: req.user._id,
      assignmentCount: assignments.length
    });
    
    res.json(assignments);
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update assignment (coach only - creator or co-owner)
router.put('/:id', verifyToken, verifyCoach, async (req, res) => {
  console.log('✏️ Assignment update route - PUT /:id');
  console.log('Assignment ID:', req.params.id);
  console.log('Update data:', req.body);
  
  try {
    const assignment = await Assignment.findById(req.params.id);
    
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }
    
    // Check if user can edit (creator or co-owner)
    const canEdit = assignment.assignedBy.toString() === req.user._id.toString() ||
                   assignment.co_owned.some(coOwner => coOwner.toString() === req.user._id.toString());
    
    if (!canEdit) {
      return res.status(403).json({ message: 'Not authorized to edit this assignment' });
    }
    
    const { quizId, title, assignedTo, co_owned, dueDate } = req.body;
    
    // Update fields
    if (quizId) assignment.quizId = quizId;
    if (title) assignment.title = title;
    if (assignedTo) {
      const studentIds = Array.isArray(assignedTo) ? assignedTo : [assignedTo];
      assignment.assignedTo = studentIds.map(studentId => ({
        studentId: studentId,
        status: 'pending'
      }));
    }
    if (co_owned !== undefined) assignment.co_owned = Array.isArray(co_owned) ? co_owned : (co_owned ? [co_owned] : []);
    if (dueDate) assignment.dueDate = new Date(dueDate);
    
    await assignment.save();
    
    const updatedAssignment = await Assignment.findById(assignment._id)
      .populate('quizId', 'quiz_title quiz_title_cn')
      .populate('assignedTo', 'name username grade')
      .populate('co_owned', 'name username role')
      .populate('assignedBy', 'name username');
    
    console.log('✅ Assignment updated successfully');
    res.json(updatedAssignment);
  } catch (error) {
    console.error('❌ Assignment update error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/assignments/{id}:
 *   delete:
 *     summary: Delete assignment (coach only - creator or co-owner)
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Assignment ID
 *     responses:
 *       200:
 *         description: Assignment deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       403:
 *         description: Not authorized to delete this assignment
 *       404:
 *         description: Assignment not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', verifyToken, verifyCoach, async (req, res) => {
  const requestId = req.requestId;
  logger.logRequest(requestId, 'DELETE', `/api/assignments/${req.params.id}`, req.user._id);
  
  try {
    logger.logDatabase('Finding assignment for deletion', 'collection', {
      assignmentId: req.params.id,
      coachId: req.user._id
    }, {});
    
    // Find the assignment first
    const assignment = await Assignment.findById(req.params.id);
    
    if (!assignment) {
      logger.warn('Assignment deletion failed - assignment not found', {
        requestId,
        assignmentId: req.params.id,
        coachId: req.user._id
      });
      return res.status(404).json({ message: 'Assignment not found' });
    }
    
    // Check if user can delete (creator or co-owner)
    const canDelete = assignment.assignedBy.toString() === req.user._id.toString() ||
                     assignment.co_owned.some(coOwner => coOwner.toString() === req.user._id.toString());
    
    if (!canDelete) {
      logger.logAuth(requestId, 'Assignment deletion denied - insufficient permissions', {
        assignmentId: req.params.id,
        coachId: req.user._id,
        assignmentCreator: assignment.assignedBy,
        coOwners: assignment.co_owned
      });
      return res.status(403).json({ message: 'Not authorized to delete this assignment' });
    }
    
    await Assignment.findByIdAndDelete(req.params.id);
    
    logger.info('Assignment deleted successfully', {
      requestId,
      assignmentId: req.params.id,
      coachId: req.user._id,
      assignmentTitle: assignment.title
    });
    
    res.json({ message: 'Assignment deleted successfully' });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/assignments/{id}/status:
 *   get:
 *     summary: Get assignment status with student results (coach only)
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Assignment ID
 *     responses:
 *       200:
 *         description: Assignment status with student results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 assignment:
 *                   $ref: '#/components/schemas/Assignment'
 *                 studentResults:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       studentId:
 *                         type: string
 *                       status:
 *                         type: string
 *                       student:
 *                         type: object
 *                       score:
 *                         type: number
 *                       correctCount:
 *                         type: number
 *                       totalQuestions:
 *                         type: number
 *                       endTime:
 *                         type: string
 *                         format: date-time
 *                       duration:
 *                         type: number
 *       403:
 *         description: Not authorized to view this assignment
 *       404:
 *         description: Assignment not found
 *       500:
 *         description: Server error
 */
router.get('/:id/status', verifyToken, verifyCoach, async (req, res) => {
  const requestId = req.requestId;
  logger.logRequest(requestId, 'GET', `/api/assignments/${req.params.id}/status`, req.user._id);
  
  try {
    logger.logDatabase('Finding assignment for status check', 'collection', {
      assignmentId: req.params.id,
      coachId: req.user._id
    }, {});
    
    // Get the assignment with populated data
    const assignment = await Assignment.findById(req.params.id)
      .populate('quizId', 'quiz_title quiz_title_cn description description_cn category category_cn difficulty maxTime')
      .populate('assignedBy', 'name username')
      .populate('co_owned', 'name username');
    
    if (!assignment) {
      logger.warn('Assignment status check failed - assignment not found', {
        requestId,
        assignmentId: req.params.id,
        coachId: req.user._id
      });
      return res.status(404).json({ message: 'Assignment not found' });
    }
    
    // Check if user is authorized (assignment creator or co-owner)
    const isAuthorized = assignment.assignedBy._id.toString() === req.user._id.toString() ||
                        assignment.co_owned.some(coOwner => coOwner._id.toString() === req.user._id.toString());
    
    if (!isAuthorized) {
      logger.logAuth(requestId, 'Assignment status access denied - insufficient permissions', {
        assignmentId: req.params.id,
        coachId: req.user._id,
        assignmentCreator: assignment.assignedBy._id,
        coOwners: assignment.co_owned.map(co => co._id)
      });
      return res.status(403).json({ message: 'Not authorized to view this assignment' });
    }
    
    // Get all students assigned to this assignment
    const studentIds = assignment.assignedTo.map(item => item.studentId);
    
    logger.logDatabase('Finding students and quiz results', 'collection', {
      assignmentId: req.params.id,
      studentCount: studentIds.length
    }, {});
    
    const students = await Student.find({ _id: { $in: studentIds } });
    
    // Get quiz results for this assignment - get latest attempt per student
    const quizResults = await QuizResult.aggregate([
      {
        $match: {
          assignmentId: assignment._id,
          userId: { $in: studentIds } // Use userId field from QuizResult model
        }
      },
      {
        $sort: { endTime: -1 } // Sort by end time, latest first
      },
      {
        $group: {
          _id: '$userId', // Group by user ID
          latestResult: { $first: '$$ROOT' } // Get the first (latest) result for each student
        }
      },
      {
        $replaceRoot: { newRoot: '$latestResult' } // Replace root with the latest result
      }
    ]);
    
    // Create a map of student results
    const resultMap = new Map();
    quizResults.forEach(result => {
      resultMap.set(result.userId.toString(), result);
    });
    
    // Build student results array
    const studentResults = assignment.assignedTo.map(assignedItem => {
      const student = students.find(s => s._id.toString() === assignedItem.studentId.toString());
      const result = resultMap.get(assignedItem.studentId.toString());
      
      return {
        studentId: assignedItem.studentId,
        status: assignedItem.status,
        student: student ? {
          name: student.name,
          grade: student.grade,
          avatar: student.avatar
        } : null,
        score: result ? result.score : 0,
        correctCount: result ? result.correctCount : 0,
        totalQuestions: result ? result.totalQuestions : 0,
        endTime: result ? result.endTime : null,
        duration: result ? result.duration : null
      };
    });
    
    logger.info('Assignment status retrieved successfully', {
      requestId,
      assignmentId: req.params.id,
      coachId: req.user._id,
      studentResultCount: studentResults.length,
      completedCount: studentResults.filter(r => r.status === 'completed').length
    });
    
    res.json({
      assignment,
      studentResults
    });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/assignments/{id}/student/{studentId}/result:
 *   get:
 *     summary: Get detailed quiz result for a specific student in an assignment (coach only)
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Assignment ID
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Student ID
 *     responses:
 *       200:
 *         description: Detailed quiz result for the student
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                 assignmentId:
 *                   type: string
 *                 userId:
 *                   type: object
 *                 quizId:
 *                   type: object
 *                 score:
 *                   type: number
 *                 correctCount:
 *                   type: number
 *                 totalQuestions:
 *                   type: number
 *                 endTime:
 *                   type: string
 *                   format: date-time
 *                 duration:
 *                   type: number
 *       403:
 *         description: Not authorized to view this result
 *       404:
 *         description: Assignment or quiz result not found
 *       500:
 *         description: Server error
 */
router.get('/:id/student/:studentId/result', verifyToken, verifyCoach, async (req, res) => {
  const requestId = req.requestId;
  logger.logRequest(requestId, 'GET', `/api/assignments/${req.params.id}/student/${req.params.studentId}/result`, req.user._id);
  
  try {
    logger.logDatabase('Finding assignment for student result check', 'collection', {
      assignmentId: req.params.id,
      studentId: req.params.studentId,
      coachId: req.user._id
    }, {});
    
    // Get the assignment to verify authorization
    const assignment = await Assignment.findById(req.params.id)
      .populate('assignedBy', 'name username')
      .populate('co_owned', 'name username');
    
    if (!assignment) {
      logger.warn('Student result check failed - assignment not found', {
        requestId,
        assignmentId: req.params.id,
        studentId: req.params.studentId,
        coachId: req.user._id
      });
      return res.status(404).json({ message: 'Assignment not found' });
    }
    
    logger.info('Assignment found for student result check', {
      requestId,
      assignmentId: assignment._id,
      assignmentTitle: assignment.title,
      assignmentCreator: assignment.assignedBy._id,
      coachId: req.user._id
    });
    
    // Check if user is authorized (assignment creator or co-owner)
    const isAuthorized = assignment.assignedBy._id.toString() === req.user._id.toString() ||
                        assignment.co_owned.some(coOwner => coOwner._id.toString() === req.user._id.toString());
    
    if (!isAuthorized) {
      logger.logAuth(requestId, 'Student result access denied - insufficient permissions', {
        assignmentId: req.params.id,
        studentId: req.params.studentId,
        coachId: req.user._id,
        assignmentCreator: assignment.assignedBy._id,
        coOwners: assignment.co_owned.map(co => co._id)
      });
      return res.status(403).json({ message: 'Not authorized to view this result' });
    }
    
    logger.logDatabase('Searching for quiz result', 'collection', {
      assignmentId: req.params.id,
      studentId: req.params.studentId
    }, {});
    
    // Get the latest quiz result for this specific student and assignment
    const quizResult = await QuizResult.findOne({
      assignmentId: req.params.id,
      userId: req.params.studentId // Use userId field from QuizResult model
    })
    .sort({ endTime: -1 }) // Get the latest attempt
    .populate('userId', 'name grade avatar')
    .populate('quizId', 'quiz_title quiz_title_cn description description_cn category category_cn difficulty maxTime');

    if (!quizResult) {
      logger.warn('Quiz result not found for student', {
        requestId,
        assignmentId: req.params.id,
        studentId: req.params.studentId,
        coachId: req.user._id
      });
      
      // Log sample quiz results for debugging
      const sampleResults = await QuizResult.find({}).limit(3);
      logger.debug('Sample quiz results in database', {
        requestId,
        sampleResults: sampleResults.map(r => ({
          id: r._id,
          assignmentId: r.assignmentId,
          userId: r.userId
        }))
      });
      
      return res.status(404).json({ message: 'Quiz result not found' });
    }
    
    logger.info('Quiz result found for student', {
      requestId,
      quizResultId: quizResult._id,
      assignmentId: req.params.id,
      studentId: req.params.studentId,
      score: quizResult.score,
      coachId: req.user._id
    });
    
    res.json(quizResult);
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;