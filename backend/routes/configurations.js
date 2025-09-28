const express = require('express');
const router = express.Router();
const Configuration = require('../models/Configuration');
const { verifyToken, verifyCoach } = require('../middleware/auth');
const logger = require('../utils/logger');

/**
 * @swagger
 * components:
 *   schemas:
 *     DifficultyGrade:
 *       type: object
 *       properties:
 *         number:
 *           type: number
 *           minimum: 1
 *         color:
 *           type: string
 *           pattern: '^#[0-9A-F]{6}$'
 *         level:
 *           type: string
 *         skill:
 *           type: array
 *           items:
 *             type: string
 *         matchingEventType:
 *           type: string
 *     Configuration:
 *       type: object
 *       properties:
 *         eventTypes:
 *           type: array
 *           items:
 *             type: string
 *         gameTypes:
 *           type: array
 *           items:
 *             type: string
 *         classes:
 *           type: array
 *           items:
 *             type: string
 *         difficultyGrades:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/DifficultyGrade'
 *         orgs:
 *           type: array
 *           items:
 *             type: string
 */

/**
 * @swagger
 * /api/configurations:
 *   get:
 *     summary: Get system configurations
 *     tags: [Configurations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Configuration retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Configuration'
 *       500:
 *         description: Server error
 */
router.get('/', verifyToken, async (req, res) => {
  const requestId = req.requestId;
  logger.info('HTTP Request', {
    requestId,
    method: 'GET',
    url: '/api/configurations',
    userId: req.user._id
  });

  try {
    const config = await Configuration.getSingleton();
    
    logger.info('Configuration retrieved successfully', {
      requestId,
      userId: req.user._id
    });

    res.json(config);
  } catch (error) {
    console.error('Get configuration error:', error);
    logger.error('Get configuration failed', {
      requestId,
      error: error.message,
      stack: error.stack
    });
    
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @swagger
 * /api/configurations:
 *   put:
 *     summary: Update system configurations (Coach only)
 *     tags: [Configurations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Configuration'
 *     responses:
 *       200:
 *         description: Configuration updated successfully
 *       403:
 *         description: Access denied - Coach role required
 *       400:
 *         description: Validation error
 *       500:
 *         description: Server error
 */
router.put('/', verifyToken, verifyCoach, async (req, res) => {
  const requestId = req.requestId;
  logger.info('HTTP Request', {
    requestId,
    method: 'PUT',
    url: '/api/configurations',
    userId: req.user._id,
    body: req.body
  });

  try {
    const { eventTypes, gameTypes, classes, difficultyGrades, orgs } = req.body;

    // Validate required fields
    if (!eventTypes || !gameTypes || !classes || !difficultyGrades || !orgs) {
      return res.status(400).json({ 
        message: '缺少必需的配置字段' 
      });
    }

    // Check for duplicates in simple arrays
    const checkDuplicates = (arr, fieldName) => {
      const seen = new Set();
      for (const item of arr) {
        const trimmed = item.trim().toLowerCase();
        if (seen.has(trimmed)) {
          return `${fieldName}中存在重复项: ${item}`;
        }
        seen.add(trimmed);
      }
      return null;
    };

    // Check duplicates for simple arrays
    const duplicateChecks = [
      { data: eventTypes, name: '赛事类型' },
      { data: gameTypes, name: '比赛项目' },
      { data: classes, name: '参赛组别' },
      { data: orgs, name: '主办方' }
    ];

    for (const check of duplicateChecks) {
      const duplicateError = checkDuplicates(check.data, check.name);
      if (duplicateError) {
        return res.status(400).json({ message: duplicateError });
      }
    }

    // Validate difficulty grades structure and check for duplicates
    const seenLevels = new Set();
    const seenNumbers = new Set();
    
    for (const grade of difficultyGrades) {
      if (!grade.number || !grade.color || !grade.level || !Array.isArray(grade.skill)) {
        return res.status(400).json({ 
          message: '难度等级配置格式不正确' 
        });
      }
      
      // Validate hex color format
      if (!/^#[0-9A-F]{6}$/i.test(grade.color)) {
        return res.status(400).json({ 
          message: `无效的颜色格式: ${grade.color}` 
        });
      }

      // Check for duplicate level names
      const levelKey = grade.level.trim().toLowerCase();
      if (seenLevels.has(levelKey)) {
        return res.status(400).json({ 
          message: `难度等级中存在重复的等级名称: ${grade.level}` 
        });
      }
      seenLevels.add(levelKey);

      // Check for duplicate numbers
      if (seenNumbers.has(grade.number)) {
        return res.status(400).json({ 
          message: `难度等级中存在重复的等级编号: ${grade.number}` 
        });
      }
      seenNumbers.add(grade.number);
    }

    const config = await Configuration.getSingleton();
    
    // Update configuration
    config.eventTypes = eventTypes;
    config.gameTypes = gameTypes;
    config.classes = classes;
    config.difficultyGrades = difficultyGrades;
    config.orgs = orgs;
    
    await config.save();
    
    logger.info('Configuration updated successfully', {
      requestId,
      userId: req.user._id,
      updatedFields: Object.keys(req.body)
    });

    res.json({ 
      message: '配置更新成功',
      configuration: config
    });
  } catch (error) {
    console.error('Update configuration error:', error);
    logger.error('Update configuration failed', {
      requestId,
      error: error.message,
      stack: error.stack
    });
    
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @swagger
 * /api/configurations/{section}:
 *   put:
 *     summary: Update specific configuration section (Coach only)
 *     tags: [Configurations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: section
 *         required: true
 *         schema:
 *           type: string
 *           enum: [eventTypes, gameTypes, classes, difficultyGrades, orgs]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               data:
 *                 type: array
 *     responses:
 *       200:
 *         description: Configuration section updated successfully
 *       403:
 *         description: Access denied - Coach role required
 *       400:
 *         description: Invalid section or data
 *       500:
 *         description: Server error
 */
router.put('/:section', verifyToken, verifyCoach, async (req, res) => {
  const requestId = req.requestId;
  const { section } = req.params;
  const { data } = req.body;
  
  logger.info('HTTP Request', {
    requestId,
    method: 'PUT',
    url: `/api/configurations/${section}`,
    userId: req.user._id,
    section,
    dataLength: Array.isArray(data) ? data.length : 'not array'
  });

  try {
    const validSections = ['eventTypes', 'gameTypes', 'classes', 'difficultyGrades', 'orgs'];
    
    if (!validSections.includes(section)) {
      return res.status(400).json({ 
        message: `无效的配置部分: ${section}` 
      });
    }

    if (!Array.isArray(data)) {
      return res.status(400).json({ 
        message: '数据必须是数组格式' 
      });
    }

    // Check for duplicates based on section type
    if (section === 'difficultyGrades') {
      const seenLevels = new Set();
      const seenNumbers = new Set();
      
      for (const grade of data) {
        if (!grade.number || !grade.color || !grade.level || !Array.isArray(grade.skill)) {
          return res.status(400).json({ 
            message: '难度等级配置格式不正确' 
          });
        }
        
        // Validate hex color format
        if (!/^#[0-9A-F]{6}$/i.test(grade.color)) {
          return res.status(400).json({ 
            message: `无效的颜色格式: ${grade.color}` 
          });
        }

        // Check for duplicate level names
        const levelKey = grade.level.trim().toLowerCase();
        if (seenLevels.has(levelKey)) {
          return res.status(400).json({ 
            message: `难度等级中存在重复的等级名称: ${grade.level}` 
          });
        }
        seenLevels.add(levelKey);

        // Check for duplicate numbers
        if (seenNumbers.has(grade.number)) {
          return res.status(400).json({ 
            message: `难度等级中存在重复的等级编号: ${grade.number}` 
          });
        }
        seenNumbers.add(grade.number);
      }
    } else {
      // Check for duplicates in simple arrays
      const seen = new Set();
      for (const item of data) {
        const trimmed = item.trim().toLowerCase();
        if (seen.has(trimmed)) {
          const sectionNames = {
            eventTypes: '赛事类型',
            gameTypes: '比赛项目', 
            classes: '参赛组别',
            orgs: '主办方'
          };
          return res.status(400).json({ 
            message: `${sectionNames[section]}中存在重复项: ${item}` 
          });
        }
        seen.add(trimmed);
      }
    }

    const config = await Configuration.getSingleton();
    config[section] = data;
    await config.save();
    
    logger.info('Configuration section updated successfully', {
      requestId,
      userId: req.user._id,
      section,
      itemCount: data.length
    });

    res.json({ 
      message: `${section} 配置更新成功`,
      [section]: data
    });
  } catch (error) {
    console.error('Update configuration section error:', error);
    logger.error('Update configuration section failed', {
      requestId,
      section,
      error: error.message,
      stack: error.stack
    });
    
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;