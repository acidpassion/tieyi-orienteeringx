const express = require('express');
const Quiz = require('../models/Quiz');
const Question = require('../models/Question');
const { verifyToken } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Quiz:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         quiz_title:
 *           type: string
 *         quiz_title_cn:
 *           type: string
 *         status:
 *           type: string
 *           enum: [active, inactive]
 *         createdBy:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     Question:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         quizId:
 *           type: string
 *         question:
 *           type: string
 *         options:
 *           type: array
 *           items:
 *             type: string
 *         correctAnswer:
 *           type: string
 *         sortIndex:
 *           type: number
 */

/**
 * @swagger
 * /api/quizzes:
 *   get:
 *     summary: Get all active quizzes
 *     tags: [Quizzes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of active quizzes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Quiz'
 *       500:
 *         description: Server error
 */
router.get('/', verifyToken, async (req, res) => {
  const requestId = req.requestId;
  logger.info('HTTP Request', {
    requestId,
    method: 'GET',
    url: '/api/quizzes',
    userId: req.user._id
  });
  
  try {
    logger.logDatabase('find', 'quizzes', { status: 'active' }, {});
    
    const quizzes = await Quiz.find({ status: 'active' })
      .populate('createdBy', 'username')
      .sort({ createdAt: -1 });

    logger.info('Active quizzes retrieved successfully', {
      requestId,
      quizCount: quizzes.length,
      userId: req.user._id,
      quizTitles: quizzes.map(q => q.quiz_title)
    });

    res.json(quizzes);
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/quizzes/{id}:
 *   get:
 *     summary: Get single quiz with questions
 *     tags: [Quizzes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Quiz ID
 *     responses:
 *       200:
 *         description: Quiz with questions
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Quiz'
 *                 - type: object
 *                   properties:
 *                     questions:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Question'
 *       404:
 *         description: Quiz not found
 *       500:
 *         description: Server error
 */
router.get('/:id', verifyToken, async (req, res) => {
  const requestId = req.requestId;
  logger.info('HTTP Request', {
    requestId,
    method: 'GET',
    url: `/api/quizzes/${req.params.id}`,
    userId: req.user._id
  });
  
  try {
    const { id } = req.params;
    
    logger.logDatabase('findById', 'quizzes', { _id: id }, {});
    
    const quiz = await Quiz.findById(id)
      .populate('createdBy', 'username');

    if (!quiz) {
      logger.warn('Quiz not found', {
        requestId,
        quizId: id,
        userId: req.user._id
      });
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Fetch questions for the quiz
    let questions = [];
    
    try {
      logger.logDatabase('find', 'questions', { quizId: quiz._id }, {});
      
      questions = await Question.find({ quizId: quiz._id })
        .sort({ sortIndex: 1 });
      
      logger.info('Quiz and questions retrieved successfully', {
        requestId,
        quizId: quiz._id,
        quizTitle: quiz.quiz_title,
        questionCount: questions.length,
        userId: req.user._id
      });
    } catch (questionError) {
      logger.error('Error fetching questions for quiz', {
        requestId,
        quizId: quiz._id,
        error: questionError.message,
        userId: req.user._id
      });
    }

    res.json({
      ...quiz.toObject(),
      questions
    });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;