const express = require('express');
const QuizResult = require('../models/QuizResult');
const Question = require('../models/Question');
const { verifyToken } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     QuizResponse:
 *       type: object
 *       properties:
 *         questionId:
 *           type: string
 *           description: ID of the question
 *         selectedAnswers:
 *           type: array
 *           items:
 *             type: string
 *           description: Selected answers for the question
 *         isCorrect:
 *           type: boolean
 *           description: Whether the answer is correct
 *     QuizResult:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Result ID
 *         quizId:
 *           type: string
 *           description: Quiz ID
 *         userId:
 *           type: string
 *           description: User ID
 *         score:
 *           type: number
 *           description: Quiz score percentage
 *         duration:
 *           type: number
 *           description: Time taken in seconds
 *         correctCount:
 *           type: number
 *           description: Number of correct answers
 *         incorrectCount:
 *           type: number
 *           description: Number of incorrect answers
 *         unattemptedCount:
 *           type: number
 *           description: Number of unattempted questions
 *         totalQuestions:
 *           type: number
 *           description: Total number of questions
 *         responses:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/QuizResponse'
 *         startTime:
 *           type: string
 *           format: date-time
 *         endTime:
 *           type: string
 *           format: date-time
 *         createdAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/results/submit:
 *   post:
 *     summary: Submit quiz results
 *     tags: [Results]
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
 *               - responses
 *               - startTime
 *               - endTime
 *             properties:
 *               quizId:
 *                 type: string
 *                 description: ID of the quiz
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
 *               startTime:
 *                 type: string
 *                 format: date-time
 *               endTime:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Quiz results submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 resultId:
 *                   type: string
 *                 score:
 *                   type: number
 *                 correctCount:
 *                   type: number
 *                 incorrectCount:
 *                   type: number
 *                 duration:
 *                   type: number
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/submit', verifyToken, async (req, res) => {
  const requestId = req.requestId;
  logger.info('HTTP Request', {
    requestId,
    method: 'POST',
    url: '/api/results/submit',
    userId: req.user?.id
  });
  
  try {
    const { quizId, responses, startTime, endTime } = req.body;
    logger.info('Quiz results submission started', {
      requestId,
      userId: req.user._id,
      quizId,
      responseCount: responses?.length,
      startTime,
      endTime
    });
    
    // Get all questions for this quiz
    logger.logDatabase('Question.find', 'collection', { quizId }, {});
    const questions = await Question.find({ quizId });
    logger.info('Questions retrieved for quiz', {
      requestId,
      quizId,
      questionCount: questions.length
    });
    
    // Calculate score
    let correctCount = 0;
    const processedResponses = [];
    
    logger.debug('Score calculation initialized', {
      requestId,
      correctCount,
      totalQuestions: questions.length
    });
    
    // Sort questions by sortIndex to maintain order
    const sortedQuestions = questions.sort((a, b) => a.sortIndex - b.sortIndex);
    
    for (let i = 0; i < sortedQuestions.length; i++) {
      const question = sortedQuestions[i];
      // 安全地获取问题ID
      let questionId = null;
      if (question._id) {
        questionId = question._id.$oid ? question._id.$oid : question._id.toString();
      }
      logger.debug('Processing question', {
        requestId,
        questionIndex: i + 1,
        questionId,
        questionType: question.type
      });
      
      // 安全地查找响应
      const response = questionId ? responses.find(r => {
        // 处理不同格式的questionId
        if (r.questionId && r.questionId.$oid) {
          return r.questionId.$oid === questionId;
        }
        return r.questionId === questionId;
      }) : null;
      
      let selectedAnswers = [];
      let isCorrect = false;
      
      if (response && response.selectedAnswers) {
        selectedAnswers = response.selectedAnswers;
        logger.debug('Question response found', {
          requestId,
          questionIndex: i + 1,
          questionType: question.type,
          selectedAnswers,
          correctAnswers: question.correct_answer
        });
        
        // 确保correct_answer存在
        const correctAnswers = question.correct_answer || [];
        
        // Special handling for empty answers
        if (selectedAnswers.length === 0 && correctAnswers.length === 0) {
          isCorrect = true;
          logger.debug('Question marked correct - no answers required', {
            requestId,
            questionIndex: i + 1
          });
        } else if (selectedAnswers.length > 0) {
          if (question.type === 'sequence') {
            // For sequence questions, order matters - compare arrays directly
            isCorrect = selectedAnswers.length === correctAnswers.length &&
              selectedAnswers.every((answer, index) => answer === correctAnswers[index]);
          } else if (question.type === 'matching') {
            // For matching questions, use special matching logic that handles both "1D" and "D1" formats
            isCorrect = arraysEqualForMatching(
              selectedAnswers,
              correctAnswers
            );
          } else {
            // For other question types, use the existing arraysEqual function
            isCorrect = arraysEqual(
              selectedAnswers,
              correctAnswers
            );
          }
          logger.debug('Question answer evaluated', {
            requestId,
            questionIndex: i + 1,
            questionType: question.type,
            isCorrect,
            selectedCount: selectedAnswers.length,
            correctCount: correctAnswers.length
          });
        }
        
        if (isCorrect) correctCount++;
      } else {
        logger.warn('No response found for question', {
          requestId,
          questionIndex: i + 1,
          questionId
        });
      }
      
      // Handle case where no answer was selected
      const correctAnswers = question.correct_answer || [];
      if (selectedAnswers.length === 0 && correctAnswers.length === 0) {
        isCorrect = true; // If both are empty, it's correct
      }
      
      // 安全地获取问题文本和类型
      const questionText = question.question_text || `Question ${i+1}`;
      const questionType = question.type || 'unknown';
      // 使用之前定义的correctAnswers和questionId
      
      processedResponses.push({
        question: questionText,
        questionId: questionId,
        questionOrder: i,
        selectedAnswers,
        type: questionType,
        correctAnswers: correctAnswers,
        isCorrect
      });
      
      logger.debug('Question processing completed', {
        requestId,
        questionIndex: i + 1,
        questionId: question._id ? question._id.toString() : 'unknown',
        type: question.type || 'unknown',
        selectedAnswers,
        isCorrect
      });
    }
    
    const totalQuestions = questions.length;
    const incorrectCount = processedResponses.filter(r => !r.isCorrect && r.selectedAnswers.length > 0).length;
    const unattemptedCount = processedResponses.filter(r => r.selectedAnswers.length === 0).length;
    
    // Debug score calculation values
    logger.debug('Score calculation debug', {
      requestId,
      correctCount,
      correctCountType: typeof correctCount,
      totalQuestions,
      totalQuestionsType: typeof totalQuestions,
      isNaNCorrectCount: isNaN(correctCount)
    });
    
    // Ensure safe score calculation to avoid NaN
    let score = 0;
    if (totalQuestions > 0 && typeof correctCount === 'number' && !isNaN(correctCount)) {
      score = Math.round((correctCount / totalQuestions) * 100);
      logger.debug('Score calculated successfully', { requestId, score });
    } else {
      logger.warn('Using default score due to invalid data', {
        requestId,
        totalQuestions,
        correctCount,
        correctCountType: typeof correctCount
      });
    }
    
    const duration = Math.floor((new Date(endTime) - new Date(startTime)) / 1000);
    
    logger.info('Quiz submission summary', {
      requestId,
      userId: req.user._id,
      quizId,
      totalQuestions,
      correctCount,
      incorrectCount,
      unattemptedCount,
      score,
      duration
    });
    
    // Save result
    // 确保responses中的questionId字段是MongoDB ObjectId类型
    const cleanedResponses = processedResponses.map(response => {
      // 只保留QuizResult模型中定义的字段
      return {
        questionId: response.questionId, // 这应该是ObjectId字符串
        selectedAnswers: response.selectedAnswers,
        isCorrect: response.isCorrect
      };
    });
    
    logger.debug('Responses cleaned for database save', {
      requestId,
      responseCount: cleanedResponses.length
    });
    
    const result = new QuizResult({
      quizId,
      userId: req.user._id,
      score,
      duration,
      correctCount,
      incorrectCount,
      unattemptedCount,
      totalQuestions,
      responses: cleanedResponses,
      startTime: new Date(startTime),
      endTime: new Date(endTime)
    });
    
    logger.logDatabase('QuizResult.save', 'collection', { userId: req.user._id, quizId }, {});
    await result.save();
    
    logger.info('Quiz result saved successfully', {
      requestId,
      resultId: result._id,
      userId: req.user._id,
      quizId,
      score
    });
    
    res.json({
      resultId: result._id,
      score,
      correctCount,
      incorrectCount,
      duration
    });
  } catch (error) {
    logger.logError(error, req);
    
    // Provide more detailed error message
    let errorMessage = 'Server error';
    if (error.name === 'ValidationError') {
      errorMessage = `Validation error: ${Object.values(error.errors).map(e => e.message).join(', ')}`;
      logger.error('Validation error in quiz submission', {
        requestId,
        validationErrors: error.errors
      });
    } else if (error.name === 'CastError') {
      errorMessage = `Invalid ID format: ${error.value}`;
      logger.error('Cast error in quiz submission', {
        requestId,
        invalidValue: error.value,
        path: error.path
      });
    }
    
    res.status(500).json({ message: errorMessage, error: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
});

/**
 * @swagger
 * /api/results/student:
 *   get:
 *     summary: Get quiz results for logged-in student
 *     tags: [Results]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Student's quiz results retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/QuizResult'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/student', verifyToken, async (req, res) => {
  const requestId = req.requestId;
  logger.info('HTTP Request', {
    requestId,
    method: 'GET',
    url: '/api/results/student',
    userId: req.user?.id
  });
  
  try {
    logger.logDatabase('QuizResult.find', 'collection', { userId: req.user._id }, {});
    const results = await QuizResult.find({ userId: req.user._id })
      .populate('quizId', 'quiz_title quiz_title_cn category category_cn')
      .sort({ createdAt: -1 });
    
    logger.info('Student quiz results retrieved', {
      requestId,
      userId: req.user._id,
      resultCount: results.length
    });
    
    res.json(results);
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/results/{id}:
 *   delete:
 *     summary: Delete a quiz result (only by the student who took it)
 *     tags: [Results]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Quiz result ID
 *     responses:
 *       200:
 *         description: Result deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       403:
 *         description: Access denied - you can only delete your own results
 *       404:
 *         description: Result not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.delete('/:id', verifyToken, async (req, res) => {
  const requestId = req.requestId;
  logger.logRequest(requestId, 'DELETE', `/api/results/${req.params.id}`, req.user?.id);
  
  try {
    logger.logDatabase('QuizResult.findById', 'collection', { resultId: req.params.id }, {});
    const result = await QuizResult.findById(req.params.id);
    
    if (!result) {
      logger.warn('Quiz result not found for deletion', {
        requestId,
        resultId: req.params.id,
        userId: req.user._id
      });
      return res.status(404).json({ message: 'Result not found' });
    }
    
    // Check if user owns this result
    if (result.userId.toString() !== req.user._id.toString()) {
      logger.warn('Unauthorized quiz result deletion attempt', {
        requestId,
        resultId: req.params.id,
        userId: req.user._id,
        resultOwnerId: result.userId
      });
      return res.status(403).json({ message: 'Access denied - you can only delete your own results' });
    }
    
    logger.logDatabase('QuizResult.findByIdAndDelete', 'collection', { resultId: req.params.id }, {});
    await QuizResult.findByIdAndDelete(req.params.id);
    
    logger.info('Quiz result deleted successfully', {
      requestId,
      resultId: req.params.id,
      userId: req.user._id
    });
    
    res.json({ message: 'Result deleted successfully' });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/results/{id}:
 *   get:
 *     summary: Get single result with detailed answers
 *     tags: [Results]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Quiz result ID
 *     responses:
 *       200:
 *         description: Detailed quiz result retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/QuizResult'
 *       403:
 *         description: Access denied
 *       404:
 *         description: Result not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/:id', verifyToken, async (req, res) => {
  const requestId = req.requestId;
  logger.logRequest(requestId, 'GET', `/api/results/${req.params.id}`, req.user?.id);
  
  try {
    logger.info('Fetching detailed result', {
      requestId,
      resultId: req.params.id,
      userId: req.user._id
    });
    
    // 首先获取结果，不进行populate
    logger.logDatabase('QuizResult.findById', 'collection', { resultId: req.params.id }, {});
    const result = await QuizResult.findById(req.params.id)
      .populate('quizId', 'quiz_title quiz_title_cn');
    
    if (!result) {
      logger.warn('Quiz result not found', {
        requestId,
        resultId: req.params.id,
        userId: req.user._id
      });
      return res.status(404).json({ message: 'Result not found' });
    }
    
    // Check if user owns this result or is a coach
    if (result.userId.toString() !== req.user._id.toString() && req.user.role !== 'coach') {
      logger.warn('Unauthorized access to quiz result', {
        requestId,
        resultId: req.params.id,
        userId: req.user._id,
        userRole: req.user.role,
        resultOwnerId: result.userId
      });
      return res.status(403).json({ message: 'Access denied' });
    }
    
    try {
      // 获取该测验的所有问题
      // quizId is now standardized as ObjectId
      logger.debug('Fetching questions for quiz', {
        requestId,
        quizId: result.quizId._id
      });
      let questions = [];
      
      try {
        // Query using ObjectId (now standardized)
        logger.logDatabase('Question.find', 'collection', { quizId: result.quizId._id }, {});
        questions = await Question.find({ quizId: result.quizId._id })
          .select('_id question_text question_text_cn image_url options matches correct_answer explanation explanation_cn type')
          .sort({ sortIndex: 1 }); // 确保问题按照sortIndex排序
      } catch (error) {
        logger.error('Error querying questions', {
          requestId,
          quizId: result.quizId._id,
          error: error.message
        });
      }
      
      logger.info('Questions retrieved for detailed result', {
        requestId,
        quizId: result.quizId._id,
        questionCount: questions.length
      });
      
      // 为每个响应添加完整的问题详情
      const enhancedResponses = [];
      
      // 使用索引遍历responses数组
      for (let i = 0; i < result.responses.length; i++) {
        const response = result.responses[i];
        const responseObj = response.toObject();
        
        // 获取对应索引的问题（如果问题数量与响应数量相同）
        if (i < questions.length) {
          responseObj.questionId = questions[i];
        }
        
        enhancedResponses.push(responseObj);
      }
      
      // 替换原始响应
      const resultObj = result.toObject();
      resultObj.responses = enhancedResponses;
      
      // 检查是否成功添加了问题详情
      if (enhancedResponses.length > 0) {
        const firstResponse = enhancedResponses[0];
        logger.debug('Enhanced responses validation', {
          requestId,
          hasQuestionId: !!firstResponse.questionId,
          hasCorrectAnswer: firstResponse.questionId ? !!firstResponse.questionId.correct_answer : undefined,
          hasExplanation: firstResponse.questionId ? !!firstResponse.questionId.explanation_cn : undefined
        });
      }
      
      logger.info('Detailed quiz result retrieved successfully', {
        requestId,
        resultId: req.params.id,
        userId: req.user._id,
        responseCount: resultObj.responses.length
      });
      
      return res.json(resultObj);
    } catch (error) {
       logger.logError(error, req);
       return res.status(500).json({ message: '获取测验结果详情失败' });
     }
    
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ message: 'Server error' });
  }
});

// Helper function to compare arrays for matching questions
function arraysEqualForMatching(selectedAnswers, correctAnswers) {
  console.log('🔄 Comparing matching arrays:', JSON.stringify(selectedAnswers), JSON.stringify(correctAnswers));
  
  // Handle empty arrays
  if (selectedAnswers.length === 0 && correctAnswers.length === 0) {
    console.log('🔄 Both arrays are empty, returning true');
    return true;
  }
  
  if (selectedAnswers.length !== correctAnswers.length) {
    console.log('🔄 Arrays have different lengths, returning false');
    return false;
  }
  
  // For matching questions, we need to check if each selected answer has a corresponding correct match
  // Selected answers are in format "1D", "2C", etc.
  // We need to check both "1D" and "D1" formats
  const normalizeMatch = (match) => {
    const str = String(match);
    if (str.length === 2) {
      const char1 = str[0];
      const char2 = str[1];
      // Return both possible formats as a set for comparison
      return new Set([str, char2 + char1]);
    }
    return new Set([str]);
  };
  
  // Create normalized sets for all correct answers
  const correctSets = correctAnswers.map(normalizeMatch);
  
  // Check if each selected answer matches any correct answer (in either format)
  const result = selectedAnswers.every(selected => {
    const selectedNormalized = normalizeMatch(selected);
    return correctSets.some(correctSet => {
      // Check if there's any intersection between the sets
      return [...selectedNormalized].some(s => correctSet.has(s));
    });
  });
  
  console.log('🔄 Final matching comparison result:', result);
  return result;
}

// Helper function to compare arrays for non-matching questions
function arraysEqual(a, b) {
  logger.debug('Comparing arrays for answer validation', {
    arrayA: JSON.stringify(a),
    arrayB: JSON.stringify(b)
  });
  
  // Handle empty arrays
  if (a.length === 0 && b.length === 0) {
    logger.debug('Both arrays are empty, returning true');
    return true;
  }
  
  if (a.length !== b.length) {
    logger.debug('Arrays have different lengths, returning false');
    return false;
  }
  
  // Create sorted copies of arrays to ensure order doesn't matter
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  
  // Compare each element, converting to string to handle type differences
  const result = sortedA.every((val, index) => {
    const strA = String(val).toLowerCase();
    const strB = String(sortedB[index]).toLowerCase();
    const equal = strA === strB;
    logger.debug(`Comparing ${strA} with ${strB}: ${equal ? 'match' : 'no match'}`);
    return equal;
  });
  
  logger.debug('Final comparison result:', { result });
  return result;
}

module.exports = router;