const express = require('express');
const CompletionRecord = require('../models/CompletionRecord');
const Event = require('../models/Event');
const { verifyToken, verifyCoach } = require('../middleware/auth');
const logger = require('../utils/logger');
const ExcelJS = require('exceljs');

const router = express.Router();

/**
 * @swagger
 * /api/event-results/{eventId}:
 *   get:
 *     summary: Get completion records for an event
 *     tags: [EventResults]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     responses:
 *       200:
 *         description: Event results retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     event:
 *                       type: object
 *                     gameTypes:
 *                       type: array
 *                     results:
 *                       type: array
 *                     teamResults:
 *                       type: array
 *                     individualResults:
 *                       type: array
 *       404:
 *         description: Event not found
 *       500:
 *         description: Server error
 */
router.get('/:eventId', verifyToken, verifyCoach, async (req, res) => {
  const requestId = req.requestId;
  const { eventId } = req.params;

  logger.info('HTTP Request', {
    requestId,
    method: 'GET',
    url: `/api/event-results/${eventId}`,
    userId: req.user._id
  });

  try {
    // Get event details
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: '未找到指定的赛事'
      });
    }

    // Get all completion records for this event
    const completionRecords = await CompletionRecord.find({
      eventName: event.eventName
    }).sort({ name: 1, gameType: 1 });

    // Get unique game types from the records
    const gameTypes = [...new Set(completionRecords.map(record => record.gameType))];

    // Separate team and individual results
    const teamResults = [];
    const individualResults = [];

    // Group records by teamId for team games
    const teamGroups = {};
    const processedIndividuals = new Set();

    completionRecords.forEach(record => {
      if (record.teamId && record.teamId !== null) {
        // This is a team member
        if (!teamGroups[record.teamId]) {
          teamGroups[record.teamId] = {
            teamId: record.teamId,
            gameType: record.gameType,
            groupName: record.groupName,
            members: []
          };
        }
        teamGroups[record.teamId].members.push(record);
      } else {
        // This is an individual result
        const key = `${record.name}_${record.gameType}`;
        if (!processedIndividuals.has(key)) {
          individualResults.push(record);
          processedIndividuals.add(key);
        }
      }
    });

    // Convert team groups to array and sort teams by position
    Object.values(teamGroups).forEach(team => {
      // Sort team members by name for consistent display
      team.members.sort((a, b) => a.name.localeCompare(b.name));
      
      // Use the best position among team members for team sorting
      const validPositions = team.members
        .map(m => m.position)
        .filter(p => p !== null && p !== undefined);
      
      team.bestPosition = validPositions.length > 0 ? Math.min(...validPositions) : null;
      team.validity = team.members.every(m => m.validity);
      
      teamResults.push(team);
    });

    // Sort team results by best position (nulls last)
    teamResults.sort((a, b) => {
      if (a.bestPosition === null && b.bestPosition === null) return 0;
      if (a.bestPosition === null) return 1;
      if (b.bestPosition === null) return -1;
      return a.bestPosition - b.bestPosition;
    });

    // Sort individual results by position (nulls last)
    individualResults.sort((a, b) => {
      if (a.position === null && b.position === null) return 0;
      if (a.position === null) return 1;
      if (b.position === null) return -1;
      return a.position - b.position;
    });

    // Organize results by student for table display
    const studentResults = {};

    // Process ALL completion records to build complete student profiles
    completionRecords.forEach(record => {
      if (!studentResults[record.name]) {
        studentResults[record.name] = {
          name: record.name,
          isTeamMember: !!record.teamId,
          teamId: record.teamId,
          gameTypes: {}
        };
      }
      
      studentResults[record.name].gameTypes[record.gameType] = {
        groupName: record.groupName,
        result: record.result,
        position: record.position,
        validity: record.validity,
        reason: record.reason,
        isTeam: !!record.teamId,
        teamId: record.teamId
      };
    });

    // Separate game types into relay and individual
    const relayGameTypes = [];
    const individualGameTypes = [];
    
    gameTypes.forEach(gameType => {
      // Check if this game type has any records with teamId
      const hasTeamRecords = completionRecords.some(record => 
        record.gameType === gameType && record.teamId
      );
      
      if (hasTeamRecords) {
        relayGameTypes.push(gameType);
      } else {
        individualGameTypes.push(gameType);
      }
    });

    // Reorder game types: relay first, then individual
    const orderedGameTypes = [...relayGameTypes, ...individualGameTypes];

    // Convert to array and sort (team members first, then individuals)
    const sortedResults = Object.values(studentResults).sort((a, b) => {
      // Team members first
      if (a.isTeamMember && !b.isTeamMember) return -1;
      if (!a.isTeamMember && b.isTeamMember) return 1;
      
      // Within team members, sort by teamId then by name
      if (a.isTeamMember && b.isTeamMember) {
        if (a.teamId !== b.teamId) {
          return a.teamId.localeCompare(b.teamId);
        }
      }
      
      // Within same type, sort by name
      return a.name.localeCompare(b.name);
    });

    logger.info('Event results retrieved successfully', {
      requestId,
      eventId,
      eventName: event.eventName,
      totalRecords: completionRecords.length,
      gameTypesCount: gameTypes.length,
      studentsCount: sortedResults.length
    });

    res.json({
      success: true,
      data: {
        event,
        gameTypes: orderedGameTypes, // Use ordered game types (relay first)
        results: sortedResults,
        teamResults,
        individualResults,
        totalRecords: completionRecords.length,
        relayGameTypes,
        individualGameTypes
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
 * /api/event-results/{eventId}/export:
 *   get:
 *     summary: Export event results to Excel
 *     tags: [EventResults]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
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
router.get('/:eventId/export', verifyToken, verifyCoach, async (req, res) => {
  const requestId = req.requestId;
  const { eventId } = req.params;

  logger.info('HTTP Request', {
    requestId,
    method: 'GET',
    url: `/api/event-results/${eventId}/export`,
    userId: req.user._id
  });

  try {
    // Get event details
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: '未找到指定的赛事'
      });
    }

    // Get all completion records for this event
    const completionRecords = await CompletionRecord.find({
      eventName: event.eventName
    }).sort({ name: 1, gameType: 1 });

    if (completionRecords.length === 0) {
      return res.status(404).json({
        success: false,
        message: '该赛事暂无成绩数据'
      });
    }

    // Use same logic as GET endpoint for consistency
    const gameTypes = [...new Set(completionRecords.map(record => record.gameType))];

    // Organize results by student (same logic as GET endpoint)
    const studentResults = {};

    // Process ALL completion records to build complete student profiles
    completionRecords.forEach(record => {
      if (!studentResults[record.name]) {
        studentResults[record.name] = {
          name: record.name,
          isTeamMember: !!record.teamId,
          teamId: record.teamId,
          gameTypes: {}
        };
      }
      
      studentResults[record.name].gameTypes[record.gameType] = {
        groupName: record.groupName,
        result: record.result,
        position: record.position,
        validity: record.validity,
        reason: record.reason,
        isTeam: !!record.teamId,
        teamId: record.teamId
      };
    });

    // Separate game types into relay and individual
    const relayGameTypes = [];
    const individualGameTypes = [];
    
    gameTypes.forEach(gameType => {
      const hasTeamRecords = completionRecords.some(record => 
        record.gameType === gameType && record.teamId
      );
      
      if (hasTeamRecords) {
        relayGameTypes.push(gameType);
      } else {
        individualGameTypes.push(gameType);
      }
    });

    // Reorder game types: relay first, then individual
    const orderedGameTypes = [...relayGameTypes, ...individualGameTypes];

    const sortedResults = Object.values(studentResults).sort((a, b) => {
      // Team members first
      if (a.isTeamMember && !b.isTeamMember) return -1;
      if (!a.isTeamMember && b.isTeamMember) return 1;
      
      // Within team members, sort by teamId then by name
      if (a.isTeamMember && b.isTeamMember) {
        if (a.teamId !== b.teamId) {
          return a.teamId.localeCompare(b.teamId);
        }
      }
      
      return a.name.localeCompare(b.name);
    });

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('赛事成绩');

    // Calculate column structure
    const totalColumns = 1 + (gameTypes.length * 3); // 1 for name + 3 columns per game type

    // Create header rows
    // Row 1: Student info header and game type names
    const headerRow1 = worksheet.getRow(1);
    headerRow1.getCell(1).value = '学生信息';
    
    let colIndex = 2;
    orderedGameTypes.forEach(gameType => {
      headerRow1.getCell(colIndex).value = gameType;
      // Merge 3 columns for game type name
      worksheet.mergeCells(1, colIndex, 1, colIndex + 2);
      colIndex += 3;
    });

    // Row 2: Column headers
    const headerRow2 = worksheet.getRow(2);
    headerRow2.getCell(1).value = '名字';
    
    colIndex = 2;
    orderedGameTypes.forEach(() => {
      headerRow2.getCell(colIndex).value = '组别';
      headerRow2.getCell(colIndex + 1).value = '成绩';
      headerRow2.getCell(colIndex + 2).value = '名次';
      colIndex += 3;
    });

    // Style headers
    [headerRow1, headerRow2].forEach(row => {
      row.eachCell(cell => {
        cell.font = { bold: true };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE6E6FA' }
        };
      });
    });

    // Generate team colors for gradient effect
    const teamColors = {};
    const baseColors = [
      'FFFFE4E1', 'FFE0FFFF', 'FFF0FFF0', 'FFFFF8DC', 'FFF5F5DC',
      'FFFFEFD5', 'FFFDF5E6', 'FFF0F8FF', 'FFFAF0E6', 'FFFFF0F5'
    ];
    let colorIndex = 0;

    // Add data rows
    let rowIndex = 3;
    sortedResults.forEach(student => {
      const row = worksheet.getRow(rowIndex);
      row.getCell(1).value = student.name;

      // Assign team color if team member
      let teamColor = null;
      if (student.isTeamMember && student.teamId) {
        if (!teamColors[student.teamId]) {
          teamColors[student.teamId] = baseColors[colorIndex % baseColors.length];
          colorIndex++;
        }
        teamColor = teamColors[student.teamId];
      }

      colIndex = 2;
      orderedGameTypes.forEach(gameType => {
        const gameResult = student.gameTypes[gameType];
        
        if (gameResult) {
          row.getCell(colIndex).value = gameResult.groupName || '';
          row.getCell(colIndex + 1).value = gameResult.result || '';
          
          // Handle position with validity check
          if (!gameResult.validity && gameResult.reason) {
            row.getCell(colIndex + 2).value = `✗ ${gameResult.reason}`;
            row.getCell(colIndex + 2).font = { color: { argb: 'FFFF0000' } };
          } else if (gameResult.position) {
            row.getCell(colIndex + 2).value = gameResult.position;
          } else {
            row.getCell(colIndex + 2).value = '';
          }
        } else {
          row.getCell(colIndex).value = '';
          row.getCell(colIndex + 1).value = '';
          row.getCell(colIndex + 2).value = '';
        }
        
        colIndex += 3;
      });

      // Apply team color if applicable
      if (teamColor) {
        row.eachCell(cell => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: teamColor }
          };
        });
      }

      // Apply borders
      row.eachCell(cell => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });

      rowIndex++;
    });

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      let maxLength = 0;
      column.eachCell({ includeEmpty: true }, cell => {
        const columnLength = cell.value ? cell.value.toString().length : 10;
        if (columnLength > maxLength) {
          maxLength = columnLength;
        }
      });
      column.width = Math.min(Math.max(maxLength + 2, 10), 30);
    });

    // Set response headers
    const fileName = `${event.eventName}_成绩表_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`);

    // Write to response
    await workbook.xlsx.write(res);

    logger.info('Event results exported successfully', {
      requestId,
      eventId,
      eventName: event.eventName,
      studentsCount: sortedResults.length,
      gameTypesCount: gameTypes.length
    });

  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({
      success: false,
      message: '导出失败，请稍后重试'
    });
  }
});

module.exports = router;