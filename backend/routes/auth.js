const express = require('express');
const jwt = require('jsonwebtoken');
const Student = require('../models/Student');
const logger = require('../utils/logger');
const auth = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     LoginRequest:
 *       type: object
 *       required:
 *         - name
 *         - password
 *       properties:
 *         name:
 *           type: string
 *           description: Student name
 *         password:
 *           type: string
 *           description: Student password
 *     LoginResponse:
 *       type: object
 *       properties:
 *         token:
 *           type: string
 *           description: JWT authentication token
 *         user:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *             name:
 *               type: string
 *             username:
 *               type: string
 *             grade:
 *               type: string
 *             avatar:
 *               type: string
 *             role:
 *               type: string
 */

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Authenticate user and get JWT token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       400:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/login', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { name, password } = req.body;

    logger.logAuth('login_attempt', null, req, true, {
      providedName: name,
      hasPassword: !!password,
      passwordLength: password ? password.length : 0
    });

    // Validate input
    if (!name || !password) {
      logger.logAuth('login_failed', null, req, false, {
        reason: 'missing_credentials',
        providedName: name,
        hasPassword: !!password
      });
      return res.status(400).json({ message: 'Name and password are required' });
    }

    // Find user by name
    logger.logDatabase('findOne', 'Student', { name });
    const user = await Student.findOne({ name });

    if (!user) {
      logger.logAuth('login_failed', null, req, false, {
        reason: 'user_not_found',
        providedName: name
      });
      
      // Log available users for debugging (only in development)
      if (process.env.NODE_ENV === 'development') {
        const allUsers = await Student.find({}, 'name grade').limit(10);
        logger.info('Available users for debugging', {
          requestId: req.requestId,
          userCount: allUsers.length,
          users: allUsers.map(u => ({ name: u.name, grade: u.grade }))
        });
      }
      
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    logger.info('User found for login', {
      requestId: req.requestId,
      userId: user._id,
      userName: user.name,
      userGrade: user.grade,
      userRole: user.role,
      hasStoredPassword: !!user.password
    });

    // Check password
    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      logger.logAuth('login_failed', user._id, req, false, {
        reason: 'invalid_password',
        userName: user.name
      });
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Create JWT token
    if (!process.env.JWT_SECRET) {
      logger.error('JWT_SECRET not configured', {
        requestId: req.requestId,
        userId: user._id
      });
      return res.status(500).json({ message: 'Server configuration error' });
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '90d' }
    );

    const responseData = {
      token,
      user: {
        id: user._id,
        name: user.name,
        username: user.username || user.name,
        grade: user.grade,
        avatar: user.avatar,
        role: user.role
      }
    };

    const duration = Date.now() - startTime;
    logger.logAuth('login_success', user._id, req, true, {
      userName: user.name,
      userRole: user.role,
      duration: `${duration}ms`
    });

    res.json(responseData);
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.logError(error, req);
    logger.logAuth('login_error', null, req, false, {
      error: error.message,
      duration: `${duration}ms`
    });
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/auth/change-password:
 *   post:
 *     summary: Change user password
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - oldPassword
 *               - newPassword
 *             properties:
 *               oldPassword:
 *                 type: string
 *                 description: Current password
 *               newPassword:
 *                 type: string
 *                 description: New password
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Invalid old password or validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/change-password', auth.verifyToken, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user._id;

    logger.info('Password change attempt', {
      requestId: req.requestId,
      userId: userId,
      hasOldPassword: !!oldPassword,
      hasNewPassword: !!newPassword
    });

    // Validate input
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: 'Old password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters long' });
    }

    // Find user
    const user = await Student.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify old password
    const isOldPasswordValid = await user.comparePassword(oldPassword);
    if (!isOldPasswordValid) {
      logger.info('Password change failed - invalid old password', {
        requestId: req.requestId,
        userId: userId
      });
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    const duration = Date.now() - startTime;
    logger.info('Password changed successfully', {
      requestId: req.requestId,
      userId: userId,
      duration: `${duration}ms`
    });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.logError(error, req);
    logger.error('Password change error', {
      requestId: req.requestId,
      error: error.message,
      duration: `${duration}ms`
    });
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: Get current user profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                 name:
 *                   type: string
 *                 username:
 *                   type: string
 *                 grade:
 *                   type: string
 *                 avatar:
 *                   type: string
 *                 role:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.get('/profile', auth.verifyToken, async (req, res) => {
  try {
    const userId = req.user._id;
    
    logger.info('Profile request', {
      requestId: req.requestId,
      userId: userId
    });
    
    // Find user by ID
    const user = await Student.findById(userId).select('-password');
    
    if (!user) {
      logger.warn('User not found for profile request', {
        requestId: req.requestId,
        userId: userId
      });
      return res.status(404).json({ message: 'User not found' });
    }
    
    logger.info('Profile retrieved successfully', {
      requestId: req.requestId,
      userId: userId,
      userName: user.name
    });
    
    res.json({
      _id: user._id,
      name: user.name,
      username: user.username || user.name,
      grade: user.grade,
      avatar: user.avatar,
      role: user.role
    });
  } catch (error) {
    logger.logError(error, req);
    logger.error('Profile request error', {
      requestId: req.requestId,
      error: error.message
    });
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;