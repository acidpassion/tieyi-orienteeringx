const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Event = require('../models/Event');
const EventRegistration = require('../models/EventRegistration');
const RelayTeam = require('../models/RelayTeam');
const Student = require('../models/Student');
const { verifyToken, verifyCoach, verifyCoachOrStudent } = require('../middleware/auth');
const logger = require('../utils/logger');
const ExcelJS = require('exceljs');
const { getTeamSizeForGameType } = require('../constants/teamConstants');

/**
 * @swagger
 * components:
 *   schemas:
 *     EventRegistration:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         eventId:
 *           type: string
 *         studentId:
 *           type: string
 *         gameTypes:
 *           type: array
 *           items:
 *             type: string
 *         status:
 *           type: string
 *           enum: [pending, confirmed, cancelled]
 *         registrationDate:
 *           type: string
 *           format: date-time
 *         notes:
 *           type: string
 */

/**
 * @swagger
 * /api/registrations:
 *   post:
 *     summary: Create event registration
 *     tags: [Registrations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - eventId
 *               - gameTypes
 *             properties:
 *               eventId:
 *                 type: string
 *               gameTypes:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - name
 *                     - group
 *                   properties:
 *                     name:
 *                       type: string
 *                       description: 比赛项目名称
 *                     group:
 *                       type: string
 *                       description: 参赛组别
 *                     team:
 *                       type: object
 *                       description: 接力赛队伍信息
 *                       properties:
 *                         name:
 *                           type: string
 *                           description: 队伍名称
 *                         members:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               _id:
 *                                 type: string
 *                                 description: 学生ID
 *                               runOrder:
 *                                 type: number
 *                                 description: 跑步顺序
 *                     members:
 *                       type: array
 *                       description: 团队赛成员列表
 *                       items:
 *                         type: string
 *                         description: 学生ID
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Registration created successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Event not found
 *       409:
 *         description: Already registered
 *       500:
 *         description: Server error
 */
router.post('/', verifyToken, verifyCoachOrStudent, async (req, res) => {
  const requestId = req.requestId;

  
  logger.info('HTTP Request', {
    requestId,
    method: 'POST',
    url: '/api/registrations',
    userId: req.user._id,
    body: req.body
  });
  
  try {
    const { eventId, gameTypes, notes } = req.body;
    console.log('📥 Received request body:', JSON.stringify(req.body, null, 2));
    console.log('🔍 Raw gameTypes type:', typeof gameTypes);
    console.log('🔍 Raw gameTypes Array.isArray:', Array.isArray(gameTypes));
    console.log('🔍 Raw gameTypes length:', gameTypes?.length);
    
    // Validate required fields
    if (!eventId || !gameTypes || !Array.isArray(gameTypes) || gameTypes.length === 0) {
      return res.status(400).json({ message: '赛事ID和比赛项目是必需的' });
    }
    
    // Check if event exists and registration is open
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: '赛事未找到' });
    }
    
    if (!event.openRegistration) {
      return res.status(400).json({ message: '该赛事未开放报名' });
    }
    
    // Check if user is already registered for this event
    const existingRegistration = await EventRegistration.findOne({
      eventId,
      studentId: req.user._id
    });
    
    if (existingRegistration) {
      return res.status(409).json({ message: '您已报名该赛事' });
    }
    
    // Validate game types structure and existence in event
    const validEventGameTypes = event.gameTypes.map(gt => 
      typeof gt === 'string' ? gt : gt.name
    );
    

    
    for (const gameType of gameTypes) {

      
      // Validate required fields
      if (!gameType.name || !gameType.group) {
        return res.status(400).json({ 
          message: '每个比赛项目必须包含名称和组别信息' 
        });
      }
      
      // Validate game type exists in event
      if (!validEventGameTypes.includes(gameType.name)) {
        logger.error('Invalid game type detected', {
          requestId,
          gameTypeName: gameType.name,
          validEventGameTypes,
          gameTypeObject: gameType
        });
        return res.status(400).json({ 
          message: `无效的比赛项目: ${gameType.name || JSON.stringify(gameType)}` 
        });
      }
      
      // Validate team structure for both relay and team races
      if (gameType.team) {
        if (!gameType.team.name || !gameType.team.members || !Array.isArray(gameType.team.members)) {
          return res.status(400).json({ 
            message: '队伍信息不完整，需要队伍名称和成员列表' 
          });
        }
      }
      
      // 保持向后兼容：支持旧的members字段（已废弃）
      if (gameType.members && !Array.isArray(gameType.members)) {
        return res.status(400).json({ 
          message: '成员信息格式错误' 
        });
      }
    }
    
    // Transform gameTypes data to match schema
    console.log('🔄 Original gameTypes:', JSON.stringify(gameTypes, null, 2));
    
    const transformedGameTypes = gameTypes.map(gameType => {
      console.log('🔍 Processing gameType:', JSON.stringify(gameType, null, 2));
      const transformed = { ...gameType };
      
      // Transform relay team members
      if (gameType.team && gameType.team.members) {
        console.log('🏃 Processing relay team members:', gameType.team.members);
        console.log('🏃 Members type:', typeof gameType.team.members);
        console.log('🏃 Members isArray:', Array.isArray(gameType.team.members));
        
        // Handle case where members might be stringified
        let members = gameType.team.members;
        if (typeof members === 'string') {
          try {
            members = JSON.parse(members);
            console.log('🔧 Parsed stringified members:', members);
          } catch (e) {
            console.error('❌ Failed to parse stringified members:', e);
            members = [];
          }
        }
        
        if (Array.isArray(members)) {
          transformed.team = {
            ...gameType.team,
            members: members.map(member => {
              console.log('👤 Processing member:', member, 'Type:', typeof member);
              if (member.$oid) {
                const result = {
                  _id: member.$oid,
                  runOrder: member.runOrder
                };
                console.log('✅ Transformed member:', result);
                return result;
              }
              return member;
            })
          };
        } else {
          console.error('❌ Members is not an array after parsing:', members);
          transformed.team = {
            ...gameType.team,
            members: []
          };
        }
      }
      
      // 处理旧格式的团队赛成员（向后兼容）
      if (gameType.members && !gameType.team) {
        console.log('👥 Processing legacy team members:', gameType.members);
        console.log('👥 Members type:', typeof gameType.members);
        console.log('👥 Members isArray:', Array.isArray(gameType.members));
        
        // Handle case where members might be stringified
        let members = gameType.members;
        if (typeof members === 'string') {
          try {
            members = JSON.parse(members);
            console.log('🔧 Parsed stringified team members:', members);
          } catch (e) {
            console.error('❌ Failed to parse stringified team members:', e);
            members = [];
          }
        }
        
        if (Array.isArray(members)) {
          // 转换为新的team结构
          transformed.team = {
            name: `${gameType.name}队伍`, // 默认队伍名称
            members: members.map(member => {
              console.log('👤 Processing legacy team member:', member, 'Type:', typeof member);
              if (member.$oid) {
                console.log('✅ Transformed legacy team member:', member.$oid);
                return { _id: member.$oid }; // 团队赛不需要runOrder
              }
              return { _id: member };
            })
          };
          // 清除旧的members字段
          delete transformed.members;
        } else {
          console.error('❌ Legacy team members is not an array after parsing:', members);
          transformed.team = {
            name: `${gameType.name}队伍`,
            members: []
          };
        }
      }
      
      // 处理新格式的team结构中的团队赛成员（不包含runOrder）
      if (gameType.team && gameType.team.members && gameType.name === '团队赛') {
        console.log('👥 Processing new format team race members:', gameType.team.members);
        
        let members = gameType.team.members;
        if (typeof members === 'string') {
          try {
            members = JSON.parse(members);
          } catch (e) {
            console.error('❌ Failed to parse stringified team members:', e);
            members = [];
          }
        }
        
        if (Array.isArray(members)) {
          transformed.team = {
            ...gameType.team,
            members: members.map(member => {
              console.log('👤 Processing new format team member:', member, 'Type:', typeof member);
              if (member.$oid) {
                console.log('✅ Transformed new format team member:', member.$oid);
                return { _id: member.$oid }; // 团队赛不需要runOrder
              }
              return { _id: member };
            })
          };
        }
      }
      
      console.log('🎯 Final transformed gameType:', JSON.stringify(transformed, null, 2));
      return transformed;
    });
    
    console.log('🎉 Final transformedGameTypes:', JSON.stringify(transformedGameTypes, null, 2));
    
    // Generate invite codes for relay and team game types
    const gameTypesWithInviteCodes = await EventRegistration.generateInviteCodesForRelayGames(transformedGameTypes);
    
    // Create registration
    const registration = new EventRegistration({
      eventId,
      studentId: req.user._id,
      gameTypes: gameTypesWithInviteCodes,
      status: 'pending',
      notes: notes || ''
    });
    
    // logger.logDatabase('Creating event registration', 'eventRegistrations', {}, registration.toObject());
    
    const savedRegistration = await registration.save();
    
    // Log generated invite codes
    const generatedInviteCodes = gameTypesWithInviteCodes
      .filter(gt => gt.inviteCode)
      .map(gt => ({ gameType: gt.name, inviteCode: gt.inviteCode }));
    
    if (generatedInviteCodes.length > 0) {
      logger.info('Generated invite codes for game types', {
        requestId,
        registrationId: savedRegistration._id,
        inviteCodes: generatedInviteCodes
      });
    }
    
    // Populate event and student info
    await savedRegistration.populate('eventId', 'eventName organization startDate endDate');
    await savedRegistration.populate('studentId', 'username email profile.realName profile.grade');
    
    logger.info('Event registration created successfully', {
      requestId,
      registrationId: savedRegistration._id,
      eventId,
      studentId: req.user._id,
      gameTypes: gameTypesWithInviteCodes,
      inviteCodes: generatedInviteCodes
    });
    
    res.status(201).json(savedRegistration);
  } catch (error) {
    logger.logError(error, req);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/registrations/my:
 *   get:
 *     summary: Get current user's registrations
 *     tags: [Registrations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, cancelled]
 *         description: Filter by registration status
 *       - in: query
 *         name: eventId
 *         schema:
 *           type: string
 *         description: Filter by event ID
 *     responses:
 *       200:
 *         description: User registrations retrieved successfully
 *       500:
 *         description: Server error
 */
router.get('/my', verifyToken, verifyCoachOrStudent, async (req, res) => {
  const requestId = req.requestId;
  logger.info('HTTP Request', {
    requestId,
    method: 'GET',
    url: '/api/registrations/my',
    userId: req.user._id,
    query: req.query
  });
  
  try {
    const { status, eventId } = req.query;
    
    const filter = { studentId: req.user._id };
    if (status) filter.status = status;
    if (eventId) filter.eventId = eventId;
    
    logger.logDatabase('Getting user registrations', 'eventRegistrations', filter, {});
    
    const registrations = await EventRegistration.find(filter)
      .populate('eventId', 'eventName organization startDate endDate location gameTypes groups')
      .sort({ registrationDate: -1 });
    
    logger.info('User registrations retrieved successfully', {
      requestId,
      count: registrations.length,
      userId: req.user._id
    });
    
    res.json(registrations);
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/registrations/{id}:
 *   put:
 *     summary: Update registration status (coach only)
 *     tags: [Registrations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Registration ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, confirmed, cancelled]
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Registration updated successfully
 *       404:
 *         description: Registration not found
 *       500:
 *         description: Server error
 */
router.put('/:id', verifyToken, verifyCoach, async (req, res) => {
  const requestId = req.requestId;
  logger.info('HTTP Request', {
    requestId,
    method: 'PUT',
    url: `/api/registrations/${req.params.id}`,
    userId: req.user._id,
    body: req.body
  });
  
  try {
    const { status, notes } = req.body;
    
    const updateData = {};
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    
    logger.logDatabase('Updating registration', 'eventRegistrations', { _id: req.params.id }, updateData);
    
    const registration = await EventRegistration.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('eventId', 'eventName organization')
     .populate('studentId', 'username email profile.realName profile.grade');
    
    if (!registration) {
      return res.status(404).json({ message: '报名记录未找到' });
    }
    
    logger.info('Registration updated successfully', {
      requestId,
      registrationId: registration._id,
      status: registration.status,
      userId: req.user._id
    });
    
    res.json(registration);
  } catch (error) {
    logger.logError(error, req);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/registrations/{id}:
 *   delete:
 *     summary: Cancel registration
 *     tags: [Registrations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Registration ID
 *     responses:
 *       200:
 *         description: Registration cancelled successfully
 *       404:
 *         description: Registration not found
 *       403:
 *         description: Not authorized to cancel this registration
 *       500:
 *         description: Server error
 */
router.delete('/:id', verifyToken, verifyCoachOrStudent, async (req, res) => {
  const requestId = req.requestId;
  logger.info('HTTP Request', {
    requestId,
    method: 'DELETE',
    url: `/api/registrations/${req.params.id}`,
    userId: req.user._id
  });
  
  try {
    const registration = await EventRegistration.findById(req.params.id);
    
    if (!registration) {
      return res.status(404).json({ message: '报名记录未找到' });
    }
    
    // Check if user can cancel this registration
    const isOwner = registration.studentId.toString() === req.user._id.toString();
    const isCoach = req.user.role === 'coach' || req.user.role === 'IT';
    
    if (!isOwner && !isCoach) {
      return res.status(403).json({ message: '无权限取消此报名' });
    }
    
    // Update status to cancelled instead of deleting
    registration.status = 'cancelled';
    await registration.save();
    
    logger.info('Registration cancelled successfully', {
      requestId,
      registrationId: registration._id,
      userId: req.user._id
    });
    
    res.json({ message: '报名已取消' });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/registrations/event/{eventId}:
 *   get:
 *     summary: Get registrations for specific event (coach only)
 *     tags: [Registrations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, cancelled]
 *         description: Filter by registration status
 *       - in: query
 *         name: gameType
 *         schema:
 *           type: string
 *         description: Filter by game type
 *     responses:
 *       200:
 *         description: Event registrations retrieved successfully
 *       404:
 *         description: Event not found
 *       500:
 *         description: Server error
 */
router.get('/event/:eventId', verifyToken, verifyCoach, async (req, res) => {
  const requestId = req.requestId;
  logger.info('HTTP Request', {
    requestId,
    method: 'GET',
    url: `/api/registrations/event/${req.params.eventId}`,
    userId: req.user._id,
    query: req.query
  });
  
  try {
    const { eventId } = req.params;
    const { status, gameType } = req.query;
    
    // Check if event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: '赛事未找到' });
    }
    
    const filter = { eventId };
    if (status) filter.status = status;
    if (gameType) filter.gameTypes = { $in: [gameType] };
    
    logger.logDatabase('Getting event registrations', 'eventRegistrations', filter, {});
    
    const registrations = await EventRegistration.find(filter)
      .populate('studentId', 'username email profile.realName profile.grade profile.school')
      .sort({ registrationDate: -1 });
    
    // Get registration statistics
    const stats = {
      total: registrations.length,
      pending: registrations.filter(r => r.status === 'pending').length,
      confirmed: registrations.filter(r => r.status === 'confirmed').length,
      cancelled: registrations.filter(r => r.status === 'cancelled').length,
      byGameType: {}
    };
    
    // Calculate stats by game type
    event.gameTypes.forEach(gt => {
      stats.byGameType[gt.name] = registrations.filter(r => 
        r.gameTypes.includes(gt.name) && r.status !== 'cancelled'
      ).length;
    });
    
    logger.info('Event registrations retrieved successfully', {
      requestId,
      eventId,
      count: registrations.length,
      stats,
      userId: req.user._id
    });
    
    res.json({
      registrations,
      stats,
      event: {
        _id: event._id,
        eventName: event.eventName,
        organization: event.organization,
        startDate: event.startDate,
        endDate: event.endDate,
        gameTypes: event.gameTypes,
        groups: event.groups
      }
    });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/registrations/event/{eventId}/export:
 *   get:
 *     summary: Export event registrations to Excel (coach only)
 *     tags: [Registrations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, cancelled]
 *         description: Filter by registration status
 *     responses:
 *       200:
 *         description: Excel file generated successfully
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Event not found
 *       500:
 *         description: Server error
 */
router.get('/event/:eventId/export', verifyToken, verifyCoach, async (req, res) => {
  const requestId = req.requestId;
  logger.info('HTTP Request', {
    requestId,
    method: 'GET',
    url: `/api/registrations/event/${req.params.eventId}/export`,
    userId: req.user._id,
    query: req.query
  });
  
  try {
    const { eventId } = req.params;
    const { status } = req.query;
    
    // Check if event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: '赛事未找到' });
    }
    
    const filter = { eventId };
    if (status) filter.status = status;
    
    const registrations = await EventRegistration.find(filter)
      .populate('studentId', 'username email profile.realName profile.grade profile.school profile.phoneNumber')
      .sort({ registrationDate: -1 });
    
    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('报名统计');
    
    // Set headers
    worksheet.columns = [
      { header: '姓名', key: 'realName', width: 15 },
      { header: '用户名', key: 'username', width: 15 },
      { header: '邮箱', key: 'email', width: 25 },
      { header: '年级', key: 'grade', width: 10 },
      { header: '学校', key: 'school', width: 20 },
      { header: '电话', key: 'phoneNumber', width: 15 },
      { header: '报名项目', key: 'gameTypes', width: 30 },
      { header: '状态', key: 'status', width: 10 },
      { header: '报名时间', key: 'registrationDate', width: 20 },
      { header: '备注', key: 'notes', width: 30 }
    ];
    
    // Add data rows
    registrations.forEach(registration => {
      const student = registration.studentId;
      worksheet.addRow({
        realName: student.profile?.realName || '',
        username: student.username,
        email: student.email,
        grade: student.profile?.grade || '',
        school: student.profile?.school || '',
        phoneNumber: student.profile?.phoneNumber || '',
        gameTypes: registration.gameTypes.join(', '),
        status: registration.status === 'pending' ? '待确认' : 
                registration.status === 'confirmed' ? '已确认' : '已取消',
        registrationDate: registration.registrationDate.toLocaleString('zh-CN'),
        notes: registration.notes || ''
      });
    });
    
    // Style the header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
    
    // Set response headers
    const filename = `${event.eventName}_报名统计_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    
    // Write to response
    await workbook.xlsx.write(res);
    
    logger.info('Excel export completed successfully', {
      requestId,
      eventId,
      registrationCount: registrations.length,
      userId: req.user._id
    });
    
    res.end();
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/registrations/invite-info:
 *   post:
 *     summary: Get invite code information for confirmation dialog
 *     tags: [Registrations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - inviteCode
 *             properties:
 *               inviteCode:
 *                 type: string
 *                 description: Invite code for the relay team
 *     responses:
 *       200:
 *         description: Invite code information retrieved successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Invalid invite code
 *       409:
 *         description: Already registered
 *       500:
 *         description: Server error
 */
router.post('/invite-info', verifyToken, verifyCoachOrStudent, async (req, res) => {
  const requestId = req.requestId;
  logger.info('HTTP Request', {
    requestId,
    method: 'POST',
    url: '/api/registrations/invite-info',
    userId: req.user._id,
    body: req.body
  });
  
  try {
    const { inviteCode } = req.body;
    
    // Validate required fields
    if (!inviteCode) {
      return res.status(400).json({ message: '邀请码是必需的' });
    }
    
    // Find target registration by invite code
    const targetRegistration = await EventRegistration.findOne({ 
      'gameTypes.inviteCode': inviteCode 
    })
      .populate('studentId', 'username name grade')
      .populate('eventId', 'eventName organization startDate endDate openRegistration gameTypes gameTypeSettings');
    
    if (!targetRegistration) {
      return res.status(404).json({ message: '无效的邀请码' });
    }
    
    const event = targetRegistration.eventId;
    const eventId = event._id;
    
    if (!event.openRegistration) {
      return res.status(400).json({ message: '该赛事未开放报名' });
    }
    
    // Check if user is already registered for this event
    const existingRegistration = await EventRegistration.findOne({
      eventId,
      studentId: req.user._id
    });
    
    // Find the specific game type with the matching invite code
    const targetGameType = targetRegistration.gameTypes.find(gt => {
      return gt && gt.inviteCode === inviteCode;
    });
    
    if (!targetGameType) {
      return res.status(404).json({ message: '无效的邀请码' });
    }
    
    const gameTypeName = targetGameType.name;
    
    // Get current team members with populated user info
    const currentMembers = targetGameType.team?.members || [];
    const memberIds = currentMembers.map(member => member._id || member.$oid);
    
    // Populate team member details
    const teamMembers = await Student.find({
      _id: { $in: memberIds }
    }).select('username name grade');
    
    // Get team size
    const eventGameTypeConfig = event.gameTypes.find(gt => 
      (typeof gt === 'string' ? gt : gt.name) === gameTypeName
    );
    const teamSize = getTeamSizeForGameType(gameTypeName, eventGameTypeConfig, event.gameTypeSettings);
    
    // Format team members with run order for relay games
    const formattedMembers = currentMembers.map(member => {
      const memberInfo = teamMembers.find(tm => tm._id.toString() === (member._id || member.$oid).toString());
      const result = {
        _id: member._id || member.$oid,
        username: memberInfo?.username || 'Unknown',
        name: memberInfo?.name || memberInfo?.username || 'Unknown',
        grade: memberInfo?.grade
      };
      
      if (member.runOrder !== undefined) {
        result.runOrder = member.runOrder;
      }
      
      return result;
    });
    
    const inviteInfo = {
      event: {
        _id: event._id,
        eventName: event.eventName,
        organization: event.organization,
        startDate: event.startDate,
        endDate: event.endDate
      },
      gameType: {
        name: gameTypeName,
        maxTeamSize: teamSize,
        currentTeamSize: currentMembers.length
      },
      teamCreator: {
        _id: targetRegistration.studentId._id,
        username: targetRegistration.studentId.username,
        name: targetRegistration.studentId.name || targetRegistration.studentId.username,
        grade: targetRegistration.studentId.grade
      },
      teamMembers: formattedMembers,
      isTeamFull: currentMembers.length >= teamSize,
      userStatus: existingRegistration ? 'already_registered' : 'can_join'
    };
    
    logger.info('Retrieved invite code information', {
      requestId,
      inviteCode,
      eventId,
      userId: req.user._id,
      gameTypeName,
      userStatus: inviteInfo.userStatus
    });
    
    res.status(200).json({
      message: '获取邀请信息成功',
      inviteInfo
    });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/registrations/join-relay:
 *   post:
 *     summary: Join a relay team using invite code
 *     tags: [Registrations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - inviteCode
 *             properties:
 *               inviteCode:
 *                 type: string
 *                 description: Invite code for the relay team
 *     responses:
 *       200:
 *         description: Successfully joined relay team
 *       400:
 *         description: Validation error or team full
 *       404:
 *         description: Event or registration not found
 *       409:
 *         description: Already registered
 *       500:
 *         description: Server error
 */
router.post('/join-relay', verifyToken, verifyCoachOrStudent, async (req, res) => {
  const requestId = req.requestId;
  logger.info('HTTP Request', {
    requestId,
    method: 'POST',
    url: '/api/registrations/join-relay',
    userId: req.user._id,
    body: req.body
  });
  
  try {
    const { inviteCode } = req.body;
    
    // Validate required fields
    if (!inviteCode) {
      return res.status(400).json({ message: '邀请码是必需的' });
    }
    
    // Find target registration by invite code (now at gameType level)
    const targetRegistration = await EventRegistration.findOne({ 
      'gameTypes.inviteCode': inviteCode 
    })
      .populate('studentId', 'username name')
      .populate('eventId', 'eventName organization startDate endDate openRegistration gameTypes gameTypeSettings');
    
    if (!targetRegistration) {
      return res.status(404).json({ message: '无效的邀请码' });
    }
    
    const event = targetRegistration.eventId;
    const eventId = event._id;
    
    if (!event.openRegistration) {
      return res.status(400).json({ message: '该赛事未开放报名' });
    }
    
    // Check if user is already registered for this event
    const existingRegistration = await EventRegistration.findOne({
      eventId,
      studentId: req.user._id
    });
    
    if (existingRegistration) {
      return res.status(409).json({ message: '您已报名该赛事' });
    }
    
    // Debug: Log the structure of gameTypes
    // Find the specific game type with the matching invite code
    const targetGameType = targetRegistration.gameTypes.find(gt => {
      return gt && gt.inviteCode === inviteCode;
    });
    
    if (!targetGameType) {
      return res.status(404).json({ message: '无效的邀请码' });
    }
    
    // Add validation for targetGameType structure
    if (typeof targetGameType !== 'object' || !targetGameType.name) {
      console.error('Debug - Invalid targetGameType structure:', targetGameType);
      return res.status(400).json({ message: '游戏类型数据结构异常' });
    }
    
    const gameTypeName = targetGameType.name;
    
    // Verify it's a relay or team game type
    if (!gameTypeName.includes('接力') && !gameTypeName.includes('团队')) {
      return res.status(400).json({ message: '该邀请码不适用于接力赛或团队赛' });
    }
    
    // Check if there's space in the specific game type team
    if (!targetGameType.team) {
      console.error('Debug - targetGameType.team is missing:', targetGameType);
      return res.status(400).json({ message: '该游戏类型没有队伍信息' });
    }
    
    const currentMembers = targetGameType.team.members || [];
    // Get teamSize using the centralized helper function
    const eventGameTypeConfig = event.gameTypes.find(gt => 
      (typeof gt === 'string' ? gt : gt.name) === gameTypeName
    );
    const teamSize = getTeamSizeForGameType(gameTypeName, eventGameTypeConfig, event.gameTypeSettings);
    
    if (currentMembers.length >= teamSize) {
      return res.status(400).json({ message: '该队伍已满员' });
    }
    
    // Create the new member object with proper format (no $oid)
    const newMember = {
      _id: new mongoose.Types.ObjectId(req.user._id)
    };
    
    // Add runOrder for relay games only
    if (gameTypeName.includes('接力')) {
      newMember.runOrder = currentMembers.length + 1;
    }
    
    // Update the specific game type with new team member
    const updatedGameTypes = targetRegistration.gameTypes.map(gt => {
      if (gt.inviteCode === inviteCode) {
        const updatedGameType = {
          ...gt.toObject ? gt.toObject() : gt,
          team: {
            ...gt.team,
            members: [
              ...currentMembers,
              newMember
            ]
          }
        };
        return updatedGameType;
      }
      return gt;
    });
    
    // Create gameTypes for the new user (copy the specific game type with updated team info)
    const updatedTargetGameType = updatedGameTypes.find(gt => gt && gt.inviteCode === inviteCode);
    
    // Create properly formatted gameTypes for the new user
    const newUserGameTypes = [{
      ...updatedTargetGameType,
      team: {
        ...updatedTargetGameType.team,
        members: updatedTargetGameType.team.members.map(member => {
          // Ensure all members have proper ObjectId format
          const memberId = member._id || member.$oid;
          const result = {
            _id: new mongoose.Types.ObjectId(memberId)
          };
          
          // Add runOrder for relay games only
          if (member.runOrder !== undefined) {
            result.runOrder = member.runOrder;
          }
          
          return result;
        })
      }
    }];
    
    // Create new registration for the joining user
    const newRegistration = new EventRegistration({
      eventId,
      studentId: req.user._id,
      gameTypes: newUserGameTypes,
      status: 'pending',
      notes: `通过分享链接加入 ${targetRegistration.studentId.profile?.realName || targetRegistration.studentId.username} 的队伍`
    });
    
    // Update target registration with new team member
    targetRegistration.gameTypes = updatedGameTypes;
    
    // Save both registrations
    await Promise.all([
      newRegistration.save(),
      targetRegistration.save()
    ]);
    
    // Populate the new registration
    await newRegistration.populate('eventId', 'eventName organization startDate endDate');
    await newRegistration.populate('studentId', 'username email profile.realName profile.grade');
    
    logger.info('Successfully joined relay team', {
      requestId,
      newRegistrationId: newRegistration._id,
      targetRegistrationId: targetRegistration._id,
      inviteCode,
      eventId,
      userId: req.user._id,
      gameTypeName: gameTypeName,
      inviteCode
    });
    
    res.status(200).json({
      message: '成功加入接力队伍',
      registration: newRegistration
    });
  } catch (error) {
    logger.logError(error, req);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;