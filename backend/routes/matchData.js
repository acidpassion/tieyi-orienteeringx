const express = require('express');
const axios = require('axios');
const MatchRef = require('../models/MatchRef');
const MatchResult = require('../models/MatchResult');
const CompletionRecord = require('../models/CompletionRecord');
const Event = require('../models/Event');
const Student = require('../models/Student');
const { verifyToken, verifyCoach } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * @swagger
 * /api/match-data/load/{externalGameId}:
 *   post:
 *     summary: Load match information and results from external API
 *     tags: [MatchData]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: externalGameId
 *         required: true
 *         schema:
 *           type: string
 *         description: External game ID
 *     responses:
 *       200:
 *         description: Match data loaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     matchRef:
 *                       type: object
 *                     resultsCount:
 *                       type: number
 *       400:
 *         description: Invalid external game ID
 *       404:
 *         description: Match data not found
 *       500:
 *         description: Server error
 */
router.post('/load/:externalGameId', verifyToken, verifyCoach, async (req, res) => {
  const requestId = req.requestId;
  const { externalGameId } = req.params;

  logger.info('HTTP Request', {
    requestId,
    method: 'POST',
    url: `/api/match-data/load/${externalGameId}`,
    userId: req.user._id
  });

  try {
    if (!externalGameId || !externalGameId.trim()) {
      return res.status(400).json({
        success: false,
        message: '外部项目ID不能为空'
      });
    }

    logger.info('Loading match data from external API', {
      requestId,
      externalGameId,
      userId: req.user._id
    });

    // Step 1: Load match info from external API
    const matchInfoUrl = `https://api.verymuchsport.cn/app-api/match/game/info/${externalGameId}`;

    logger.info('Fetching match info', {
      requestId,
      url: matchInfoUrl
    });

    let matchInfoResponse;
    try {
      matchInfoResponse = await axios.get(matchInfoUrl, {
        timeout: 10000, // 10 second timeout
        headers: {
          'User-Agent': 'OrienteeringX-System/1.0'
        }
      });
    } catch (error) {
      logger.error('Failed to fetch match info from external API', {
        requestId,
        error: error.message,
        url: matchInfoUrl,
        status: error.response?.status
      });

      if (error.response?.status === 404) {
        return res.status(404).json({
          success: false,
          message: '未找到该项目的比赛信息，请检查外部项目ID是否正确'
        });
      }

      return res.status(500).json({
        success: false,
        message: '获取比赛信息失败，请稍后重试'
      });
    }

    // Check if response is successful
    if (matchInfoResponse.status !== 200 || matchInfoResponse.data.code !== 0) {
      logger.error('External API returned error', {
        requestId,
        status: matchInfoResponse.status,
        responseCode: matchInfoResponse.data.code,
        responseData: matchInfoResponse.data
      });

      return res.status(400).json({
        success: false,
        message: '外部API返回错误，请检查项目ID是否有效'
      });
    }

    const matchData = matchInfoResponse.data.data;

    // Extract gameId and name for duplication checking
    const gameId = matchData.gameId || externalGameId;
    const name = matchData.name || matchData.gameName || '';

    if (!name) {
      return res.status(400).json({
        success: false,
        message: '比赛信息中缺少名称字段'
      });
    }

    // Step 2: Upsert match reference data
    logger.info('Upserting match reference data', {
      requestId,
      gameId,
      name
    });

    const matchRef = await MatchRef.findOneAndUpdate(
      { gameId, name },
      {
        gameId,
        name,
        ...matchData // Spread the matchData directly into the document
      },
      {
        upsert: true,
        new: true,
        runValidators: true
      }
    );

    logger.info('Match reference data saved', {
      requestId,
      matchRefId: matchRef._id,
      gameId,
      name
    });

    // Step 3: Load results from external API
    const resultsUrl = `https://api.verymuchsport.cn/app-api/match/game/runner/list?gameId=${externalGameId}`;

    logger.info('Fetching match results', {
      requestId,
      url: resultsUrl
    });

    let resultsResponse;
    try {
      resultsResponse = await axios.get(resultsUrl, {
        timeout: 15000, // 15 second timeout for results (might be larger)
        headers: {
          'User-Agent': 'OrienteeringX-System/1.0'
        }
      });
    } catch (error) {
      logger.error('Failed to fetch results from external API', {
        requestId,
        error: error.message,
        url: resultsUrl,
        status: error.response?.status
      });

      // Don't fail the entire request if results can't be fetched
      return res.json({
        success: true,
        message: '比赛信息加载成功，但获取成绩数据失败',
        data: {
          matchRef,
          resultsCount: 0,
          resultsError: error.message
        }
      });
    }

    // Check if results response is successful
    if (resultsResponse.status !== 200 || resultsResponse.data.code !== 0) {
      logger.error('External API returned error for results', {
        requestId,
        status: resultsResponse.status,
        responseCode: resultsResponse.data.code
      });

      return res.json({
        success: true,
        message: '比赛信息加载成功，但获取成绩数据失败',
        data: {
          matchRef,
          resultsCount: 0,
          resultsError: 'External API returned error'
        }
      });
    }

    const resultsData = resultsResponse.data.data;

    // Step 4: Process and upsert results data
    let resultsCount = 0;

    if (Array.isArray(resultsData)) {
      logger.info('Processing results data', {
        requestId,
        totalResults: resultsData.length
      });

      for (const result of resultsData) {
        const resultId = result.id;

        if (!resultId) {
          logger.warn('Skipping result without ID', {
            requestId,
            result
          });
          continue;
        }

        try {
          await MatchResult.findOneAndUpdate(
            { gameId: externalGameId, id: resultId },
            {
              gameId: externalGameId,
              id: resultId,
              ...result // Spread the result data directly into the document
            },
            {
              upsert: true,
              new: true,
              runValidators: true
            }
          );

          resultsCount++;
        } catch (error) {
          logger.error('Failed to upsert result', {
            requestId,
            resultId,
            error: error.message
          });
        }
      }
    } else if (resultsData && typeof resultsData === 'object') {
      // Handle case where results data is a single object
      const resultId = resultsData.id;

      if (resultId) {
        try {
          await MatchResult.findOneAndUpdate(
            { gameId: externalGameId, id: resultId },
            {
              gameId: externalGameId,
              id: resultId,
              ...resultsData // Spread the result data directly into the document
            },
            {
              upsert: true,
              new: true,
              runValidators: true
            }
          );

          resultsCount = 1;
        } catch (error) {
          logger.error('Failed to upsert single result', {
            requestId,
            resultId,
            error: error.message
          });
        }
      }
    }

    logger.info('Match data loading completed', {
      requestId,
      gameId,
      name,
      resultsCount,
      userId: req.user._id
    });

    res.json({
      success: true,
      message: `比赛信息加载成功，共处理 ${resultsCount} 条成绩记录`,
      data: {
        matchRef,
        resultsCount
      }
    });

  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({
      success: false,
      message: '服务器错误，请稍后重试'
    });
  }
});

/**
 * @swagger
 * /api/match-data/save-results/{externalGameId}:
 *   post:
 *     summary: Convert match results to completion records
 *     tags: [MatchData]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: externalGameId
 *         required: true
 *         schema:
 *           type: string
 *         description: External game ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - eventId
 *               - gameType
 *             properties:
 *               eventId:
 *                 type: string
 *                 description: Event ID from the system
 *               gameType:
 *                 type: string
 *                 description: Game type name
 *     responses:
 *       200:
 *         description: Results saved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     processedCount:
 *                       type: number
 *                     createdCount:
 *                       type: number
 *                     updatedCount:
 *                       type: number
 *       400:
 *         description: Invalid request data
 *       404:
 *         description: Event or match results not found
 *       500:
 *         description: Server error
 */
router.post('/save-results/:externalGameId', verifyToken, verifyCoach, async (req, res) => {
  const requestId = req.requestId;
  const { externalGameId } = req.params;
  const { eventId, gameType } = req.body;

  logger.info('HTTP Request', {
    requestId,
    method: 'POST',
    url: `/api/match-data/save-results/${externalGameId}`,
    userId: req.user._id,
    body: req.body
  });

  try {
    // Validate input
    if (!externalGameId || !eventId || !gameType) {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数：外部项目ID、赛事ID或比赛项目'
      });
    }

    // Get event details
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: '未找到指定的赛事'
      });
    }

    // Get all students for name validation
    const students = await Student.find({}, { name: 1 });
    const studentNames = new Set(students.map(s => s.name));

    // Debug: Check if the missing student exists in the system
    console.log(`🔍 DEBUG - Does "凌子琪" exist in students collection? ${studentNames.has('凌子琪')}`);
    console.log(`🔍 DEBUG - Students with similar names:`, Array.from(studentNames).filter(name => name.includes('凌') || name.includes('琪')));

    // Get match results for this game
    const matchResults = await MatchResult.find({ gameId: externalGameId });

    if (matchResults.length === 0) {
      return res.status(404).json({
        success: false,
        message: '未找到该项目的比赛结果数据'
      });
    }

    logger.info('Processing match results', {
      requestId,
      externalGameId,
      gameType,
      totalResults: matchResults.length,
      eventName: event.eventName
    });

    console.log(`📊 Debug: Total students in system: ${studentNames.size}`);
    console.log(`📊 Debug: Sample student names:`, Array.from(studentNames).slice(0, 10));
    console.log(`📊 Debug: Sample match result names:`, matchResults.slice(0, 5).map(r => ({ name: r.name, clubName: r.clubName })));
    console.log(`📊 Debug: Sample match result data structure:`, matchResults.slice(0, 2).map(r => ({
      name: r.name,
      totleTime: r.totleTime,
      totalTime: r.totalTime,
      time: r.time,
      finishTime: r.finishTime,
      result: r.result,
      groupName: r.groupName,
      validity: r.validity,
      reason: r.reason,
      punchs: r.punchs ? `Array[${r.punchs.length}]` : null,
      allFields: Object.keys(r)
    })));

    // Debug: Check for team 249 members in raw match results
    const team249Members = matchResults.filter(r => r.teamId === 249 || r.teamId === '249');
    console.log(`🔍 DEBUG - Team 249 members in raw match results:`, team249Members.map(r => ({
      name: r.name,
      clubName: r.clubName,
      teamId: r.teamId,
      validity: r.validity,
      totleTime: r.totleTime
    })));

    // Test CompletionRecord model
    try {
      const testCount = await CompletionRecord.countDocuments();
      console.log(`📊 Debug: Current CompletionRecord count in database: ${testCount}`);
    } catch (error) {
      console.error(`❌ Debug: Error accessing CompletionRecord model:`, error);
    }

    // Deduplicate results - handle multiple records for same runner
    const deduplicatedResults = deduplicateResults(matchResults);
    console.log(`🔄 Debug: Deduplicated results: ${matchResults.length} -> ${deduplicatedResults.length}`);

    // Calculate positions for ALL results (including all clubs for accurate ranking)
    const processedResults = await calculatePositions(deduplicatedResults, externalGameId);

    // Filter results for students with clubName containing "铁一" or in allowed clubs list, and name exists in students collection
    const validResults = processedResults.filter(result => {
      const clubName = result.clubName || '';
      const name = result.name || '';
      const clubs = ["中山市定向运动协会", "广州一米体育艺术有限公司", "广州市白云区定向运动协会", "广州欧酷体育科技有限公司", "广州花迹体育发展有限公司", "广州轨迹体育发展有限公司", "斑马定向（南京）体育有限公司", "斑马定向（扬州）体育有限公司", "深圳市宝安区海韵学校（集团）海韵学校", "中山大学"];
      
      const isValidClub = clubName.includes('铁一') || clubs.includes(clubName);
      const isValidStudent = studentNames.has(name) && isValidClub;

      return isValidStudent;
    });

    logger.info('Filtered valid results for saving', {
      requestId,
      validResults: validResults.length,
      totalResults: matchResults.length,
      processedResults: processedResults.length
    });

    if (validResults.length === 0) {
      return res.status(400).json({
        success: false,
        message: '没有找到符合条件的成绩记录（俱乐部名称包含"铁一"且学生姓名存在于系统中）'
      });
    }



    console.log(`🎯 Debug: Valid results count: ${validResults.length}`);
    console.log(`🎯 Debug: Sample valid results:`, validResults.slice(0, 3).map(r => ({
      name: r.name,
      totleTime: r.totleTime,
      position: r.position,
      groupName: r.groupName,
      validity: r.validity
    })));

    // Convert to completion records
    let createdCount = 0;
    let updatedCount = 0;

    for (const [index, result] of validResults.entries()) {
      try {
        // Debug: Check what fields are available in the result
        console.log(`🔍 Debug [${index + 1}/${validResults.length}]: Raw result data for ${result.name}:`, {
          name: result.name,
          totleTime: result.totleTime,
          totalTime: result.totalTime,
          time: result.time,
          finishTime: result.finishTime,
          result: result.result,
          groupName: result.groupName,
          validity: result.validity,
          position: result.position,
          reason: result.reason,
          punchs: result.punchs ? `Array[${result.punchs.length}]` : null,
          allFields: Object.keys(result)
        });

        // Try different possible time field names (note: totleTime is the correct field name with typo)
        const individualTime = result.totleTime || result.totalTime || result.time || result.finishTime || result.result || 'DNF';

        // For relay games, use team total time as result, individual time as relayPersonalTotalTime
        let resultTime = individualTime;
        let relayPersonalTime = null;

        if (result.teamId && result.teamId > 0 && result.teamRankingTime) {
          // This is a relay team member - use team total time as result
          resultTime = formatMsToTime(result.teamRankingTime);
          relayPersonalTime = individualTime;
          console.log(`🏃 Debug: Relay member ${result.name} - Personal: ${relayPersonalTime}, Team Total: ${resultTime}`);
        }

        const completionRecordData = {
          name: result.name,
          eventName: event.eventName,
          eventType: event.eventType,
          gameType: gameType,
          result: resultTime,
          groupName: result.groupName || 'Unknown',
          validity: result.validity === true, // Only true is valid, false and null are invalid
          position: result.position, // Keep null for invalid results, don't default to 999
          eventDate: event.startDate,
          reason: result.reason || null, // Copy reason field from match_result
          punchs: result.punchs || null, // Copy punchs array from match_result
          relayPersonalTotalTime: relayPersonalTime, // Store individual time for relay games
          teamId: (result.teamId && result.teamId > 0) ? result.teamId.toString() : null // Store teamId for relay games
        };

        console.log(`💾 Debug [${index + 1}/${processedResults.length}]: Saving completion record for ${result.name}:`, completionRecordData);

        // Check if record already exists
        const existingRecord = await CompletionRecord.findOne({
          name: result.name,
          eventName: event.eventName,
          gameType: gameType
        });

        console.log(`🔍 Debug: Existing record found:`, existingRecord ? 'YES' : 'NO');

        // Upsert the record
        const savedRecord = await CompletionRecord.findOneAndUpdate(
          {
            name: result.name,
            eventName: event.eventName,
            gameType: gameType
          },
          completionRecordData,
          {
            upsert: true,
            new: true,
            runValidators: true
          }
        );

        console.log(`✅ Debug: Record saved successfully for ${result.name}, ID: ${savedRecord._id}`);

        // Proper way to detect if it was created or updated
        if (existingRecord) {
          updatedCount++;
          console.log(`📝 Debug: Updated existing record for ${result.name}`);
        } else {
          createdCount++;
          console.log(`🆕 Debug: Created new record for ${result.name}`);
        }

      } catch (error) {
        console.error(`❌ Debug: Failed to save completion record for ${result.name}:`, error);
        logger.error('Failed to save completion record', {
          requestId,
          result: result.name,
          error: error.message,
          stack: error.stack
        });
      }
    }

    logger.info('Results conversion completed', {
      requestId,
      processedCount: validResults.length,
      createdCount,
      updatedCount,
      eventName: event.eventName,
      gameType
    });

    res.json({
      success: true,
      message: `成绩保存成功！处理了 ${validResults.length} 条记录，新增 ${createdCount} 条，更新 ${updatedCount} 条`,
      data: {
        processedCount: validResults.length,
        createdCount,
        updatedCount
      }
    });

  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({
      success: false,
      message: '服务器错误，请稍后重试'
    });
  }
});

// Helper function to deduplicate results for same runner
// Handles device replacement cases where a runner has multiple records
function deduplicateResults(results) {
  console.log(`🔄 Debug: Starting deduplication of ${results.length} results`);

  // Group results by unique key: gameId + name + clubName + groupName
  const groupedResults = {};

  results.forEach(result => {
    const key = `${result.gameId || ''}_${result.name || ''}_${result.clubName || ''}_${result.groupName || ''}`;

    if (!groupedResults[key]) {
      groupedResults[key] = [];
    }
    groupedResults[key].push(result);
  });

  const deduplicatedResults = [];

  // Process each group
  for (const [key, duplicates] of Object.entries(groupedResults)) {
    if (duplicates.length === 1) {
      // No duplicates, keep the single result
      deduplicatedResults.push(duplicates[0]);
    } else {
      // Multiple records for same runner, apply priority logic
      console.log(`🔍 Debug: Found ${duplicates.length} duplicates for key: ${key}`);
      console.log(`🔍 Debug: Duplicate records:`, duplicates.map(r => ({
        name: r.name,
        validity: r.validity,
        totleTime: r.totleTime,
        id: r.id
      })));

      // Priority logic for device replacement cases:
      // 1. For individual games: validity = true has highest priority
      // 2. validity = false has second priority (explicit invalid result)
      // 3. validity = null has lowest priority (should be treated as invalid for individual games)

      const validityPriority = (validity) => {
        if (validity === true) return 1;   // Highest priority - valid result
        if (validity === false) return 2;  // Second priority - explicitly invalid
        if (validity === null || validity === undefined) return 3; // Lowest priority - treat as invalid for individual games
        return 4; // Any other value
      };

      // Sort by validity priority, then by original order
      duplicates.sort((a, b) => {
        const priorityA = validityPriority(a.validity);
        const priorityB = validityPriority(b.validity);
        return priorityA - priorityB;
      });

      const selectedResult = duplicates[0];
      console.log(`✅ Debug: Selected result for ${selectedResult.name}:`, {
        validity: selectedResult.validity,
        totleTime: selectedResult.totleTime,
        id: selectedResult.id,
        reason: `Priority: ${validityPriority(selectedResult.validity)}`
      });

      deduplicatedResults.push(selectedResult);
    }
  }

  console.log(`🔄 Debug: Deduplication completed: ${results.length} -> ${deduplicatedResults.length}`);
  return deduplicatedResults;
}

// Helper function to calculate positions
async function calculatePositions(results, gameId) {
  console.log(`🏁 Debug: calculatePositions called with ${results.length} results for gameId: ${gameId}`);

  // Group results by groupName
  const groupedResults = {};

  results.forEach(result => {
    const groupName = result.groupName || 'default';
    if (!groupedResults[groupName]) {
      groupedResults[groupName] = [];
    }
    groupedResults[groupName].push(result);
  });

  console.log(`📊 Debug: Grouped results by groupName:`, Object.keys(groupedResults).map(key => ({
    groupName: key,
    count: groupedResults[key].length
  })));

  const processedResults = [];

  // Process each group separately
  for (const [groupName, groupResults] of Object.entries(groupedResults)) {
    console.log(`🏆 Debug: Processing group "${groupName}" with ${groupResults.length} results`);

    // Check if this is a team/relay game (has teamId > 0)
    const hasTeamId = groupResults.some(r => r.teamId && r.teamId > 0);
    console.log(`👥 Debug: Group "${groupName}" hasTeamId: ${hasTeamId}`);

    let rankedResults = [];

    if (hasTeamId) {
      // Team/relay game - group by teamId (include ALL members, valid and invalid)
      const teamGroups = {};

      groupResults.forEach(result => {
        const teamId = result.teamId || null;
        if (teamId && teamId > 0) {
          if (!teamGroups[teamId]) {
            teamGroups[teamId] = [];
          }
          teamGroups[teamId].push(result);
        } else {
          // Individual results in team game (teamId is null or 0)
          if (!teamGroups['individual']) {
            teamGroups['individual'] = [];
          }
          teamGroups['individual'].push(result);
        }
      });

      console.log(`👥 Debug: Team groups:`, Object.keys(teamGroups).map(key => ({
        teamId: key,
        memberCount: teamGroups[key].length
      })));

      // Calculate team times and create ranking entries
      const teamRankingData = [];

      for (const [teamId, teamMembers] of Object.entries(teamGroups)) {
        if (teamId === 'individual') {
          // Individual results in team games - only rank valid ones (validity = true)
          teamMembers.forEach(member => {
            if (member.validity === true) {
              const timeMs = parseTimeToMs(member.totleTime);
              teamRankingData.push({
                teamId: 'individual',
                members: [member],
                rankingTime: timeMs,
                isTeam: false,
                teamValidity: member.validity
              });
            }
          });
        } else {
          // Team results - calculate team total and validity
          const validTimes = [];
          const allTimes = [];

          teamMembers.forEach(member => {
            const timeMs = parseTimeToMs(member.totleTime);
            allTimes.push({ name: member.name, time: member.totleTime, timeMs, validity: member.validity });

            // Only include valid times in calculation
            if (timeMs !== Infinity && member.totleTime && member.totleTime !== 'DNF') {
              validTimes.push(timeMs);
            }
          });

          // Calculate total time from valid times only
          const totalTime = validTimes.length > 0 ? validTimes.reduce((sum, time) => sum + time, 0) : Infinity;

          // Team is invalid if ANY member has validity = false OR validity = null OR if no valid times available
          const teamValidity = teamMembers.every(member => member.validity === true) && totalTime !== Infinity;

          // Check validity reasons for debugging
          const invalidMembers = teamMembers.filter(member => member.validity !== true);
          const validityReason = invalidMembers.length > 0
            ? `Invalid members: ${invalidMembers.map(m => `${m.name}(${m.validity})`).join(', ')}`
            : totalTime === Infinity
              ? 'No valid times available'
              : 'All members valid with times';

          console.log(`🏃 Debug: Team ${teamId}:`, {
            members: allTimes,
            validTimes: validTimes,
            totalTime: totalTime,
            teamValidity: teamValidity,
            invalidMembers: invalidMembers.length,
            reason: validityReason
          });

          // Add ALL teams to ranking data (valid and invalid)
          teamRankingData.push({
            teamId: teamId,
            members: teamMembers,
            rankingTime: totalTime,
            isTeam: true,
            teamValidity: teamValidity
          });
        }
      }

      // Separate valid and invalid teams
      const validTeams = teamRankingData.filter(t => t.teamValidity && t.rankingTime !== Infinity);
      const invalidTeams = teamRankingData.filter(t => !t.teamValidity || t.rankingTime === Infinity);

      // Sort valid teams by ranking time (ascending - faster is better)
      validTeams.sort((a, b) => a.rankingTime - b.rankingTime);

      console.log(`🏅 Debug: Valid teams for ranking:`, validTeams.map(t => ({
        teamId: t.teamId,
        rankingTime: t.rankingTime,
        memberCount: t.members.length
      })));

      console.log(`❌ Debug: Invalid teams (no ranking):`, invalidTeams.map(t => ({
        teamId: t.teamId,
        rankingTime: t.rankingTime,
        memberCount: t.members.length,
        reason: t.teamValidity ? 'Missing times' : 'Invalid member(s)'
      })));

      // Assign positions to valid teams only
      let currentPosition = 1;
      let previousTime = null;

      validTeams.forEach((teamData, index) => {
        if (previousTime !== null && teamData.rankingTime !== previousTime) {
          currentPosition = index + 1;
        }

        // Assign position to all team members
        teamData.members.forEach(member => {
          rankedResults.push({
            ...member,
            position: currentPosition,
            teamRankingTime: teamData.rankingTime,
            validity: teamData.teamValidity // Use team validity
          });
        });

        previousTime = teamData.rankingTime;
      });

      // Add invalid teams without position
      invalidTeams.forEach(teamData => {
        console.log(`❌ Debug: Adding invalid team ${teamData.teamId} without position`);
        teamData.members.forEach(member => {
          rankedResults.push({
            ...member,
            position: null,
            teamRankingTime: teamData.rankingTime,
            validity: false // Mark entire team as invalid
          });
        });
      });

      // Add invalid individual results without position
      const individualGroup = teamGroups['individual'] || [];
      individualGroup.forEach(member => {
        if (member.validity === false || member.validity === null) {
          rankedResults.push({
            ...member,
            position: null,
            validity: false // Ensure invalid results are marked as false
          });
        }
      });

    } else {
      // Individual game - rank by individual time (only valid results)
      // For individual games:
      // - validity = true: valid result, should be ranked
      // - validity = false: explicitly invalid result (e.g., disqualified)
      // - validity = null: should be treated as invalid (not a device replacement case for individual games)
      const validResults = groupResults.filter(r => r.validity === true);
      const invalidResults = groupResults.filter(r => r.validity === false || r.validity === null);

      const individualRankingData = validResults.map(result => ({
        ...result,
        rankingTime: parseTimeToMs(result.totleTime)
      }));

      // Sort by time (ascending - faster is better)
      individualRankingData.sort((a, b) => a.rankingTime - b.rankingTime);

      // Assign positions
      let currentPosition = 1;
      let previousTime = null;

      individualRankingData.forEach((result, index) => {
        if (previousTime !== null && result.rankingTime !== previousTime) {
          currentPosition = index + 1;
        }

        rankedResults.push({
          ...result,
          position: currentPosition
        });

        previousTime = result.rankingTime;
      });

      // Add invalid results without position
      invalidResults.forEach(result => {
        rankedResults.push({
          ...result,
          position: null
        });
      });
    }

    console.log(`🏅 Debug: Final ranked results for group "${groupName}":`, rankedResults.slice(0, 10).map(r => ({
      name: r.name,
      position: r.position,
      totleTime: r.totleTime,
      teamId: r.teamId,
      validity: r.validity
    })));

    // Add ranked results to processed results
    processedResults.push(...rankedResults);
  }

  console.log(`🎯 Debug: calculatePositions returning ${processedResults.length} processed results`);
  console.log(`🎯 Debug: Sample final results:`, processedResults.slice(0, 5).map(r => ({
    name: r.name,
    groupName: r.groupName,
    position: r.position,
    totleTime: r.totleTime,
    validity: r.validity,
    teamId: r.teamId
  })));

  return processedResults;
}

// Helper function to parse time string to milliseconds for comparison
function parseTimeToMs(timeStr) {
  if (!timeStr) return Infinity; // Invalid times go to the end

  try {
    // Handle different time formats: "HH:MM:SS.mmm", "MM:SS.mmm", "SS.mmm"
    const parts = timeStr.split(':');
    let hours = 0, minutes = 0, seconds = 0;

    if (parts.length === 3) {
      // HH:MM:SS.mmm format
      hours = parseInt(parts[0]) || 0;
      minutes = parseInt(parts[1]) || 0;
      seconds = parseFloat(parts[2]) || 0;
    } else if (parts.length === 2) {
      // MM:SS.mmm format
      minutes = parseInt(parts[0]) || 0;
      seconds = parseFloat(parts[1]) || 0;
    } else if (parts.length === 1) {
      // SS.mmm format
      seconds = parseFloat(parts[0]) || 0;
    }

    return (hours * 3600 + minutes * 60 + seconds) * 1000;
  } catch (error) {
    return Infinity; // Invalid times go to the end
  }
}

// Helper function to format milliseconds back to time string
function formatMsToTime(ms) {
  if (!ms || ms === Infinity) return 'DNF';

  const totalSeconds = ms / 1000;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = (totalSeconds % 60).toFixed(3);

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.padStart(6, '0')}`;
  } else {
    return `${minutes.toString().padStart(2, '0')}:${seconds.padStart(6, '0')}`;
  }
}

module.exports = router;