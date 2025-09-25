const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const RelayTeam = require('../models/RelayTeam');
const EventRegistration = require('../models/EventRegistration');
const Student = require('../models/Student');
const { verifyToken, verifyCoach, verifyCoachOrStudent } = require('../middleware/auth');
const logger = require('../utils/logger');

/**
 * @swagger
 * components:
 *   schemas:
 *     RelayTeam:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         eventId:
 *           type: string
 *         gameType:
 *           type: string
 *         teamName:
 *           type: string
 *         inviteCode:
 *           type: string
 *         members:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               studentId:
 *                 type: string
 *               joinedAt:
 *                 type: string
 *                 format: date-time
 *               role:
 *                 type: string
 *                 enum: [leader, member]
 *         maxMembers:
 *           type: number
 *         status:
 *           type: string
 *           enum: [forming, ready, cancelled]
 *         createdAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/relay-teams:
 *   post:
 *     summary: Create relay team
 *     tags: [RelayTeams]
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
 *               - gameType
 *               - teamName
 *             properties:
 *               eventId:
 *                 type: string
 *               gameType:
 *                 type: string
 *               teamName:
 *                 type: string
 *     responses:
 *       201:
 *         description: Relay team created successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Event not found
 *       409:
 *         description: Already in a team for this game type
 *       500:
 *         description: Server error
 */
router.post('/', verifyToken, verifyCoachOrStudent, async (req, res) => {
  const requestId = req.requestId;
  logger.info('HTTP Request', {
    requestId,
    method: 'POST',
    url: '/api/relay-teams',
    userId: req.user._id,
    body: req.body
  });
  
  try {
    const { eventId, gameType, teamName } = req.body;
    
    // Validate required fields
    if (!eventId || !gameType || !teamName) {
      return res.status(400).json({ message: '赛事ID、比赛项目和队伍名称是必需的' });
    }
    
    // Check if event exists and registration is open
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: '赛事未找到' });
    }
    
    if (!event.openRegistration) {
      return res.status(400).json({ message: '该赛事未开放报名' });
    }
    
    // Check if game type exists and is a relay
    const gameTypeConfig = event.gameTypes.find(gt => 
      (typeof gt === 'string' ? gt : gt.name) === gameType
    );
    if (!gameTypeConfig) {
      return res.status(400).json({ message: '比赛项目不存在' });
    }
    
    // Check if it's a relay game type (contains "接力" in the name)
    const gameTypeName = typeof gameTypeConfig === 'string' ? gameTypeConfig : gameTypeConfig.name;
    if (!gameTypeName.includes('接力')) {
      return res.status(400).json({ message: '该项目不是接力赛' });
    }
    
    // Check if user is already in a team for this game type
    const existingTeam = await RelayTeam.findOne({
      eventId,
      gameType,
      'members.studentId': req.user._id,
      status: { $ne: 'cancelled' }
    });
    
    if (existingTeam) {
      return res.status(409).json({ message: '您已加入该项目的队伍' });
    }
    
    // Create relay team
    const relayTeam = new RelayTeam({
      eventId,
      gameType,
      teamName: teamName.trim(),
      members: [{
        studentId: req.user._id,
        role: 'leader',
        joinedAt: new Date()
      }],
      maxMembers: (typeof gameTypeConfig === 'object' && gameTypeConfig.teamSize) || 
                  event.gameTypeSettings?.[gameType]?.teamSize || 4,
      status: 'forming'
    });
    
    logger.logDatabase('Creating relay team', 'relayTeams', {}, relayTeam.toObject());
    
    const savedTeam = await relayTeam.save();
    
    // Populate event and member info
    await savedTeam.populate('eventId', 'eventName organization startDate endDate');
    await savedTeam.populate('members.studentId', 'username email profile.realName profile.grade');
    
    logger.info('Relay team created successfully', {
      requestId,
      teamId: savedTeam._id,
      eventId,
      gameType,
      teamName,
      leaderId: req.user._id
    });
    
    res.status(201).json(savedTeam);
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
 * /api/relay-teams/join/{inviteCode}:
 *   post:
 *     summary: Join relay team by invite code
 *     tags: [RelayTeams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: inviteCode
 *         required: true
 *         schema:
 *           type: string
 *         description: Team invite code
 *     responses:
 *       200:
 *         description: Successfully joined team
 *       400:
 *         description: Validation error or team full
 *       404:
 *         description: Team not found
 *       409:
 *         description: Already in a team
 *       500:
 *         description: Server error
 */
router.post('/join/:inviteCode', verifyToken, verifyCoachOrStudent, async (req, res) => {
  const requestId = req.requestId;
  logger.info('HTTP Request', {
    requestId,
    method: 'POST',
    url: `/api/relay-teams/join/${req.params.inviteCode}`,
    userId: req.user._id
  });
  
  try {
    const { inviteCode } = req.params;
    
    // Find team by invite code
    const team = await RelayTeam.findOne({ inviteCode, status: 'forming' })
      .populate('eventId', 'eventName organization openRegistration')
      .populate('members.studentId', 'username profile.realName');
    
    if (!team) {
      return res.status(404).json({ message: '队伍未找到或已关闭' });
    }
    
    // Check if event registration is still open
    if (!team.eventId.openRegistration) {
      return res.status(400).json({ message: '该赛事已关闭报名' });
    }
    
    // Check if user is already in this team
    const isAlreadyMember = team.members.some(member => 
      member.studentId._id.toString() === req.user._id.toString()
    );
    
    if (isAlreadyMember) {
      return res.status(409).json({ message: '您已在该队伍中' });
    }
    
    // Check if user is already in another team for this game type
    const existingTeam = await RelayTeam.findOne({
      eventId: team.eventId._id,
      gameType: team.gameType,
      'members.studentId': req.user._id,
      status: { $ne: 'cancelled' },
      _id: { $ne: team._id }
    });
    
    if (existingTeam) {
      return res.status(409).json({ message: '您已加入该项目的其他队伍' });
    }
    
    // Check if team is full
    if (team.isFull()) {
      return res.status(400).json({ message: '队伍已满' });
    }
    
    // Add user to team
    team.addMember(req.user._id);
    
    logger.logDatabase('Adding member to relay team', 'relayTeams', { _id: team._id }, {
      newMember: req.user._id
    });
    
    const updatedTeam = await team.save();
    await updatedTeam.populate('members.studentId', 'username email profile.realName profile.grade');
    
    logger.info('User joined relay team successfully', {
      requestId,
      teamId: team._id,
      userId: req.user._id,
      memberCount: updatedTeam.members.length
    });
    
    res.json(updatedTeam);
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/relay-teams/{id}/leave:
 *   post:
 *     summary: Leave relay team
 *     tags: [RelayTeams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Team ID
 *     responses:
 *       200:
 *         description: Successfully left team
 *       404:
 *         description: Team not found
 *       403:
 *         description: Not a member of this team
 *       500:
 *         description: Server error
 */
router.post('/:id/leave', verifyToken, verifyCoachOrStudent, async (req, res) => {
  const requestId = req.requestId;
  logger.info('HTTP Request', {
    requestId,
    method: 'POST',
    url: `/api/relay-teams/${req.params.id}/leave`,
    userId: req.user._id
  });
  
  try {
    const team = await RelayTeam.findById(req.params.id);
    
    if (!team) {
      return res.status(404).json({ message: '队伍未找到' });
    }
    
    // Check if user is a member
    const memberIndex = team.members.findIndex(member => 
      member.studentId.toString() === req.user._id.toString()
    );
    
    if (memberIndex === -1) {
      return res.status(403).json({ message: '您不是该队伍成员' });
    }
    
    const isLeader = team.members[memberIndex].role === 'leader';
    
    // Remove member
    team.removeMember(req.user._id);
    
    // If leader left and there are other members, promote the first member to leader
    if (isLeader && team.members.length > 0) {
      team.members[0].role = 'leader';
    }
    
    // If no members left, cancel the team
    if (team.members.length === 0) {
      team.status = 'cancelled';
    }
    
    logger.logDatabase('Removing member from relay team', 'relayTeams', { _id: team._id }, {
      removedMember: req.user._id,
      remainingMembers: team.members.length
    });
    
    await team.save();
    
    logger.info('User left relay team successfully', {
      requestId,
      teamId: team._id,
      userId: req.user._id,
      wasLeader: isLeader,
      remainingMembers: team.members.length
    });
    
    res.json({ message: '已退出队伍' });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/relay-teams/my:
 *   get:
 *     summary: Get current user's relay teams
 *     tags: [RelayTeams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: eventId
 *         schema:
 *           type: string
 *         description: Filter by event ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [forming, ready, cancelled]
 *         description: Filter by team status
 *     responses:
 *       200:
 *         description: User relay teams retrieved successfully
 *       500:
 *         description: Server error
 */
router.get('/my', verifyToken, verifyCoachOrStudent, async (req, res) => {
  const requestId = req.requestId;
  logger.info('HTTP Request', {
    requestId,
    method: 'GET',
    url: '/api/relay-teams/my',
    userId: req.user._id,
    query: req.query
  });
  
  try {
    const { eventId, status } = req.query;
    
    const filter = {
      'members.studentId': req.user._id
    };
    
    if (eventId) filter.eventId = eventId;
    if (status) filter.status = status;
    
    logger.logDatabase('Getting user relay teams', 'relayTeams', filter, {});
    
    const teams = await RelayTeam.find(filter)
      .populate('eventId', 'eventName organization startDate endDate location')
      .populate('members.studentId', 'username email profile.realName profile.grade')
      .sort({ createdAt: -1 });
    
    logger.info('User relay teams retrieved successfully', {
      requestId,
      count: teams.length,
      userId: req.user._id
    });
    
    res.json(teams);
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/relay-teams/event/{eventId}:
 *   get:
 *     summary: Get relay teams for specific event (coach only)
 *     tags: [RelayTeams]
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
 *         name: gameType
 *         schema:
 *           type: string
 *         description: Filter by game type
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [forming, ready, cancelled]
 *         description: Filter by team status
 *     responses:
 *       200:
 *         description: Event relay teams retrieved successfully
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
    url: `/api/relay-teams/event/${req.params.eventId}`,
    userId: req.user._id,
    query: req.query
  });
  
  try {
    const { eventId } = req.params;
    const { gameType, status } = req.query;
    
    // Check if event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: '赛事未找到' });
    }
    
    const filter = { eventId };
    if (gameType) filter.gameType = gameType;
    if (status) filter.status = status;
    
    logger.logDatabase('Getting event relay teams', 'relayTeams', filter, {});
    
    const teams = await RelayTeam.find(filter)
      .populate('members.studentId', 'username email profile.realName profile.grade profile.school')
      .sort({ createdAt: -1 });
    
    // Get team statistics
    const stats = {
      total: teams.length,
      forming: teams.filter(t => t.status === 'forming').length,
      ready: teams.filter(t => t.status === 'ready').length,
      cancelled: teams.filter(t => t.status === 'cancelled').length,
      byGameType: {}
    };
    
    // Calculate stats by game type
    const relayGameTypes = event.gameTypes.filter(gt => gt.isRelay);
    relayGameTypes.forEach(gt => {
      const gameTypeTeams = teams.filter(t => t.gameType === gt.name && t.status !== 'cancelled');
      stats.byGameType[gt.name] = {
        teams: gameTypeTeams.length,
        totalMembers: gameTypeTeams.reduce((sum, team) => sum + team.members.length, 0)
      };
    });
    
    logger.info('Event relay teams retrieved successfully', {
      requestId,
      eventId,
      count: teams.length,
      stats,
      userId: req.user._id
    });
    
    res.json({
      teams,
      stats,
      event: {
        _id: event._id,
        eventName: event.eventName,
        organization: event.organization,
        startDate: event.startDate,
        endDate: event.endDate,
        gameTypes: event.gameTypes
      }
    });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/relay-teams/{id}:
 *   put:
 *     summary: Update relay team (team leader or coach only)
 *     tags: [RelayTeams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Team ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               teamName:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [forming, ready, cancelled]
 *     responses:
 *       200:
 *         description: Team updated successfully
 *       404:
 *         description: Team not found
 *       403:
 *         description: Not authorized to update this team
 *       500:
 *         description: Server error
 */
router.put('/:id', verifyToken, verifyCoachOrStudent, async (req, res) => {
  const requestId = req.requestId;
  logger.info('HTTP Request', {
    requestId,
    method: 'PUT',
    url: `/api/relay-teams/${req.params.id}`,
    userId: req.user._id,
    body: req.body
  });
  
  try {
    const { teamName, status } = req.body;
    
    const team = await RelayTeam.findById(req.params.id);
    
    if (!team) {
      return res.status(404).json({ message: '队伍未找到' });
    }
    
    // Check if user can update this team
    const isLeader = team.members.some(member => 
      member.studentId.toString() === req.user._id.toString() && member.role === 'leader'
    );
    const isCoach = req.user.role === 'coach' || req.user.role === 'IT';
    
    if (!isLeader && !isCoach) {
      return res.status(403).json({ message: '无权限修改该队伍' });
    }
    
    const updateData = {};
    if (teamName !== undefined) updateData.teamName = teamName.trim();
    if (status !== undefined) updateData.status = status;
    
    logger.logDatabase('Updating relay team', 'relayTeams', { _id: req.params.id }, updateData);
    
    const updatedTeam = await RelayTeam.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('eventId', 'eventName organization')
     .populate('members.studentId', 'username email profile.realName profile.grade');
    
    logger.info('Relay team updated successfully', {
      requestId,
      teamId: updatedTeam._id,
      updates: updateData,
      userId: req.user._id
    });
    
    res.json(updatedTeam);
  } catch (error) {
    logger.logError(error, req);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;