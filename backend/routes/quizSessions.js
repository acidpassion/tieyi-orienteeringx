const express = require('express');
const mongoose = require('mongoose');
const QuizSession = require('../models/QuizSession');
const Quiz = require('../models/Quiz');
const Question = require('../models/Question');
const QuizResult = require('../models/QuizResult');
const Assignment = require('../models/Assignment');
const { verifyToken } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     QuizSession:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Session ID
 *         userId:
 *           type: string
 *           description: User ID
 *         quizId:
 *           type: string
 *           description: Quiz ID
 *         assignmentId:
 *           type: string
 *           description: Assignment ID (optional)
 *         timeRemaining:
 *           type: number
 *           description: Time remaining in seconds
 *         responses:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               questionId:
 *                 type: string
 *               selectedAnswers:
 *                 type: array
 *                 items:
 *                   type: string
 *               sortIndex:
 *                 type: number
 *               answeredAt:
 *                 type: string
 *                 format: date-time
 *         status:
 *           type: string
 *           enum: [active, completed, expired]
 *         startTime:
 *           type: string
 *           format: date-time
 *         lastActiveTime:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/quiz-sessions/start:
 *   post:
 *     summary: Start or resume a quiz session
 *     tags: [Quiz Sessions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - quizId
 *             properties:
 *               quizId:
 *                 type: string
 *                 description: Quiz ID to start
 *               assignmentId:
 *                 type: string
 *                 description: Assignment ID (optional)
 *               retake:
 *                 type: boolean
 *                 description: Whether to retake a completed assignment
 *     responses:
 *       200:
 *         description: Quiz session started or resumed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sessionId:
 *                   type: string
 *                 currentQuestionIndex:
 *                   type: number
 *                 responses:
 *                   type: array
 *                   items:
 *                     type: object
 *                 timeRemaining:
 *                   type: number
 *                 isResuming:
 *                   type: boolean
 *       404:
 *         description: Quiz not found
 *       409:
 *         description: Assignment already completed
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/start', verifyToken, async (req, res) => {
  const requestId = req.requestId;
  logger.info('HTTP Request', {
    requestId,
    method: 'POST',
    url: '/api/quiz-sessions/start',
    userId: req.user?._id
  });
  
  logger.info('Quiz session start request', {
    requestId,
    userId: req.user._id,
    quizId: req.body.quizId,
    assignmentId: req.body.assignmentId
  });
  
  try {
    const { quizId, assignmentId } = req.body;
    const userId = req.user._id;

    // Validate assignmentId - handle "default" case
    let validAssignmentId = null;
    if (assignmentId && assignmentId !== 'default') {
      // For testing purposes, treat any non-default assignmentId as valid
      // In production, you'd want to check if assignment exists:
      // const assignment = await Assignment.findById(assignmentId);
      // if (assignment) {
        // Convert to ObjectId for consistency
        validAssignmentId = new mongoose.Types.ObjectId(assignmentId);
      // }
    }

    // Check if there's an existing active session
    // Build query to find existing session for this user/quiz/assignment combination
    let sessionQuery;
    
    // Convert quizId to ObjectId for consistency
    const userIdObj = userId.$oid ? userId.$oid : userId;
    const validQuizId = new mongoose.Types.ObjectId(quizId);
    
    if (validAssignmentId) {
      // Check if assignment is already completed for this specific student
      const assignment = await Assignment.findById(validAssignmentId);
      if (assignment) {
        const studentAssignment = assignment.assignedTo.find(
          student => student.studentId.toString() === userIdObj.toString()
        );
        
        if (studentAssignment && studentAssignment.status === 'completed') {
          // Check if user wants to retake (this will be handled by frontend confirmation)
          const { retake } = req.body;
          if (!retake) {
            return res.status(409).json({ 
              message: 'Assignment already completed',
              assignmentCompleted: true,
              assignmentId: validAssignmentId
            });
          }
          
          // If retaking, delete existing completed session and reset student's assignment status
          await QuizSession.deleteMany({
            userId: new mongoose.Types.ObjectId(userIdObj),
            quizId: validQuizId,
            assignmentId: validAssignmentId,
            status: 'completed'
          });
          
          // Reset this student's assignment status to pending
          await Assignment.findOneAndUpdate(
            { 
              _id: validAssignmentId,
              'assignedTo.studentId': new mongoose.Types.ObjectId(userIdObj)
            },
            { 
              '$set': { 'assignedTo.$.status': 'pending' } 
            },
            { new: true }
          );
          
          logger.info('Reset completed assignment for retake', {
            requestId,
            assignmentId: validAssignmentId,
            userId: userIdObj
          });
        }
      }
      
      // Look for session with specific assignmentId
      sessionQuery = {
        userId: new mongoose.Types.ObjectId(userIdObj),
        quizId: validQuizId, // validQuizId is already an ObjectId
        assignmentId: validAssignmentId, // validAssignmentId is already an ObjectId
        status: 'active'
      };
    } else {
      // Look for session without assignmentId (null or doesn't exist)
      sessionQuery = {
        userId: new mongoose.Types.ObjectId(userIdObj),
        quizId: validQuizId, // validQuizId is already an ObjectId
        status: 'active',
        $or: [
          { assignmentId: { $exists: false } },
          { assignmentId: null }
        ]
      };
    }
    
    logger.debug('Searching for existing session', {
      requestId,
      sessionQuery: JSON.stringify(sessionQuery, null, 2)
    });
    
    logger.logDatabase('QuizSession.findOne', 'collection', sessionQuery, {});
    let session = await QuizSession.findOne(sessionQuery);
    
    logger.info('Session search result', {
      requestId,
      foundExisting: !!session,
      sessionId: session?._id
    });

    if (session) {
      logger.info('Found existing session', {
        requestId,
        sessionId: session._id,
        userId: req.user._id
      });
      
      // Calculate current position based on answered questions
      const currentPosition = session.responses ? session.responses.length : 0;
      logger.debug('Calculated current position', {
        requestId,
        sessionId: session._id,
        currentPosition,
        responseCount: session.responses?.length || 0
      });
      
      // Check if this is truly a resumable session (has actual progress)
      const hasProgress = session.responses && session.responses.length > 0;
      logger.debug('Session progress check', {
        requestId,
        sessionId: session._id,
        hasProgress
      });
      
      session.lastActiveTime = new Date();
      await session.save();
      
      // Sort responses by sortIndex for consistent ordering
      const sortedResponses = session.responses
        .map(response => ({
          questionId: response.questionId,
          selectedAnswers: response.selectedAnswers,
          sortIndex: response.sortIndex,
          answeredAt: response.answeredAt
        }))
        .sort((a, b) => a.sortIndex - b.sortIndex);
      
      return res.json({
        sessionId: session._id,
        currentQuestionIndex: currentPosition,
        responses: sortedResponses,
        timeRemaining: session.timeRemaining,
        isResuming: hasProgress // Only show as resuming if there's actual progress
      });
    }
    
    logger.info('Creating new quiz session', {
      requestId,
      userId: req.user._id,
      quizId
    });

    // Get quiz details for time limit
    logger.debug('Looking up quiz details', {
      requestId,
      quizId
    });
    
    logger.logDatabase('Quiz.findById', 'collection', { quizId }, {});
    const quiz = await Quiz.findById(quizId);
    
    if (!quiz) {
      logger.warn('Quiz not found', {
        requestId,
        quizId,
        userId: req.user._id
      });
      return res.status(404).json({ message: 'Quiz not found' });
    }
    
    logger.info('Quiz details retrieved', {
      requestId,
      quizId: quiz._id,
      title: quiz.quiz_title,
      timeLimit: quiz.maxTime
    });
    
    // No existing session found, create a fresh one

    // Create new session - only include assignmentId if it's valid
    logger.debug('Preparing session data', {
      requestId,
      userId: req.user._id,
      quizId,
      assignmentId: validAssignmentId,
      timeLimit: quiz.maxTime
    });
    
    const sessionData = {
      userId: userId,
      quizId: quiz._id,
      timeRemaining: quiz.maxTime * 60, // Convert minutes to seconds
      responses: [], // Start with empty responses for new session
      status: 'active',
      startTime: new Date(),
      lastActiveTime: new Date()
    };

    if (validAssignmentId) {
      sessionData.assignmentId = validAssignmentId;
    }

    logger.info('Saving new quiz session', {
      requestId,
      sessionData: {
        userId: sessionData.userId,
        quizId: sessionData.quizId,
        assignmentId: sessionData.assignmentId,
        timeRemaining: sessionData.timeRemaining
      }
    });
    
    try {
      session = new QuizSession(sessionData);
      logger.logDatabase('QuizSession.save', 'collection', { sessionId: 'new' }, {});
      await session.save();
      
      logger.info('New quiz session created successfully', {
        requestId,
        sessionId: session._id,
        userId: req.user._id,
        quizId
      });
    } catch (error) {
      logger.logError(error, req);
      
      if (error.code === 11000) {
        // Handle duplicate key error
        logger.warn('Handling duplicate key error', {
          requestId,
          userId: req.user._id,
          quizId
        });
        // Find the existing session and return it
        session = await QuizSession.findOne({
          userId: sessionData.userId,
          quizId: sessionData.quizId,
          status: 'active'
        });
        
        if (!session) {
          throw new Error('Could not find or create a valid session');
        }
      } else {
        throw error;
      }
    }

    // Calculate current position based on responses
    const currentPosition = session.responses ? session.responses.length : 0;
    
    const response = {
      sessionId: session._id,
      currentQuestionIndex: currentPosition,
      responses: session.responses || [],
      timeRemaining: session.timeRemaining,
      isResuming: false
    };
    
    logger.info('Quiz session start successful', {
      requestId,
      sessionId: session._id,
      userId: req.user._id,
      currentPosition,
      timeRemaining: session.timeRemaining,
      isResuming: false
    });
    
    res.json(response);

  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @swagger
 * /api/quiz-sessions/{sessionId}/progress:
 *   get:
 *     summary: Get quiz session progress
 *     tags: [Quiz Sessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Quiz session ID
 *     responses:
 *       200:
 *         description: Session progress retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sessionId:
 *                   type: string
 *                 responses:
 *                   type: array
 *                   items:
 *                     type: object
 *                 timeRemaining:
 *                   type: number
 *                 status:
 *                   type: string
 *                 lastActiveTime:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: Session not found or expired
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/:sessionId/progress', verifyToken, async (req, res) => {
  const requestId = req.requestId;
  logger.logRequest(requestId, 'GET', `/api/quiz-sessions/${req.params.sessionId}/progress`, req.user?._id);
  
  logger.info('Quiz session progress retrieval', {
    requestId,
    sessionId: req.params.sessionId,
    userId: req.user._id
  });
  
  try {
    const { sessionId } = req.params;
    const userId = req.user._id;

    const session = await QuizSession.findOne({
      _id: sessionId,
      userId,
      status: 'active'
    }).populate({
      path: 'responses.questionId',
      select: 'sortIndex'
    });

    if (!session) {
      logger.warn('Session not found for progress retrieval', {
        requestId,
        sessionId: req.params.sessionId,
        userId: req.user._id
      });
      return res.status(404).json({ message: 'Session not found or expired' });
    }

    // Sort responses by sortIndex to maintain original question order
    const sortedResponses = session.responses
      .map(response => ({
        questionId: response.questionId._id,
        selectedAnswers: response.selectedAnswers,
        sortIndex: response.questionId.sortIndex,
        answeredAt: response.answeredAt
      }))
      .sort((a, b) => a.sortIndex - b.sortIndex);

    res.json({
      sessionId: session._id,
      responses: sortedResponses,
      timeRemaining: session.timeRemaining,
      status: session.status,
      lastActiveTime: session.lastActiveTime
    });

    logger.info('Session progress retrieved successfully', {
      requestId,
      sessionId: session._id,
      userId: req.user._id,
      responseCount: sortedResponses.length,
      timeRemaining: session.timeRemaining
    });

  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/quiz-sessions/{sessionId}/progress:
 *   put:
 *     summary: Update quiz session progress
 *     tags: [Quiz Sessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Quiz session ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               responses:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     questionId:
 *                       type: string
 *                     selectedAnswers:
 *                       type: array
 *                       items:
 *                         type: string
 *                     sortIndex:
 *                       type: number
 *               timeRemaining:
 *                 type: number
 *     responses:
 *       200:
 *         description: Session progress updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *       404:
 *         description: Session not found or expired
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.put('/:sessionId/progress', verifyToken, async (req, res) => {
  const requestId = req.requestId;
  logger.logRequest(requestId, 'PUT', `/api/quiz-sessions/${req.params.sessionId}/progress`, req.user?._id);
  
  logger.info('Quiz session progress update', {
    requestId,
    sessionId: req.params.sessionId,
    userId: req.user._id,
    responseCount: req.body.responses?.length || 0,
    timeRemaining: req.body.timeRemaining
  });
  
  try {
    const { sessionId } = req.params;
    const { responses, timeRemaining } = req.body; // Removed currentQuestionIndex
    const userId = req.user._id;

    const session = await QuizSession.findOne({
      _id: sessionId,
      userId,
      status: 'active'
    });

    if (!session) {
      logger.warn('Session not found for progress update', {
        requestId,
        sessionId: req.params.sessionId,
        userId: req.user._id
      });
      return res.status(404).json({ message: 'Session not found or expired' });
    }

    // Update session responses with new array structure
    if (Array.isArray(responses)) {
      logger.debug('Processing responses for session update', {
        requestId,
        sessionId: req.params.sessionId,
        responseCount: responses.length
      });
      
      for (const response of responses) {
        if (response.questionId) {
          // Ensure selectedAnswers is an array
          let selectedAnswers = response.selectedAnswers;
          if (selectedAnswers && !Array.isArray(selectedAnswers)) {
            selectedAnswers = [selectedAnswers];
          } else if (!selectedAnswers) {
            selectedAnswers = [];
          }
          
          // Find existing response or create new one
          const existingIndex = session.responses.findIndex(
            r => r.questionId.toString() === response.questionId.toString()
          );
          
          const responseData = {
            questionId: response.questionId,
            selectedAnswers,
            sortIndex: response.sortIndex,
            answeredAt: existingIndex >= 0 ? session.responses[existingIndex].answeredAt : new Date()
          };
          
          if (existingIndex >= 0) {
            // Update existing response
            logger.debug('Updating existing response', {
              requestId,
              questionId: response.questionId,
              sessionId: req.params.sessionId
            });
            session.responses[existingIndex] = responseData;
          } else {
            // Add new response
            logger.debug('Adding new response', {
              requestId,
              questionId: response.questionId,
              sessionId: req.params.sessionId
            });
            session.responses.push(responseData);
          }
        }
      }
    }
    
    session.timeRemaining = timeRemaining;
    session.lastActiveTime = new Date();

    logger.logDatabase('QuizSession.save', 'collection', { sessionId: session._id }, {});
    await session.save();
    
    logger.info('Quiz session progress updated successfully', {
      requestId,
      sessionId: session._id,
      userId: req.user._id,
      responseCount: session.responses.length,
      timeRemaining: session.timeRemaining
    });

    res.json({ success: true });

  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/quiz-sessions/{sessionId}/complete:
 *   post:
 *     summary: Complete quiz session and calculate results
 *     tags: [Quiz Sessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Quiz session ID
 *     responses:
 *       200:
 *         description: Session completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 resultId:
 *                   type: string
 *                 score:
 *                   type: number
 *                 correctCount:
 *                   type: number
 *                 totalQuestions:
 *                   type: number
 *                 alreadyCompleted:
 *                   type: boolean
 *       404:
 *         description: Session or quiz not found
 *       400:
 *         description: Session is not active
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/:sessionId/complete', verifyToken, async (req, res) => {
  const requestId = req.requestId;
  logger.logRequest(requestId, 'POST', `/api/quiz-sessions/${req.params.sessionId}/complete`, req.user?._id);
  
  logger.info('Quiz session completion started', {
    requestId,
    sessionId: req.params.sessionId,
    userId: req.user._id
  });
  
  try {
    const { sessionId } = req.params;
    const userId = req.user._id;
    
    logger.debug('Session lookup params', {
      requestId,
      sessionId,
      userId: userId.toString()
    });

    // First, try to find the session regardless of status
    const anySession = await QuizSession.findOne({
      _id: new mongoose.Types.ObjectId(sessionId),
      userId: new mongoose.Types.ObjectId(userId)
    });
    
    if (anySession) {
      logger.debug('Session found', {
        requestId,
        sessionId: anySession._id.toString(),
        userId: anySession.userId.toString(),
        status: anySession.status
      });
    } else {
      logger.warn('Session not found', {
        requestId,
        sessionId,
        userId: userId.toString()
      });
    }

    if (!anySession) {
      logger.warn('Session not found for completion', {
        requestId,
        sessionId,
        userId: userId.toString()
      });
      return res.status(404).json({ message: 'Session not found' });
    }

    // If session is already completed, return the existing result
    if (anySession.status === 'completed') {
      logger.info('Session already completed, finding existing result', {
        requestId,
        sessionId: anySession._id.toString(),
        userId: userId.toString()
      });
      const existingResult = await QuizResult.findOne({
        userId: userId,
        quizId: anySession.quizId
      }).sort({ createdAt: -1 });
      
      if (existingResult) {
        logger.info('Found existing result for completed session', {
          requestId,
          resultId: existingResult._id.toString(),
          score: existingResult.score,
          sessionId: anySession._id.toString()
        });
        return res.json({ 
          success: true,
          resultId: existingResult._id,
          score: existingResult.score,
          correctCount: existingResult.correctCount,
          totalQuestions: existingResult.totalQuestions,
          alreadyCompleted: true
        });
      }
    }

    // If session is not active, return error
    if (anySession.status !== 'active') {
      logger.warn('Session is not active for completion', {
        requestId,
        sessionId: anySession._id.toString(),
        currentStatus: anySession.status,
        userId: userId.toString()
      });
      return res.status(400).json({ 
        message: `Session is ${anySession.status}`, 
        status: anySession.status 
      });
    }

    const session = anySession;

    // Get quiz details for scoring
    logger.logDatabase('FIND', 'collection', 'Quiz', session.quizId, {});
    const quiz = await Quiz.findById(session.quizId);
    if (!quiz) {
      logger.warn('Quiz not found for session completion', {
        requestId,
        quizId: session.quizId.toString(),
        sessionId: session._id.toString()
      });
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Get questions for this quiz
    // quizId is now standardized as ObjectId
    logger.logDatabase('FIND', 'collection', 'Question', { quizId: session.quizId }, {});
    let questions = await Question.find({ quizId: session.quizId }).sort({ sortIndex: 1 });
    
    if (!questions || questions.length === 0) {
      logger.warn('No questions found for quiz completion', {
        requestId,
        quizId: session.quizId.toString(),
        sessionId: session._id.toString()
      });
      return res.status(404).json({ message: 'No questions found for this quiz' });
    }
    
    logger.debug('Questions loaded for scoring', {
      requestId,
      questionCount: questions.length,
      quizId: session.quizId.toString()
    });

    // Calculate scoring from session responses
    const responses = session.responses || [];
    let correctCount = 0;
    let incorrectCount = 0;
    let unattemptedCount = 0;
    
    const resultResponses = [];
    
    // Create a map for quick response lookup by questionId
    const responseMap = new Map();
    responses.forEach(response => {
      responseMap.set(response.questionId.toString(), response);
    });
    
    // Process each question
    questions.forEach((question, index) => {
      const response = responseMap.get(question._id.toString());
      
      if (response) {
        // Ensure selectedAnswers is an array
        let selectedAnswers = [];
        if (response.selectedAnswers) {
          selectedAnswers = Array.isArray(response.selectedAnswers) ? 
            response.selectedAnswers : [response.selectedAnswers];
        }
        
        // Calculate isCorrect by comparing with question's correct answers
        const correctAnswers = question.correct_answer || [];
        let isCorrect = false;
        if (question.type === 'sequence') {
          // For sequence questions, order matters - compare arrays directly
          isCorrect = selectedAnswers.length > 0 && 
            correctAnswers.length > 0 &&
            selectedAnswers.length === correctAnswers.length &&
            selectedAnswers.every((answer, index) => answer === correctAnswers[index]);
        } else if (question.type === 'matching') {
          // For matching questions, handle both "1D" and "D1" formats
          isCorrect = selectedAnswers.length > 0 && 
            correctAnswers.length > 0 &&
            selectedAnswers.length === correctAnswers.length &&
            selectedAnswers.every(selected => {
              return correctAnswers.some(correct => {
                const selectedStr = String(selected);
                const correctStr = String(correct);
                // Check both original and reversed formats
                if (selectedStr.length === 2 && correctStr.length === 2) {
                  return selectedStr === correctStr || 
                         selectedStr === correctStr[1] + correctStr[0];
                }
                return selectedStr === correctStr;
              });
            });
        } else {
          // For other question types, just check if all selected answers are in correct answers
          isCorrect = selectedAnswers.length > 0 && 
            correctAnswers.length > 0 &&
            selectedAnswers.length === correctAnswers.length &&
            selectedAnswers.every(answer => correctAnswers.includes(answer));
        }
        
        logger.debug('Question scoring result', {
          requestId,
          questionId: question._id.toString(),
          selectedAnswers: selectedAnswers.join(','),
          correctAnswers: correctAnswers.join(','),
          isCorrect,
          questionType: question.type
        });
        
        if (isCorrect) {
          correctCount++;
        } else {
          incorrectCount++;
        }
        
        resultResponses.push({
          questionId: question._id,
          selectedAnswers: selectedAnswers,
          isCorrect: isCorrect
        });
      } else {
        // Unattempted question
        unattemptedCount++;
        resultResponses.push({
          questionId: question._id,
          selectedAnswers: [],
          isCorrect: false
        });
      }
    });

    const totalQuestions = questions.length;
    const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
    const duration = Math.floor((new Date() - session.startTime) / 1000); // in seconds
    
    logger.info('Quiz scoring completed', {
      requestId,
      sessionId: session._id.toString(),
      totalQuestions,
      correctCount,
      incorrectCount,
      unattemptedCount,
      score,
      duration
    });

    // Create quiz result and mark session as completed in a transaction-like approach
    let quizResult;
    try {
      // Create and save quiz result first
      quizResult = new QuizResult({
        quizId: session.quizId,
        userId: userId,
        assignmentId: session.assignmentId && session.assignmentId !== 'default' ? session.assignmentId : undefined,
        score: score,
        duration: duration,
        correctCount: correctCount,
        incorrectCount: incorrectCount,
        unattemptedCount: unattemptedCount,
        totalQuestions: totalQuestions,
        responses: resultResponses,
        startTime: session.startTime,
        endTime: new Date()
      });

      logger.logDatabase('CREATE', 'collection', 'QuizResult', quizResult._id, {});
      await quizResult.save();
      
      logger.info('Quiz result created successfully', {
        requestId,
        resultId: quizResult._id.toString(),
        score,
        correctCount,
        totalQuestions,
        sessionId: session._id.toString()
      });

      // Handle potential duplicate completed sessions due to unique index
      // First, remove any existing completed sessions for this user/quiz/assignment
      logger.logDatabase('DELETE_MANY', 'collection', 'QuizSession', {
        userId: session.userId,
        quizId: session.quizId,
        assignmentId: session.assignmentId,
        status: 'completed'
      }, {});
      const deleteResult = await QuizSession.deleteMany({
        userId: session.userId,
        quizId: session.quizId,
        assignmentId: session.assignmentId,
        status: 'completed',
        _id: { $ne: session._id } // Don't delete the current session
      });
      
      logger.debug('Cleaned up existing completed sessions', {
        requestId,
        deletedCount: deleteResult.deletedCount,
        sessionId: session._id.toString()
      });

      // Only mark session as completed after quiz result is successfully saved
      session.status = 'completed';
      logger.logDatabase('UPDATE', 'collection', 'QuizSession', session._id, {});
      await session.save();
      
      logger.info('Quiz session marked as completed', {
        requestId,
        sessionId: session._id.toString(),
        userId: session.userId.toString()
      });
      
      // Mark assignment as completed for this specific student
      if (session.assignmentId && session.assignmentId !== 'default') {
        try {
          logger.debug('Updating assignment status for student', {
            requestId,
            studentId: session.userId.toString(),
            assignmentId: session.assignmentId.toString(),
            sessionId: session._id.toString()
          });
          
          const updateResult = await Assignment.findOneAndUpdate(
            { 
              _id: new mongoose.Types.ObjectId(session.assignmentId),
              'assignedTo.studentId': new mongoose.Types.ObjectId(session.userId)
            },
            { 
              '$set': { 'assignedTo.$.status': 'completed' } 
            },
            { new: true }
          );
          
          if (updateResult) {
            logger.info('Assignment marked as completed for student', {
              requestId,
              assignmentId: session.assignmentId.toString(),
              studentId: session.userId.toString(),
              sessionId: session._id.toString()
            });
            
            // Check if all students have completed the assignment and update global status
            const assignment = await Assignment.findById(session.assignmentId);
            if (assignment) {
              const allCompleted = assignment.assignedTo.every(student => student.status === 'completed');
              if (allCompleted && assignment.status !== 'completed') {
                logger.logDatabase('UPDATE', 'collection', 'Assignment', session.assignmentId, {});
                await Assignment.findByIdAndUpdate(
                  session.assignmentId,
                  { status: 'completed' },
                  { new: true }
                );
                logger.info('Assignment marked as fully completed', {
                  requestId,
                  assignmentId: session.assignmentId.toString(),
                  message: 'All students finished'
                });
              }
            }
          } else {
            logger.warn('No assignment found to update for student', {
              requestId,
              studentId: session.userId.toString(),
              assignmentId: session.assignmentId.toString()
            });
          }
        } catch (assignmentError) {
          logError(requestId, assignmentError, 'Error updating assignment status', {
            assignmentId: session.assignmentId?.toString(),
            studentId: session.userId.toString()
          });
          logger.error('Error updating assignment status', {
            requestId,
            assignmentId: session.assignmentId?.toString(),
            studentId: session.userId.toString(),
            error: assignmentError.message,
            stack: assignmentError.stack
          });
          // Don't throw here - session completion is more important
        }
      }
      
    } catch (resultError) {
      logError(requestId, resultError, 'Error saving quiz result', {
        sessionId: session._id.toString(),
        userId: session.userId.toString()
      });
      logger.error('Error saving quiz result', {
        requestId,
        sessionId: session._id.toString(),
        userId: session.userId.toString(),
        error: resultError.message,
        stack: resultError.stack
      });
      // If quiz result creation fails, don't mark session as completed
      throw new Error(`Failed to save quiz result: ${resultError.message}`);
    }

    logger.info('Quiz session completion successful', {
      requestId,
      sessionId: session._id.toString(),
      resultId: quizResult._id.toString(),
      score,
      correctCount,
      totalQuestions
    });
    
    res.json({ 
      success: true,
      resultId: quizResult._id,
      score: score,
      correctCount: correctCount,
      totalQuestions: totalQuestions
    });

  } catch (error) {
    logError(requestId, error, 'Quiz session completion failed', {
      sessionId: req.params.sessionId,
      userId: req.user?._id?.toString()
    });
    logger.error('Quiz session completion error', {
      requestId,
      sessionId: req.params.sessionId,
      userId: req.user?._id?.toString(),
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @swagger
 * /api/quiz-sessions/clear:
 *   delete:
 *     summary: Clear all active sessions for a user (for testing/debugging)
 *     tags: [Quiz Sessions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All active sessions cleared successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.delete('/clear', verifyToken, async (req, res) => {
  const requestId = req.requestId;
  logger.info('HTTP Request', {
    requestId,
    method: 'DELETE',
    url: '/api/quiz-sessions/clear',
    userId: req.user?._id
  });
  
  try {
    const userId = req.user._id;
    
    logger.logDatabase('UPDATE_MANY', 'collection', 'QuizSession', { userId, status: 'active' }, {});
    const updateResult = await QuizSession.updateMany(
      { userId, status: 'active' },
      { status: 'expired' }
    );
    
    logger.info('Cleared all active sessions for user', {
      requestId,
      userId: userId.toString(),
      clearedCount: updateResult.modifiedCount
    });
    
    res.json({ message: 'All active sessions cleared' });
  } catch (error) {
    logError(requestId, error, 'Error clearing sessions', {
      userId: req.user?._id?.toString()
    });
    logger.error('Error clearing sessions', {
      requestId,
      userId: req.user?._id?.toString(),
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;