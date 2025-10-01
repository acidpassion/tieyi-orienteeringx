const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Event = require('../models/Event');
const EventRegistration = require('../models/EventRegistration');
const RelayTeam = require('../models/RelayTeam');
const Student = require('../models/Student');
const { verifyToken, verifyCoach, verifyCoachOrStudent } = require('../middleware/auth');
const { validateRegistrationData } = require('../middleware/configurationValidation');
const logger = require('../utils/logger');
const ExcelJS = require('exceljs');
const { getTeamSizeForGameType } = require('../constants/teamConstants');

// Batch create/update team member registrations


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
 *                     difficultyGrade:
 *                       type: string
 *                       description: 难度等级颜色名称
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
router.post('/', verifyToken, verifyCoachOrStudent, validateRegistrationData, async (req, res) => {
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
    console.log('🔍 Looking for event with ID:', eventId);
    console.log('🔍 EventId type:', typeof eventId);
    console.log('🔍 EventId length:', eventId.length);
    console.log('🔍 EventId hex check:', /^[0-9a-fA-F]{24}$/.test(eventId));

    // 尝试多种查询方式
    console.log('🔍 Trying findById...');
    const event1 = await Event.findById(eventId);
    console.log('🔍 findById result:', event1 ? 'FOUND' : 'NOT FOUND');

    console.log('🔍 Trying findOne...');
    const event2 = await Event.findOne({ _id: eventId });
    console.log('🔍 findOne result:', event2 ? 'FOUND' : 'NOT FOUND');

    console.log('🔍 Trying with ObjectId...');
    const mongoose = require('mongoose');
    const event3 = await Event.findById(new mongoose.Types.ObjectId(eventId));
    console.log('🔍 ObjectId result:', event3 ? 'FOUND' : 'NOT FOUND');

    console.log('🔍 Checking all events in database...');
    const allEvents = await Event.find({});
    console.log('🔍 Total events in database:', allEvents.length);
    allEvents.forEach((evt, idx) => {
      console.log(`Event ${idx + 1}: ${evt._id} (${evt.eventName})`);
    });

    const event = event1 || event2 || event3;
    console.log('🔍 Final event found:', event ? 'YES' : 'NO');
    if (event) {
      console.log('🔍 Event details:', { _id: event._id, eventName: event.eventName, name: event.name, openRegistration: event.openRegistration });
    }
    if (!event) {
      console.log('❌ Event not found, returning 404');
      return res.status(404).json({ message: '赛事未找到' });
    }

    if (!event.openRegistration) {
      return res.status(400).json({ message: '该赛事未开放报名' });
    }

    // Check if user is already registered for this specific game type
    console.log('🔍 Querying for existing registration with:');
    console.log('  eventId:', eventId);
    console.log('  studentId:', req.user._id);
    console.log('  studentId type:', typeof req.user._id);

    const existingRegistration = await EventRegistration.findOne({
      eventId,
      studentId: req.user._id
    });

    console.log('🔍 Database query result:', existingRegistration);
    console.log('🔍 Existing registration found:', existingRegistration ? 'YES' : 'NO');

    if (existingRegistration) {
      console.log('🔍 Existing registration gameTypes:', existingRegistration.gameTypes.map(gt => gt.name));

      // Check if user is already registered for any of the requested game types
      for (const gameType of gameTypes) {
        console.log('🔍 Checking conflict for gameType:', gameType.name);
        const alreadyRegisteredForGameType = existingRegistration.gameTypes.some(gt => {
          console.log('🔍 Comparing:', gt.name, 'vs', gameType.name);
          return gt.name === gameType.name;
        });

        console.log('🔍 Already registered for', gameType.name, ':', alreadyRegisteredForGameType);

        if (alreadyRegisteredForGameType) {
          console.log('❌ Conflict detected for:', gameType.name);
          return res.status(409).json({ message: `您已报名该赛事的${gameType.name}项目` });
        }
      }
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

      // Transform relay team members (接力赛)
      if (gameType.team && gameType.team.members && gameType.name === '接力赛') {
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
              console.log('👤 Processing relay member:', member, 'Type:', typeof member);
              console.log('👤 Original captain value:', member.captain, 'Type:', typeof member.captain);
              if (member._id) {
                const result = {
                  _id: new mongoose.Types.ObjectId(member._id),
                  runOrder: member.runOrder,
                  captain: member.captain === true // 确保captain字段正确保留
                };
                console.log('✅ Transformed relay member:', result);
                console.log('✅ Captain field preserved:', result.captain);
                return result;
              } else if (member.$oid) {
                // 向后兼容旧格式
                const result = {
                  _id: new mongoose.Types.ObjectId(member.$oid),
                  runOrder: member.runOrder,
                  captain: member.captain === true // 确保captain字段正确保留
                };
                console.log('✅ Transformed legacy relay member:', result);
                console.log('✅ Captain field preserved:', result.captain);
                return result;
              }
              return member;
            })
          };
        } else {
          console.error('❌ Relay members is not an array after parsing:', members);
          transformed.team = {
            ...gameType.team,
            members: []
          };
        }
      }

      // Transform team race members (团队赛)
      else if (gameType.team && gameType.team.members && gameType.name === '团队赛') {
        console.log('👥 Processing team race members:', gameType.team.members);

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
              console.log('👤 Processing team member:', member, 'Type:', typeof member);
              if (member._id) {
                console.log('✅ Transformed team member:', member._id);
                return {
                  _id: new mongoose.Types.ObjectId(member._id),
                  captain: member.captain || false // 保留captain字段
                }; // 团队赛不需要runOrder
              } else if (member.$oid) {
                console.log('✅ Transformed legacy team member:', member.$oid);
                return {
                  _id: new mongoose.Types.ObjectId(member.$oid),
                  captain: member.captain || false // 保留captain字段
                }; // 团队赛不需要runOrder
              }
              return {
                _id: new mongoose.Types.ObjectId(member),
                captain: false // 默认非队长
              };
            })
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
              if (member._id) {
                console.log('✅ Transformed team member:', member._id);
                return {
                  _id: new mongoose.Types.ObjectId(member._id),
                  captain: member.captain || false // 保留captain字段
                }; // 团队赛不需要runOrder
              } else if (member.$oid) {
                console.log('✅ Transformed legacy team member:', member.$oid);
                return {
                  _id: new mongoose.Types.ObjectId(member.$oid),
                  captain: member.captain || false // 保留captain字段
                }; // 团队赛不需要runOrder
              }
              return {
                _id: new mongoose.Types.ObjectId(member),
                captain: false // 默认非队长
              };
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



      console.log('🎯 Final transformed gameType:', JSON.stringify(transformed, null, 2));
      return transformed;
    });

    console.log('🎉 Final transformedGameTypes:', JSON.stringify(transformedGameTypes, null, 2));

    // Generate invite codes for relay and team game types
    const gameTypesWithInviteCodes = await EventRegistration.generateInviteCodesForRelayGames(transformedGameTypes);

    // Generate unique IDs for each gameType to ensure consistency across team members
    gameTypesWithInviteCodes.forEach(gameType => {
      gameType._id = new mongoose.Types.ObjectId();
    });

    // Create registration
    const registration = new EventRegistration({
      eventId,
      studentId: req.user._id,
      gameTypes: gameTypesWithInviteCodes,
      status: 'pending',
      notes: notes || ''
    });

    console.log('💾 About to save registration with gameTypes:', JSON.stringify(registration.gameTypes, null, 2));

    // Check captain fields before saving
    registration.gameTypes.forEach((gt, index) => {
      if (gt.team && gt.team.members) {
        console.log(`🔍 GameType ${index} (${gt.name}) members before save:`);
        gt.team.members.forEach((member, memberIndex) => {
          console.log(`  Member ${memberIndex}: _id=${member._id}, runOrder=${member.runOrder}, captain=${member.captain}`);
        });
      }
    });

    // logger.logDatabase('Creating event registration', 'eventRegistrations', {}, registration.toObject());

    const savedRegistration = await registration.save();

    console.log('✅ Registration saved successfully!');
    console.log('💾 Saved registration gameTypes:', JSON.stringify(savedRegistration.gameTypes, null, 2));

    // Check captain fields after saving
    savedRegistration.gameTypes.forEach((gt, index) => {
      if (gt.team && gt.team.members) {
        console.log(`🔍 GameType ${index} (${gt.name}) members after save:`);
        gt.team.members.forEach((member, memberIndex) => {
          console.log(`  Member ${memberIndex}: _id=${member._id}, runOrder=${member.runOrder}, captain=${member.captain}`);
        });
      }
    });

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

    // Auto-register team members for relay and team games
    const teamRegistrationResults = {
      created: [],
      updated: [],
      errors: []
    };

    for (const gameType of gameTypesWithInviteCodes) {
      if (gameType.team && gameType.team.members && gameType.team.members.length > 0) {
        console.log(`🏃 Processing team members for ${gameType.name}:`, gameType.team.members);

        for (const member of gameType.team.members) {
          const memberId = member._id;

          // Skip if this is the current user (already registered)
          if (memberId.toString() === req.user._id.toString()) {
            continue;
          }

          try {
            // Check if student exists
            const Student = require('../models/Student');
            const student = await Student.findById(memberId);
            if (!student) {
              teamRegistrationResults.errors.push({
                studentId: memberId,
                error: 'Student not found'
              });
              continue;
            }

            // Check existing registration for this team member
            let existingRegistration = await EventRegistration.findOne({
              studentId: memberId,
              eventId: eventId
            });

            // Prepare game type data for team member - use the same _id as the main user's gameType
            const memberGameTypeData = {
              name: gameType.name,
              group: gameType.group,
              inviteCode: gameType.inviteCode,
              team: {
                ...gameType.team,
                members: gameType.team.members.map((member) => ({
                  ...member
                  // 保持原有的captain字段值，不要重新设置
                }))
              }
            };

            // Explicitly set the _id to match the main user's gameType
            if (gameType._id) {
              memberGameTypeData._id = gameType._id;
            }

            if (existingRegistration) {
              // Check if already registered for this game type
              const existingGameType = existingRegistration.gameTypes.find(gt => gt.name === gameType.name);

              if (existingGameType) {
                // Update existing game type registration
                const gameTypeIndex = existingRegistration.gameTypes.findIndex(gt => gt.name === gameType.name);
                existingRegistration.gameTypes[gameTypeIndex] = memberGameTypeData;

                // Update notes
                const newNote = `团队注册更新: ${gameType.name}`;
                existingRegistration.notes = existingRegistration.notes ?
                  `${existingRegistration.notes}; ${newNote}` : newNote;
              } else {
                // Add new game type to existing registration
                existingRegistration.gameTypes.push(memberGameTypeData);

                const newNote = `加入团队: ${gameType.name}`;
                existingRegistration.notes = existingRegistration.notes ?
                  `${existingRegistration.notes}; ${newNote}` : newNote;
              }

              await existingRegistration.save();
              teamRegistrationResults.updated.push({
                studentId: memberId,
                studentName: student.name,
                registrationId: existingRegistration._id,
                action: existingGameType ? 'updated_game_type' : 'added_game_type'
              });
            } else {
              // Create new registration for team member
              const newRegistration = new EventRegistration({
                eventId: eventId,
                studentId: memberId,
                gameTypes: [memberGameTypeData],
                status: 'pending',
                notes: `团队注册: ${gameType.name}`
              });

              await newRegistration.save();
              teamRegistrationResults.created.push({
                studentId: memberId,
                studentName: student.name,
                registrationId: newRegistration._id
              });
            }
          } catch (error) {
            logger.error(`Error processing team member ${memberId}:`, error);
            teamRegistrationResults.errors.push({
              studentId: memberId,
              error: error.message || 'Processing error'
            });
          }
        }
      }
    }

    // Log team registration results
    if (teamRegistrationResults.created.length > 0 || teamRegistrationResults.updated.length > 0 || teamRegistrationResults.errors.length > 0) {
      logger.info('Team member auto-registration completed', {
        requestId,
        mainRegistrationId: savedRegistration._id,
        teamResults: {
          created: teamRegistrationResults.created.length,
          updated: teamRegistrationResults.updated.length,
          errors: teamRegistrationResults.errors.length
        },
        details: teamRegistrationResults
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
  console.log('🚀 ENDPOINT HIT: /api/registrations/my');
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

    console.log('🔍 Registration query filter:', filter);
    console.log('🔍 User ID:', req.user._id);
    console.log('🔍 Event ID from query:', eventId);

    logger.logDatabase('Getting user registrations', 'eventRegistrations', filter, {});

    let registrations = await EventRegistration.find(filter)
      .populate('eventId', 'eventName organization startDate endDate location gameTypes groups')
      .sort({ registrationDate: -1 });

    console.log('=== STARTING MANUAL POPULATION ===');
    console.log('Registrations found:', registrations.length);

    // Convert to plain objects to allow modification
    registrations = registrations.map(reg => reg.toObject());

    // Manually populate team members
    const Student = require('../models/Student');

    console.log(`🔍 Processing ${registrations.length} registrations for population`);

    for (let registration of registrations) {
      console.log(`📋 Registration gameTypes:`, JSON.stringify(registration.gameTypes, null, 2));
      if (registration.gameTypes && registration.gameTypes.length > 0) {
        console.log(`✅ Found ${registration.gameTypes.length} game types`);
        for (let gameType of registration.gameTypes) {
          console.log(`🎮 Processing game type:`, JSON.stringify(gameType, null, 2));
          if (gameType.team && gameType.team.members && gameType.team.members.length > 0) {
            console.log(`👥 Found ${gameType.team.members.length} team members to populate`);
            const populatedMembers = [];
            for (let member of gameType.team.members) {
              if (member._id) {
                try {
                  console.log(`Looking for student with ID: ${member._id}`);
                  const studentData = await Student.findById(member._id).select('name avatar grade class username gender birthday');
                  console.log(`Student data found for ${member._id}:`, studentData);
                  console.log(`Student name: "${studentData?.name}"`);
                  console.log(`Student username: "${studentData?.username}"`);

                  if (studentData) {
                    populatedMembers.push({
                      _id: member._id,
                      name: studentData.name,
                      username: studentData.username,
                      avatar: studentData.avatar,
                      grade: studentData.grade,
                      class: studentData.class,
                      runOrder: member.runOrder,
                      captain: member.captain
                    });
                    console.log(`Successfully populated member: ${studentData.name}`);
                  } else {
                    console.log(`Student not found for ID: ${member._id}, using fallback`);
                    // If student not found, keep original member data
                    populatedMembers.push({
                      _id: member._id,
                      name: 'Unknown Student',
                      runOrder: member.runOrder,
                      captain: member.captain
                    });
                  }
                } catch (err) {
                  console.error('Error populating team member:', err);
                  // If error occurs, keep original member data with fallback name
                  populatedMembers.push({
                    _id: member._id,
                    name: 'Error Loading Student',
                    runOrder: member.runOrder,
                    captain: member.captain
                  });
                }
              } else {
                populatedMembers.push(member);
              }
            }
            gameType.team.members = populatedMembers;
            console.log(`✅ Updated gameType ${gameType.name} with populated members:`, populatedMembers.map(m => ({ name: m.name, _id: m._id })));
          }
        }
      }
    }

    logger.info('User registrations retrieved successfully', {
      requestId,
      count: registrations.length,
      userId: req.user._id
    });

    // Add debug info to response
    const debugInfo = {
      populationExecuted: true,
      registrationsCount: registrations.length,
      gameTypesProcessed: registrations.reduce((total, reg) => total + (reg.gameTypes ? reg.gameTypes.length : 0), 0),
      membersProcessed: registrations.reduce((total, reg) => {
        if (!reg.gameTypes) return total;
        return total + reg.gameTypes.reduce((gtTotal, gt) => {
          return gtTotal + (gt.team && gt.team.members ? gt.team.members.length : 0);
        }, 0);
      }, 0)
    };

    res.json({ registrations, debug: debugInfo });
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
router.put('/:id', verifyToken, verifyCoachOrStudent, async (req, res) => {
  const requestId = req.requestId;
  logger.info('HTTP Request', {
    requestId,
    method: 'PUT',
    url: `/api/registrations/${req.params.id}`,
    userId: req.user._id,
    body: req.body
  });

  try {
    // First find the registration to check ownership
    const existingRegistration = await EventRegistration.findById(req.params.id);

    if (!existingRegistration) {
      return res.status(404).json({ message: '报名记录未找到' });
    }

    // Check if user can update this registration
    const isOwner = existingRegistration.studentId.toString() === req.user._id.toString();
    const isCoach = req.user.role === 'coach' || req.user.role === 'IT';

    if (!isOwner && !isCoach) {
      return res.status(403).json({ message: '无权限修改此报名' });
    }

    const { status, notes, gameTypes, teamMembers } = req.body;

    const updateData = {};
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (teamMembers !== undefined) updateData.teamMembers = teamMembers;

    // Declare processedGameTypes outside the if block
    let processedGameTypes = [];

    // Handle gameTypes update with invite code preservation
    if (gameTypes !== undefined) {
      console.log('� ProcesDsing gameTypes update with invite code preservation');
      console.log('� Incioming gameTypes:', JSON.stringify(gameTypes, null, 2));
      console.log('📋 Existing gameTypes:', JSON.stringify(existingRegistration.gameTypes, null, 2));
      console.log('👤 User ID:', req.user._id);
      console.log('📝 Registration ID:', req.params.id);

      // Process each incoming game type
      processedGameTypes = [];

      for (const incomingGameType of gameTypes) {
        // Find if this game type already exists in the registration
        const existingGameType = existingRegistration.gameTypes.find(existing =>
          existing.name === incomingGameType.name
        );

        if (existingGameType) {
          // Game type already exists - preserve invite code and update other fields
          console.log(`🔄 Updating existing game type: ${incomingGameType.name}`);
          const updatedGameType = {
            ...incomingGameType,
            _id: existingGameType._id,
            inviteCode: existingGameType.inviteCode // Preserve existing invite code
          };
          console.log(`✅ Preserved invite code for ${incomingGameType.name}: ${existingGameType.inviteCode}`);
          processedGameTypes.push(updatedGameType);
        } else {
          // New game type - generate invite code if it's a relay/team game
          console.log(`🆕 Adding new game type: ${incomingGameType.name}`);
          const newGameType = { ...incomingGameType };

          if (['接力赛', '团队赛'].includes(incomingGameType.name)) {
            if (typeof EventRegistration.generateUniqueInviteCode === 'function') {
              newGameType.inviteCode = await EventRegistration.generateUniqueInviteCode();
              console.log(`🆕 Generated new invite code for ${incomingGameType.name}: ${newGameType.inviteCode}`);
            } else {
              console.error('❌ generateUniqueInviteCode method not found on EventRegistration model');
              throw new Error('generateUniqueInviteCode method not available');
            }
          }

          newGameType._id = new mongoose.Types.ObjectId();
          processedGameTypes.push(newGameType);
        }
      }

      updateData.gameTypes = processedGameTypes;
      console.log('✅ Final processed gameTypes:', JSON.stringify(processedGameTypes, null, 2));
    }

    // Handle team synchronization if gameTypes were updated
    if (gameTypes !== undefined) {
      // Find removed relay/team games that need team cleanup
      const existingRelayGames = existingRegistration.gameTypes.filter(gt =>
        ['接力赛', '团队赛'].includes(gt.name) && gt.inviteCode
      );

      const newRelayGames = processedGameTypes.filter(gt =>
        ['接力赛', '团队赛'].includes(gt.name) && gt.inviteCode
      );

      // Find games that were removed
      const removedRelayGames = existingRelayGames.filter(existing =>
        !newRelayGames.some(newGame => newGame.inviteCode === existing.inviteCode)
      );

      // Clean up team data for removed relay games
      for (const removedGame of removedRelayGames) {
        console.log(`🧹 Cleaning up team data for removed game: ${removedGame.name}, invite code: ${removedGame.inviteCode}`);

        // Find all other team members with this invite code
        const teamRegistrations = await EventRegistration.find({
          'gameTypes.inviteCode': removedGame.inviteCode,
          _id: { $ne: req.params.id } // Exclude current registration
        });

        // Remove the leaving member from other team members' registrations
        for (const teamReg of teamRegistrations) {
          let updated = false;
          teamReg.gameTypes = teamReg.gameTypes.map(gt => {
            if (gt.inviteCode === removedGame.inviteCode && gt.team && gt.team.members) {
              // Remove the leaving member from team
              const originalMemberCount = gt.team.members.length;
              gt.team.members = gt.team.members.filter(member =>
                member._id.toString() !== existingRegistration.studentId.toString()
              );

              if (gt.team.members.length < originalMemberCount) {
                updated = true;
                console.log(`🗑️ Removed member ${existingRegistration.studentId} from team ${gt.team.name}`);

                // Reassign captain if the leaving member was captain
                const hadCaptain = gt.team.members.some(member => member.captain);
                if (!hadCaptain && gt.team.members.length > 0) {
                  gt.team.members[0].captain = true;
                  console.log(`👑 Reassigned captain to ${gt.team.members[0]._id}`);
                }

                // Update run orders if needed
                gt.team.members.forEach((member, index) => {
                  member.runOrder = index + 1;
                });
              }
            }
            return gt;
          });

          if (updated) {
            await teamReg.save();
            console.log(`✅ Updated team registration for student ${teamReg.studentId}`);
          }
        }
      }
    }

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
      userId: req.user._id,
      teamSyncPerformed: gameTypes !== undefined
    });

    res.json(registration);
  } catch (error) {
    console.error('❌ Registration update error:', error);
    logger.logError(error, req);

    if (error.name === 'ValidationError') {
      console.error('Validation error details:', error.message);
      return res.status(400).json({ message: error.message });
    }

    if (error.name === 'CastError') {
      console.error('Cast error details:', error.message);
      return res.status(400).json({ message: '无效的数据格式' });
    }

    console.error('Unexpected error:', error.message, error.stack);
    res.status(500).json({
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @swagger
 * /api/registrations/{id}:
 *   delete:
 *     summary: Cancel and delete registration with team cleanup
 *     description: Deletes the registration record and removes user from any relay/team games, with automatic captain reassignment and team data synchronization
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
 *         description: Registration cancelled, deleted, and team data synchronized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 teamUpdates:
 *                   type: number
 *                 updatedTeamMembers:
 *                   type: array
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
    const registration = await EventRegistration.findById(req.params.id).populate('studentId', 'name username');

    if (!registration) {
      return res.status(404).json({ message: '报名记录未找到' });
    }

    // Check if user can cancel this registration
    const isOwner = registration.studentId._id.toString() === req.user._id.toString();
    const isCoach = req.user.role === 'coach' || req.user.role === 'IT';

    if (!isOwner && !isCoach) {
      return res.status(403).json({ message: '无权限取消此报名' });
    }

    console.log('=== CANCEL REGISTRATION DEBUG START ===');
    console.log('Cancelling registration:', registration._id);
    console.log('User:', registration.studentId.name);
    console.log('Event:', registration.eventId);
    console.log('Game types:', registration.gameTypes.map(gt => gt.name));

    const eventId = registration.eventId;
    const cancelledUserId = registration.studentId._id;
    const teamGameTypes = registration.gameTypes.filter(gt =>
      gt.name.includes('接力') || gt.name === '团队赛'
    );

    console.log('Team game types to process:', teamGameTypes.map(gt => gt.name));

    // Step 1: Remove user from team members in other registrations
    const teamUpdateResults = [];

    for (const gameType of teamGameTypes) {
      if (gameType.team?.members && gameType.team.members.length > 1) {
        console.log(`Processing team removal for ${gameType.name}`);

        // Find all other team members' registrations
        const teamMemberIds = gameType.team.members
          .map(m => m._id)
          .filter(id => id.toString() !== cancelledUserId.toString());

        console.log('Other team member IDs:', teamMemberIds);

        if (teamMemberIds.length > 0) {
          // Find all team members' registrations
          const teamRegistrations = await EventRegistration.find({
            eventId,
            studentId: { $in: teamMemberIds }
          }).populate('studentId', 'name username');

          console.log(`Found ${teamRegistrations.length} team member registrations to update`);

          // Remove cancelled user from each team member's registration
          for (const teamReg of teamRegistrations) {
            const gameTypeIndex = teamReg.gameTypes.findIndex(gt => gt.name === gameType.name);
            if (gameTypeIndex !== -1 && teamReg.gameTypes[gameTypeIndex].team?.members) {
              const originalMembers = teamReg.gameTypes[gameTypeIndex].team.members;
              const updatedMembers = originalMembers.filter(m =>
                m._id.toString() !== cancelledUserId.toString()
              );

              console.log(`Updating ${teamReg.studentId.name}: ${originalMembers.length} -> ${updatedMembers.length} members`);

              // Reassign captain if the cancelled user was captain
              const wasCaptain = originalMembers.find(m =>
                m._id.toString() === cancelledUserId.toString() && m.captain === true
              );

              if (wasCaptain && updatedMembers.length > 0) {
                console.log('Reassigning captain to first remaining member');
                updatedMembers[0].captain = true;
                // Reset other members' captain status
                for (let i = 1; i < updatedMembers.length; i++) {
                  updatedMembers[i].captain = false;
                }
              }

              // Update run orders for relay games
              if (gameType.name.includes('接力')) {
                updatedMembers.forEach((member, index) => {
                  member.runOrder = index + 1;
                });
              }

              teamReg.gameTypes[gameTypeIndex].team.members = updatedMembers;
              await teamReg.save();

              teamUpdateResults.push({
                userId: teamReg.studentId._id,
                name: teamReg.studentId.name,
                gameType: gameType.name,
                updated: true
              });
            }
          }
        }
      }
    }

    // Step 2: Delete the cancelled user's registration
    await EventRegistration.findByIdAndDelete(registration._id);

    console.log('Registration deleted successfully');
    console.log('Team update results:', teamUpdateResults);
    console.log('=== CANCEL REGISTRATION DEBUG END ===');

    logger.info('Registration cancelled and deleted successfully', {
      requestId,
      registrationId: registration._id,
      userId: req.user._id,
      teamUpdates: teamUpdateResults.length
    });

    res.json({
      message: '报名已取消并删除',
      teamUpdates: teamUpdateResults.length,
      updatedTeamMembers: teamUpdateResults
    });
  } catch (error) {
    console.error('Cancel registration error:', error);
    logger.logError(error, req);
    res.status(500).json({ message: 'Server error', error: error.message });
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
      .populate('studentId', 'name username grade class gender birthday avatar role')
      .sort({ registrationDate: -1 });

    // Manually populate team members for relay teams
    for (const registration of registrations) {
      for (const gameType of registration.gameTypes) {
        if (gameType.team && gameType.team.members && gameType.team.members.length > 0) {
          const memberIds = gameType.team.members.map(member => member._id || member);
          const memberDetails = await Student.find({
            _id: { $in: memberIds }
          }).select('name username grade avatar');

          // Create a map for quick lookup
          const memberMap = {};
          memberDetails.forEach(member => {
            memberMap[member._id.toString()] = member;
          });

          // Update team members with full details
          gameType.team.members = gameType.team.members.map(member => {
            const memberId = member._id || member;
            const memberDetail = memberMap[memberId.toString()];
            return {
              _id: memberId,
              name: memberDetail ? memberDetail.name : undefined,
              runOrder: member.runOrder,
              captain: member.captain
            };
          });
        }
      }
    }

    // Transform the response to rename studentId to student
    const transformedRegistrations = registrations.map(reg => {
      const regObj = reg.toObject({ virtuals: true });
      regObj.student = regObj.studentId;
      delete regObj.studentId;
      return regObj;
    });

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
      registrations: transformedRegistrations,
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
      .populate('studentId', 'name username grade class gender birthday avatar')
      .sort({ registeredAt: -1 });

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('报名统计');

    // Set up the header section (rows 1-6)
    worksheet.mergeCells('A1:M1');
    worksheet.getCell('A1').value = `${event.eventName} 报名表`;
    worksheet.getCell('A1').font = { size: 16, bold: true };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };

    // Organization info (row 2-4)
    worksheet.getCell('A2').value = '单位：';
    worksheet.getCell('B2').value = '铁一定向俱乐部';
    worksheet.mergeCells('B2:E2');
    worksheet.getCell('F2').value = '（盖章）';
    worksheet.getCell('H2').value = '填表日期：';
    worksheet.getCell('I2').value = new Date().toLocaleDateString('zh-CN');

    worksheet.getCell('A3').value = '领队：';
    worksheet.mergeCells('B3:E3');
    worksheet.getCell('H3').value = '联系电话：';
    worksheet.mergeCells('I3:M3');

    worksheet.getCell('A4').value = '教练：';
    worksheet.mergeCells('B4:E4');
    worksheet.getCell('H4').value = '联系电话：';
    worksheet.mergeCells('I4:M4');

    // Placeholder row
    worksheet.getCell('F5').value = 'place holder';
    worksheet.mergeCells('F5:M5');

    // Table headers (row 6-7)
    worksheet.getCell('A6').value = '序号';
    worksheet.getCell('B6').value = 'CH卡号';
    worksheet.getCell('C6').value = '姓名';
    worksheet.getCell('D6').value = '身份证号';
    worksheet.getCell('E6').value = '性别';
    worksheet.getCell('F6').value = '出生日期';
    worksheet.getCell('G6').value = '年龄';
    worksheet.getCell('H6').value = '个人项目';
    worksheet.getCell('L6').value = '接力赛';

    // Merge cells for main headers
    worksheet.mergeCells('A6:A7');
    worksheet.mergeCells('B6:B7');
    worksheet.mergeCells('C6:C7');
    worksheet.mergeCells('D6:D7');
    worksheet.mergeCells('E6:E7');
    worksheet.mergeCells('F6:F7');
    worksheet.mergeCells('G6:G7');
    worksheet.mergeCells('H6:K6');
    worksheet.mergeCells('L6:M6');

    // Sub headers for individual events (row 7)
    worksheet.getCell('H7').value = '组别';
    worksheet.getCell('I7').value = '短距离';
    worksheet.getCell('J7').value = '积分';
    worksheet.getCell('K7').value = '百米';

    // Sub headers for relay (row 7)
    worksheet.getCell('L7').value = '组别';
    worksheet.getCell('M7').value = '棒次';

    // Process registrations and organize data
    const relayTeamsMap = new Map();
    const individualRegistrations = [];

    registrations.forEach(registration => {
      const student = registration.studentId;
      if (!student) return;

      // Process each game type
      registration.gameTypes.forEach(gameType => {
        if (gameType.name === '接力赛' || gameType.name === '团队赛') {
          // Handle relay teams
          if (gameType.inviteCode && !relayTeamsMap.has(gameType.inviteCode)) {
            relayTeamsMap.set(gameType.inviteCode, {
              teamName: gameType.team?.name || '未命名团队',
              gameType: gameType.name,
              group: gameType.group,
              difficultyGrade: gameType.difficultyGrade || '',
              members: gameType.team?.members?.map(member => {
                const memberReg = registrations.find(reg => reg.studentId._id.toString() === member._id.toString());
                return {
                  student: memberReg?.studentId,
                  runOrder: member.runOrder,
                  captain: member.captain
                };
              }).sort((a, b) => a.runOrder - b.runOrder) || []
            });
          }
        } else {
          // Handle individual registrations
          individualRegistrations.push({
            student,
            gameType: gameType.name,
            group: gameType.group,
            difficultyGrade: gameType.difficultyGrade || ''
          });
        }
      });
    });

    let currentRow = 8;
    let sequenceNumber = 1;

    // Function to generate distinct colors for groups with better contrast
    const generateGroupColor = (index, total, isRelay = false) => {
      const relayColors = [
        'FFCCE5FF', // Light blue
        'FFFFCCCC', // Light red
        'FFCCFFCC', // Light green
        'FFFFCCFF', // Light magenta
        'FFCCCCFF', // Light purple
        'FFFFFF99', // Light yellow
        'FFCCFFFF', // Light cyan
        'FFFFCC99'  // Light orange
      ];
      
      const individualColors = [
        'FFE6FFE6', // Light green
        'FFFFE6CC', // Light peach
        'FFCCE6FF', // Light blue
        'FFFFE6E6', // Light pink
        'FFE6CCFF', // Light purple
        'FFFFFFE6', // Light yellow
        'FFE6FFFF', // Light cyan
        'FFFFE6FF'  // Light magenta
      ];
      
      const colors = isRelay ? relayColors : individualColors;
      return colors[index % colors.length];
    };

    // Add relay teams first
    const relayTeams = Array.from(relayTeamsMap.values());
    relayTeams.forEach((team, teamIndex) => {
      const teamColor = generateGroupColor(teamIndex, relayTeams.length, true);
      
      team.members.forEach((member, index) => {
        if (member.student) {
          const student = member.student;
          worksheet.getCell(`A${currentRow}`).value = sequenceNumber;
          worksheet.getCell(`B${currentRow}`).value = ''; // CH卡号 - blank
          worksheet.getCell(`C${currentRow}`).value = student.name || '';
          worksheet.getCell(`D${currentRow}`).value = ''; // 身份证号 - blank
          worksheet.getCell(`E${currentRow}`).value = student.gender || '';
          worksheet.getCell(`F${currentRow}`).value = student.birthday ?
            student.birthday.toLocaleDateString('zh-CN') : '';
          worksheet.getCell(`G${currentRow}`).value = ''; // 年龄 - blank

          // Individual events - check if this student has individual registrations
          const studentIndividualRegs = individualRegistrations.filter(reg =>
            reg.student._id.toString() === student._id.toString()
          );

          if (studentIndividualRegs.length > 0) {
            // Set group for individual events with difficulty grade
            const groupText = studentIndividualRegs[0].group +
              (studentIndividualRegs[0].difficultyGrade ? `-${studentIndividualRegs[0].difficultyGrade}` : '');
            worksheet.getCell(`H${currentRow}`).value = groupText;

            // Check each individual game type and mark with √
            studentIndividualRegs.forEach(reg => {
              if (reg.gameType === '短距离') {
                worksheet.getCell(`I${currentRow}`).value = '√';
              } else if (reg.gameType === '积分') {
                worksheet.getCell(`J${currentRow}`).value = '√';
              } else if (reg.gameType === '百米') {
                worksheet.getCell(`K${currentRow}`).value = '√';
              }
            });
          }

          // Relay events - show group with difficulty grade and run order
          const relayGroupText = team.group + (team.difficultyGrade ? `-${team.difficultyGrade}` : '');
          worksheet.getCell(`L${currentRow}`).value = relayGroupText;
          worksheet.getCell(`M${currentRow}`).value = member.runOrder;

          // Apply gradient color to the entire row for this relay team
          for (let col = 1; col <= 13; col++) {
            worksheet.getCell(currentRow, col).fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: teamColor }
            };
          }

          currentRow++;
        }
      });
      sequenceNumber++;
    });

    // Add individual-only registrations (students not in any relay team)
    const relayStudentIds = new Set();
    relayTeams.forEach(team => {
      team.members.forEach(member => {
        if (member.student) {
          relayStudentIds.add(member.student._id.toString());
        }
      });
    });

    const individualOnlyRegs = individualRegistrations.filter(reg =>
      !relayStudentIds.has(reg.student._id.toString())
    );

    // Group individual-only registrations by student
    const individualOnlyByStudent = new Map();
    individualOnlyRegs.forEach(reg => {
      const studentId = reg.student._id.toString();
      if (!individualOnlyByStudent.has(studentId)) {
        individualOnlyByStudent.set(studentId, {
          student: reg.student,
          gameTypes: []
        });
      }
      individualOnlyByStudent.get(studentId).gameTypes.push(reg);
    });

    // Group individual-only students by their group for gradient coloring
    const individualGroupsMap = new Map();
    individualOnlyByStudent.forEach(studentData => {
      if (studentData.gameTypes.length > 0) {
        const groupKey = studentData.gameTypes[0].group + 
          (studentData.gameTypes[0].difficultyGrade ? `-${studentData.gameTypes[0].difficultyGrade}` : '');
        
        if (!individualGroupsMap.has(groupKey)) {
          individualGroupsMap.set(groupKey, []);
        }
        individualGroupsMap.get(groupKey).push(studentData);
      }
    });

    // Add individual-only students with gradient colors by group
    const individualGroups = Array.from(individualGroupsMap.entries());
    individualGroups.forEach(([groupKey, students], groupIndex) => {
      const groupColor = generateGroupColor(groupIndex, individualGroups.length, false);
      
      students.forEach(studentData => {
        const student = studentData.student;
        worksheet.getCell(`A${currentRow}`).value = sequenceNumber;
        worksheet.getCell(`B${currentRow}`).value = ''; // CH卡号 - blank
        worksheet.getCell(`C${currentRow}`).value = student.name || '';
        worksheet.getCell(`D${currentRow}`).value = ''; // 身份证号 - blank
        worksheet.getCell(`E${currentRow}`).value = student.gender || '';
        worksheet.getCell(`F${currentRow}`).value = student.birthday ?
          student.birthday.toLocaleDateString('zh-CN') : '';
        worksheet.getCell(`G${currentRow}`).value = ''; // 年龄 - blank

        // Individual events - set group with difficulty grade and mark game types with √
        if (studentData.gameTypes.length > 0) {
          worksheet.getCell(`H${currentRow}`).value = groupKey;

          studentData.gameTypes.forEach(reg => {
            if (reg.gameType === '短距离') {
              worksheet.getCell(`I${currentRow}`).value = '√';
            } else if (reg.gameType === '积分') {
              worksheet.getCell(`J${currentRow}`).value = '√';
            } else if (reg.gameType === '百米') {
              worksheet.getCell(`K${currentRow}`).value = '√';
            }
          });
        }

        // Apply gradient color to the entire row for this individual group
        for (let col = 1; col <= 13; col++) {
          worksheet.getCell(currentRow, col).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: groupColor }
          };
        }

        currentRow++;
        sequenceNumber++;
      });
    });

    // Style the worksheet
    // Header styling
    worksheet.getRow(6).font = { bold: true };
    worksheet.getRow(7).font = { bold: true };
    worksheet.getRow(6).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
    worksheet.getRow(7).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Set column widths
    worksheet.getColumn('A').width = 8;  // 序号
    worksheet.getColumn('B').width = 10; // CH卡号
    worksheet.getColumn('C').width = 12; // 姓名
    worksheet.getColumn('D').width = 18; // 身份证号
    worksheet.getColumn('E').width = 8;  // 性别
    worksheet.getColumn('F').width = 12; // 出生日期
    worksheet.getColumn('G').width = 8;  // 年龄
    worksheet.getColumn('H').width = 10; // 组别
    worksheet.getColumn('I').width = 10; // 短距离
    worksheet.getColumn('J').width = 8;  // 积分
    worksheet.getColumn('K').width = 8;  // 百米
    worksheet.getColumn('L').width = 10; // 组别
    worksheet.getColumn('M').width = 10; // 接力

    // Add borders to all data cells
    for (let row = 6; row < currentRow; row++) {
      for (let col = 1; col <= 13; col++) {
        const cell = worksheet.getCell(row, col);
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      }
    }

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
      relayTeamCount: relayTeams.length,
      individualOnlyCount: individualOnlyRegs.length,
      userId: req.user._id
    });

    res.end();
  } catch (error) {
    logger.error('Excel export failed', {
      requestId,
      error: error.message,
      stack: error.stack
    });
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
      .populate('studentId', 'name username grade class gender avatar')
      .populate('eventId', 'eventName organization startDate endDate openRegistration gameTypes gameTypeSettings');

    if (!targetRegistration) {
      return res.status(404).json({ message: '无效的邀请码' });
    }

    const event = targetRegistration.eventId;
    const eventId = event._id;

    if (!event.openRegistration) {
      return res.status(400).json({ message: '该赛事未开放报名' });
    }

    // Find the specific game type with the matching invite code
    const targetGameType = targetRegistration.gameTypes.find(gt => {
      return gt && gt.inviteCode === inviteCode;
    });

    if (!targetGameType) {
      return res.status(404).json({ message: '无效的邀请码' });
    }

    const gameTypeName = targetGameType.name;

    // Check if user is already registered for this specific game type (not just the event)
    const existingRegistration = await EventRegistration.findOne({
      eventId,
      studentId: req.user._id
    });

    let isAlreadyRegisteredForGameType = false;
    if (existingRegistration) {
      // Check if user is already registered for this specific game type
      isAlreadyRegisteredForGameType = existingRegistration.gameTypes.some(gt => {
        console.log('Debug - invite-info checking existing gameType:', gt.name, 'vs target:', gameTypeName);
        return gt && gt.name === gameTypeName;
      });
    }

    console.log('Debug - invite-info user already registered for gameType:', isAlreadyRegisteredForGameType);

    // Get current team members with populated user info
    const currentMembers = targetGameType.team?.members || [];
    const memberIds = currentMembers.map(member => member._id || member.$oid);

    // Populate team member details
    const teamMembers = await Student.find({
      _id: { $in: memberIds }
    }).select('username name grade avatar');

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
        grade: memberInfo?.grade,
        avatar: memberInfo?.avatar || ''
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
        grade: targetRegistration.studentId.grade,
        avatar: targetRegistration.studentId.avatar || ''
      },
      teamMembers: formattedMembers,
      isTeamFull: currentMembers.length >= teamSize,
      userStatus: isAlreadyRegisteredForGameType ? 'already_registered' : 'can_join'
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
    const { inviteCode, eventId } = req.body;

    console.log('=== JOIN RELAY DEBUG START ===');
    console.log('Debug - Invite code received:', inviteCode);
    console.log('Debug - Event ID received:', eventId);
    console.log('Debug - User ID:', req.user._id);

    // Validate required fields
    if (!inviteCode) {
      return res.status(400).json({ message: '邀请码是必需的' });
    }

    // Build query filter - use both inviteCode and eventId if provided
    const queryFilter = { 'gameTypes.inviteCode': inviteCode };
    if (eventId) {
      queryFilter.eventId = eventId;
    }

    console.log('Debug - Query filter:', queryFilter);

    // Find target registration by invite code and optionally eventId
    const targetRegistration = await EventRegistration.findOne(queryFilter)
      .populate('studentId', 'username name avatar')
      .populate('eventId', 'eventName organization startDate endDate openRegistration gameTypes gameTypeSettings');

    console.log('Debug - Target registration found:', !!targetRegistration);
    if (targetRegistration) {
      console.log('Debug - Target registration ID:', targetRegistration._id);
      console.log('Debug - Target registration gameTypes count:', targetRegistration.gameTypes.length);
    }

    if (!targetRegistration) {
      return res.status(404).json({ message: '无效的邀请码' });
    }

    const event = targetRegistration.eventId;
    const targetEventId = event._id;

    console.log('Debug - Event ID:', targetEventId);
    console.log('Debug - Event name:', event.eventName);

    if (!event.openRegistration) {
      return res.status(400).json({ message: '该赛事未开放报名' });
    }

    // Check if user is already registered for this specific gameType
    const existingRegistration = await EventRegistration.findOne({
      eventId: targetEventId,
      studentId: req.user._id
    });

    console.log('Debug - Existing registration found:', !!existingRegistration);
    if (existingRegistration) {
      console.log('Debug - Existing registration ID:', existingRegistration._id);
      console.log('Debug - Existing registration gameTypes:', existingRegistration.gameTypes.map(gt => ({
        name: gt.name,
        inviteCode: gt.inviteCode
      })));
    }

    // Find the specific game type with the matching invite code first
    const targetGameType = targetRegistration.gameTypes.find(gt => {
      return gt && gt.inviteCode === inviteCode;
    });

    console.log('Debug - Target game type found:', !!targetGameType);
    if (targetGameType) {
      console.log('Debug - Target game type name:', targetGameType.name);
      console.log('Debug - Target game type invite code:', targetGameType.inviteCode);
    }

    if (!targetGameType) {
      return res.status(404).json({ message: '无效的邀请码' });
    }

    const gameTypeName = targetGameType.name;
    console.log('Debug - Game type name to check:', gameTypeName);

    if (existingRegistration) {
      console.log('Debug - Checking if already registered for game type:', gameTypeName);

      // Check if user is already registered for this specific game type
      const alreadyRegisteredForGameType = existingRegistration.gameTypes.some(gt => {
        console.log('Debug - Comparing existing game type:', gt.name, 'with target:', gameTypeName);
        return gt.name === gameTypeName;
      });

      console.log('Debug - Already registered for this game type:', alreadyRegisteredForGameType);

      if (alreadyRegisteredForGameType) {
        console.log('Debug - Blocking registration - already registered for:', gameTypeName);
        console.log('=== JOIN RELAY DEBUG END ===');
        return res.status(409).json({ message: `您已报名该赛事的${gameTypeName}项目` });
      }
    }

    console.log('Debug - Proceeding with registration for game type:', gameTypeName);

    // Add validation for targetGameType structure
    if (typeof targetGameType !== 'object' || !targetGameType.name) {
      console.error('Debug - Invalid targetGameType structure:', targetGameType);
      return res.status(400).json({ message: '游戏类型数据结构异常' });
    }

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

    // Create the new member object with proper format
    const newMember = {
      _id: new mongoose.Types.ObjectId(req.user._id),
      captain: false // New members are never captains
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

    // Create properly formatted gameType for the user
    const newUserGameType = {
      ...updatedTargetGameType,
      team: {
        ...updatedTargetGameType.team,
        members: updatedTargetGameType.team.members.map(member => {
          // Ensure all members have proper ObjectId format and consistent structure
          const memberId = member._id || member.$oid;
          const result = {
            _id: new mongoose.Types.ObjectId(memberId),
            captain: member.captain || false // Ensure captain field is always present
          };

          // Add runOrder for relay games only
          if (member.runOrder !== undefined) {
            result.runOrder = member.runOrder;
          }

          return result;
        })
      }
    };

    let userRegistration;

    if (existingRegistration) {
      // User already has a registration for this event, add the new game type
      existingRegistration.gameTypes.push(newUserGameType);
      userRegistration = existingRegistration;

      // Update notes to include the new team join
      const existingNotes = existingRegistration.notes || '';
      const newNote = `通过分享链接加入 ${targetRegistration.studentId.username} 的${gameTypeName}队伍`;
      existingRegistration.notes = existingNotes ? `${existingNotes}; ${newNote}` : newNote;
    } else {
      // Create new registration for the joining user
      userRegistration = new EventRegistration({
        eventId: targetEventId,
        studentId: req.user._id,
        gameTypes: [newUserGameType],
        status: 'pending',
        notes: `通过分享链接加入 ${targetRegistration.studentId.username} 的${gameTypeName}队伍`
      });
    }

    // Update target registration with new team member
    targetRegistration.gameTypes = updatedGameTypes;

    // Save both registrations
    await Promise.all([
      userRegistration.save(),
      targetRegistration.save()
    ]);

    // Populate the user registration
    await userRegistration.populate('eventId', 'eventName organization startDate endDate');
    await userRegistration.populate('studentId', 'username email profile.realName profile.grade');

    logger.info('Successfully joined relay team', {
      requestId,
      userRegistrationId: userRegistration._id,
      targetRegistrationId: targetRegistration._id,
      inviteCode,
      eventId,
      userId: req.user._id,
      gameTypeName: gameTypeName,
      existingRegistration: !!existingRegistration
    });

    console.log('Debug - Successfully joined relay team for game type:', gameTypeName);
    console.log('=== JOIN RELAY DEBUG END ===');

    res.status(200).json({
      message: `成功加入${gameTypeName}队伍`,
      registration: userRegistration
    });
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
 * /api/registrations/{registrationId}/remove-member:
 *   delete:
 *     summary: Remove team member (captain only)
 *     tags: [Registrations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: registrationId
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
 *             required:
 *               - memberStudentId
 *               - gameTypeName
 *             properties:
 *               memberStudentId:
 *                 type: string
 *                 description: Student ID of the member to remove
 *               gameTypeName:
 *                 type: string
 *                 description: Game type name (e.g., "接力赛")
 *               eventId:
 *                 type: string
 *                 description: Event ID (optional)
 *               inviteCode:
 *                 type: string
 *                 description: Invite code for the game type (optional)
 *     responses:
 *       200:
 *         description: Member removed successfully
 *       400:
 *         description: Invalid request or cannot remove captain
 *       403:
 *         description: Only captain can remove members
 *       404:
 *         description: Registration or member not found
 *       500:
 *         description: Server error
 */
router.delete('/:registrationId/remove-member', verifyToken, verifyCoachOrStudent, async (req, res) => {
  const requestId = req.requestId;
  logger.info('HTTP Request', {
    requestId,
    method: 'DELETE',
    url: `/api/registrations/${req.params.registrationId}/remove-member`,
    userId: req.user._id,
    body: req.body
  });

  try {
    const { registrationId } = req.params;
    const { memberStudentId, gameTypeName, eventId, inviteCode } = req.body;

    // Validate required fields
    if (!memberStudentId || !gameTypeName) {
      return res.status(400).json({ message: '成员ID和游戏类型名称是必需的' });
    }

    // Find the registration
    const registration = await EventRegistration.findById(registrationId)
      .populate('studentId', 'username');

    if (!registration) {
      return res.status(404).json({ message: '报名记录未找到' });
    }

    // Find the specific game type
    const gameType = registration.gameTypes.find(gt => gt.name === gameTypeName);
    if (!gameType) {
      return res.status(404).json({ message: '游戏类型未找到' });
    }

    // Check if it's a team game (relay or team)
    if (!gameTypeName.includes('接力') && !gameTypeName.includes('团队')) {
      return res.status(400).json({ message: '只有接力赛和团队赛支持移除成员功能' });
    }

    // Check if team exists and has members
    if (!gameType.team || !gameType.team.members || gameType.team.members.length === 0) {
      return res.status(400).json({ message: '该游戏类型没有团队成员' });
    }

    // Find the captain (current user must be captain)
    const currentUserMember = gameType.team.members.find(member =>
      member._id.toString() === req.user._id.toString()
    );

    if (!currentUserMember || !currentUserMember.captain) {
      return res.status(403).json({ message: '只有队长可以移除团队成员' });
    }

    // Find the member to remove
    const memberToRemove = gameType.team.members.find(member =>
      member._id.toString() === memberStudentId.toString()
    );

    if (!memberToRemove) {
      return res.status(404).json({ message: '要移除的成员未找到' });
    }

    // Cannot remove captain
    if (memberToRemove.captain) {
      return res.status(400).json({ message: '不能移除队长，请先转让队长权限' });
    }

    // Get the invite code for this game type
    const gameTypeInviteCode = gameType.inviteCode;

    if (!gameTypeInviteCode) {
      return res.status(400).json({ message: '该游戏类型没有邀请码，无法进行团队操作' });
    }

    // Find all registrations with the same invite code (all team members)
    const allTeamRegistrations = await EventRegistration.find({
      'gameTypes.inviteCode': gameTypeInviteCode
    });

    logger.info('Found team registrations for removal', {
      requestId,
      inviteCode: gameTypeInviteCode,
      registrationCount: allTeamRegistrations.length,
      memberToRemove: memberStudentId
    });

    // Remove the member from all team registrations and delete the member's registration if they only have this game type
    const updatePromises = [];

    for (const teamReg of allTeamRegistrations) {
      const teamGameType = teamReg.gameTypes.find(gt => gt.inviteCode === gameTypeInviteCode);

      if (teamGameType && teamGameType.team && teamGameType.team.members) {
        // Remove the member from the team
        teamGameType.team.members = teamGameType.team.members.filter(member =>
          member._id.toString() !== memberStudentId.toString()
        );

        // For relay games, update run orders after removal
        if (gameTypeName.includes('接力')) {
          teamGameType.team.members.forEach((member, index) => {
            member.runOrder = index + 1;
          });
        }

        // If this is the member being removed and they only have this game type, delete the entire registration
        if (teamReg.studentId.toString() === memberStudentId.toString() && teamReg.gameTypes.length === 1) {
          updatePromises.push(EventRegistration.findByIdAndDelete(teamReg._id));
          logger.info('Deleting entire registration for removed member', {
            requestId,
            registrationId: teamReg._id,
            studentId: memberStudentId
          });
        } else {
          // If the member has other game types, just remove this game type
          if (teamReg.studentId.toString() === memberStudentId.toString()) {
            teamReg.gameTypes = teamReg.gameTypes.filter(gt => gt.inviteCode !== gameTypeInviteCode);
          }
          updatePromises.push(teamReg.save());
        }
      }
    }

    // Execute all updates
    await Promise.all(updatePromises);

    logger.info('Team member removed successfully', {
      requestId,
      registrationId,
      memberRemoved: memberStudentId,
      gameTypeName,
      captainId: req.user._id,
      inviteCode: gameTypeInviteCode
    });

    res.json({
      message: '团队成员已成功移除',
      removedMember: memberStudentId,
      gameType: gameTypeName
    });

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
 * /api/registrations/sync-team:
 *   post:
 *     summary: Synchronize team data across all team members
 *     tags: [Registrations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               eventId:
 *                 type: string
 *               gameTypeName:
 *                 type: string
 *               updates:
 *                 type: object
 *               initiatorUserId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Team data synchronized successfully
 *       400:
 *         description: Invalid request data
 *       404:
 *         description: Registration not found
 *       500:
 *         description: Server error
 */
router.post('/sync-team', verifyToken, verifyCoachOrStudent, async (req, res) => {
  const requestId = req.requestId;
  logger.info('HTTP Request', {
    requestId,
    method: 'POST',
    url: '/api/registrations/sync-team',
    userId: req.user._id,
    body: req.body
  });

  try {
    const { eventId, gameTypeName, updates } = req.body;
    const initiatorUserId = req.user._id; // Use authenticated user as initiator

    console.log('=== TEAM SYNC DEBUG START ===');
    console.log('Event ID:', eventId);
    console.log('Game Type:', gameTypeName);
    console.log('Updates:', updates);
    console.log('Initiator User ID:', initiatorUserId);

    // Validate required fields
    if (!eventId || !gameTypeName || !updates) {
      return res.status(400).json({
        message: '缺少必需的参数：eventId, gameTypeName, updates'
      });
    }

    // 1. Find initiator's registration
    const initiatorRegistration = await EventRegistration.findOne({
      eventId,
      studentId: initiatorUserId
    }).populate('studentId', 'name username');

    if (!initiatorRegistration) {
      return res.status(404).json({ message: '找不到发起者的报名记录' });
    }

    console.log('Found initiator registration:', initiatorRegistration._id);

    // 2. Find the specific game type
    const gameType = initiatorRegistration.gameTypes.find(gt => gt.name === gameTypeName);
    if (!gameType) {
      return res.status(400).json({ message: `找不到游戏类型: ${gameTypeName}` });
    }

    // Check if it's a team game
    if (!gameTypeName.includes('接力') && gameTypeName !== '团队赛') {
      return res.status(400).json({ message: '只有接力赛和团队赛支持团队同步' });
    }

    if (!gameType.team?.members || gameType.team.members.length === 0) {
      return res.status(400).json({ message: '找不到团队成员信息' });
    }

    console.log('Found game type with team members:', gameType.team.members.length);

    // 3. Get all team member IDs
    const teamMemberIds = gameType.team.members.map(m => m._id);
    console.log('Team member IDs:', teamMemberIds);

    // 4. Find all team members' registrations
    const teamRegistrations = await EventRegistration.find({
      eventId,
      studentId: { $in: teamMemberIds }
    }).populate('studentId', 'name username');

    console.log('Found team registrations:', teamRegistrations.length);

    // 5. Identify missing registrations and create them
    const existingMemberIds = teamRegistrations.map(reg => reg.studentId._id.toString());
    const missingMemberIds = teamMemberIds.filter(id => !existingMemberIds.includes(id.toString()));

    console.log('Missing member IDs:', missingMemberIds);

    // Create missing registrations
    for (const missingMemberId of missingMemberIds) {
      try {
        const student = await Student.findById(missingMemberId);
        if (student) {
          console.log(`Creating new registration for ${student.name}`);

          // Create new registration with the team game type
          const newRegistration = new EventRegistration({
            eventId,
            studentId: missingMemberId,
            gameTypes: [{
              name: gameTypeName,
              group: gameType.group,
              team: {
                ...gameType.team,
                // Apply team name update if provided
                ...(updates.teamName && { name: updates.teamName })
              }
            }],
            status: 'pending',
            notes: `通过团队邀请加入${gameTypeName}`
          });

          await newRegistration.save();

          // Add to team registrations for processing
          teamRegistrations.push({
            ...newRegistration.toObject(),
            studentId: student
          });

          console.log(`Created new registration for ${student.name}`);
        }
      } catch (error) {
        console.error(`Failed to create registration for member ${missingMemberId}:`, error);
      }
    }

    // 6. Update each registration (existing and newly created)
    const updateResults = [];
    for (const registration of teamRegistrations) {
      const gameTypeIndex = registration.gameTypes.findIndex(gt => gt.name === gameTypeName);
      if (gameTypeIndex !== -1) {
        console.log(`Updating registration for ${registration.studentId.name}`);

        // Apply updates (e.g., group change, team name change)
        Object.assign(registration.gameTypes[gameTypeIndex], updates);

        // Ensure team data consistency - use the initiator's team data as the source of truth
        registration.gameTypes[gameTypeIndex].team = {
          ...gameType.team,
          // Apply team name update if provided
          ...(updates.teamName && { name: updates.teamName })
        };

        // Save the registration (handle both Mongoose documents and plain objects)
        if (registration.save) {
          await registration.save();
        } else {
          // For newly created registrations that might be plain objects
          await EventRegistration.findByIdAndUpdate(registration._id, {
            gameTypes: registration.gameTypes
          });
        }

        updateResults.push({
          userId: registration.studentId._id,
          name: registration.studentId.name,
          updated: true,
          created: missingMemberIds.includes(registration.studentId._id.toString())
        });
      } else {
        console.log(`Game type ${gameTypeName} not found for ${registration.studentId.name}`);
        updateResults.push({
          userId: registration.studentId._id,
          name: registration.studentId.name,
          updated: false,
          reason: 'Game type not found'
        });
      }
    }

    console.log('Update results:', updateResults);
    console.log('=== TEAM SYNC DEBUG END ===');

    logger.info('Team sync completed', {
      requestId,
      eventId,
      gameTypeName,
      updatedCount: updateResults.filter(r => r.updated).length,
      totalMembers: updateResults.length
    });

    const updatedCount = updateResults.filter(r => r.updated).length;
    const createdCount = updateResults.filter(r => r.created).length;

    res.json({
      success: true,
      message: '团队数据同步成功',
      updatedRegistrations: updatedCount,
      createdRegistrations: createdCount,
      totalMembers: updateResults.length,
      teamMembers: updateResults
    });

  } catch (error) {
    console.error('Team sync error:', error);
    logger.error('Team sync failed', {
      requestId,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      message: '团队数据同步失败',
      error: error.message
    });
  }
});

module.exports = router;