const express = require('express');
const ExcelJS = require('exceljs');
const XLSX = require('xlsx');
const csv = require('csv-parser');
const { Readable } = require('stream');
const CompletionRecord = require('../models/CompletionRecord');
const { verifyToken, verifyCoach, verifyCoachOrStudent, verifyCoachOrOwner } = require('../middleware/auth');
const { fileUploadMiddleware } = require('../middleware/fileUpload');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     CompletionRecord:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         name:
 *           type: string
 *         eventName:
 *           type: string
 *         eventType:
 *           type: string
 *         result:
 *           type: string
 *         groupName:
 *           type: string
 *         validity:
 *           type: boolean
 *         position:
 *           type: number
 *         eventDate:
 *           type: string
 *           format: date
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/completion-records:
 *   get:
 *     summary: Get all completion records (coach only)
 *     tags: [CompletionRecords]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: Filter by student name
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by end date (YYYY-MM-DD)
 *       - in: query
 *         name: eventName
 *         schema:
 *           type: string
 *         description: Filter by event name (partial match)
 *       - in: query
 *         name: gameType
 *         schema:
 *           type: string
 *         description: Filter by game type
 *       - in: query
 *         name: validity
 *         schema:
 *           type: boolean
 *         description: Filter by validity status
 *     responses:
 *       200:
 *         description: List of completion records
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
 *                     records:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/CompletionRecord'
 *                     totalCount:
 *                       type: integer
 *       500:
 *         description: Server error
 */
router.get('/', verifyToken, verifyCoach, async (req, res) => {
  const requestId = req.requestId;
  logger.info('HTTP Request', {
    requestId,
    method: 'GET',
    url: '/api/completion-records',
    userId: req.user._id
  });

  try {
    const { name, studentName, startDate, endDate, eventName, gameType, validity } = req.query;

    // Build query filter
    let filter = {};

    // Support both 'name' and 'studentName' parameters for backward compatibility
    const nameFilter = name || studentName;
    if (nameFilter) {
      filter.name = { $regex: nameFilter, $options: 'i' };
    }

    if (startDate || endDate) {
      filter.eventDate = {};
      if (startDate) {
        filter.eventDate.$gte = new Date(startDate);
        console.log('DEBUG: startDate filter:', startDate, '-> parsed:', filter.eventDate.$gte);
      }
      if (endDate) {
        // Set end date to end of day (23:59:59.999) to include all records from that day
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        filter.eventDate.$lte = endOfDay;
        console.log('DEBUG: endDate filter:', endDate, '-> parsed:', filter.eventDate.$lte);
      }
    }

    if (eventName) {
      filter.eventName = { $regex: eventName, $options: 'i' };
    }

    if (gameType) {
      filter.gameType = gameType;
      console.log('DEBUG: gameType filter:', gameType);
    }

    if (validity !== undefined) {
      // Convert string 'true'/'false' to boolean
      filter.validity = validity === 'true';
      console.log('DEBUG: validity filter:', validity, '-> parsed:', filter.validity);
    }

    console.log('DEBUG: Final filter:', JSON.stringify(filter, null, 2));

    logger.logDatabase('Finding completion records with filter', 'completionRecords', { filter }, {});

    const records = await CompletionRecord.find(filter)
      .sort({ eventDate: -1 })
      .lean();

    console.log('DEBUG: Query results - records returned:', records.length);
    if (records.length > 0) {
      console.log('DEBUG: First record eventDate:', records[0].eventDate);
    }

    logger.info('Completion records retrieved successfully', {
      requestId,
      count: records.length,
      filter,
      coachId: req.user._id
    });

    res.json({
      success: true,
      data: {
        records,
        totalCount: records.length
      }
    });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/completion-records/export:
 *   get:
 *     summary: Export completion records to Excel (coach only)
 *     tags: [CompletionRecords]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: studentName
 *         schema:
 *           type: string
 *         description: Filter by student name
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by end date (YYYY-MM-DD)
 *       - in: query
 *         name: eventName
 *         schema:
 *           type: string
 *         description: Filter by event name (partial match)
 *       - in: query
 *         name: gameType
 *         schema:
 *           type: string
 *         description: Filter by game type
 *       - in: query
 *         name: validity
 *         schema:
 *           type: boolean
 *         description: Filter by validity status
 *     responses:
 *       200:
 *         description: Excel file download
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *       500:
 *         description: Server error
 */
router.get('/export', verifyToken, verifyCoach, async (req, res) => {
  const requestId = req.requestId;
  logger.info('HTTP Request', {
    requestId,
    method: 'GET',
    url: '/api/completion-records/export',
    userId: req.user._id
  });

  try {
    const { studentName, startDate, endDate, eventName, gameType, validity } = req.query;

    // Build query filter (same as the main GET endpoint)
    let filter = {};

    if (studentName) {
      filter.name = { $regex: studentName, $options: 'i' };
    }

    if (startDate || endDate) {
      filter.eventDate = {};
      if (startDate) {
        filter.eventDate.$gte = new Date(startDate);
      }
      if (endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        filter.eventDate.$lte = endOfDay;
      }
    }

    if (eventName) {
      filter.eventName = { $regex: eventName, $options: 'i' };
    }

    if (gameType) {
      filter.gameType = gameType;
    }

    if (validity !== undefined) {
      filter.validity = validity === 'true';
    }

    logger.logDatabase('Exporting completion records with filter', 'completionRecords', { filter }, {});

    const records = await CompletionRecord.find(filter)
      .sort({ eventDate: -1 })
      .lean();

    console.log(`📊 Found ${records.length} records to export`);

    // Create workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('成绩数据');

    // Define columns with Chinese headers
    worksheet.columns = [
      { header: '姓名', key: 'name', width: 12 },
      { header: '比赛', key: 'eventName', width: 25 },
      { header: '比赛日期', key: 'eventDate', width: 15 },
      { header: '比赛类型', key: 'eventType', width: 12 },
      { header: '项目', key: 'gameType', width: 15 },
      { header: '组别', key: 'groupName', width: 12 },
      { header: '成绩', key: 'result', width: 12 },
      { header: '得分', key: 'score', width: 10 },
      { header: '有效性', key: 'validity', width: 10 },
      { header: '排名', key: 'position', width: 10 }
    ];

    // Style the header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Add data rows
    records.forEach(record => {
      worksheet.addRow({
        name: record.name || '',
        eventName: record.eventName || '',
        eventDate: record.eventDate ? new Date(record.eventDate).toLocaleDateString('zh-CN') : '',
        eventType: record.eventType || '',
        gameType: record.gameType || '',
        groupName: record.groupName || '',
        result: record.result || '',
        score: record.score || '',
        validity: record.validity ? '有效' : '无效',
        position: record.position || ''
      });
    });

    // Add borders to all cells
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });

    // Set response headers
    const filename = `成绩数据_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);

    console.log(`📤 Writing Excel file to response...`);

    // Write to response
    await workbook.xlsx.write(res);

    console.log(`✅ Excel file written successfully`);

    logger.info('Completion records exported successfully', {
      requestId,
      count: records.length,
      filter,
      coachId: req.user._id
    });

    res.end();
  } catch (error) {
    logger.error('Excel export failed', {
      requestId,
      error: error.message,
      stack: error.stack,
      userId: req.user._id
    });

    // Only send JSON error if headers haven't been sent yet
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
});

/**
 * @swagger
 * /api/completion-records/{studentName}:
 *   get:
 *     summary: Get completion records for a specific student
 *     tags: [CompletionRecords]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: studentName
 *         required: true
 *         schema:
 *           type: string
 *         description: Student name
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by end date (YYYY-MM-DD)
 *       - in: query
 *         name: eventName
 *         schema:
 *           type: string
 *         description: Filter by event name (partial match)
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [eventDate, result]
 *           default: eventDate
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Student completion records
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
 *                     records:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/CompletionRecord'
 *                     totalCount:
 *                       type: integer
 *       500:
 *         description: Server error
 */
router.get('/:studentName', verifyToken, async (req, res) => {
  const requestId = req.requestId;
  const { studentName } = req.params;

  logger.info('HTTP Request', {
    requestId,
    method: 'GET',
    url: `/api/completion-records/${studentName}`,
    userId: req.user._id
  });

  try {
    const { startDate, endDate, eventName, sortBy = 'eventDate', sortOrder = 'desc' } = req.query;

    // Build query filter
    let filter = { name: studentName };

    if (startDate || endDate) {
      filter.eventDate = {};
      if (startDate) {
        filter.eventDate.$gte = new Date(startDate);
      }
      if (endDate) {
        // Set end date to end of day (23:59:59.999) to include all records from that day
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        filter.eventDate.$lte = endOfDay;
      }
    }

    if (eventName) {
      filter.eventName = { $regex: eventName, $options: 'i' };
    }

    // Build sort object
    const sortObj = {};
    sortObj[sortBy] = sortOrder === 'asc' ? 1 : -1;

    logger.logDatabase('Finding student completion records', 'completionRecords', { filter, sort: sortObj }, {});

    const records = await CompletionRecord.find(filter)
      .sort(sortObj)
      .lean();

    logger.info('Student completion records retrieved successfully', {
      requestId,
      studentName,
      count: records.length,
      filter,
      userId: req.user._id
    });

    res.json({
      success: true,
      data: {
        records,
        totalCount: records.length
      }
    });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/completion-records:
 *   post:
 *     summary: Create new completion record (coach only)
 *     tags: [CompletionRecords]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
*             required:
 *               - name
 *               - eventName
 *               - eventType
 *               - gameType
 *               - result
 *               - groupName
 *               - eventDate
 *             properties:
 *               name:
 *                 type: string
 *               eventName:
 *                 type: string
 *               eventType:
 *                 type: string
 *               gameType:
 *                 type: string
 *               result:
 *                 type: string
 *               groupName:
 *                 type: string
 *               validity:
 *                 type: boolean
 *                 default: true
 *               position:
 *                 type: number
 *               eventDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Completion record created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/CompletionRecord'
 *       400:
 *         description: Invalid input data
 *       500:
 *         description: Server error
 */
router.post('/', verifyToken, verifyCoachOrStudent, async (req, res) => {
  const requestId = req.requestId;
  logger.info('HTTP Request', {
    requestId,
    method: 'POST',
    url: '/api/completion-records',
    userId: req.user._id
  });

  try {
    const recordData = req.body;

    // Validate required fields
    const requiredFields = ['name', 'eventName', 'eventType', 'gameType', 'result', 'groupName', 'eventDate'];
    const missingFields = requiredFields.filter(field => !recordData[field]);

    if (missingFields.length > 0) {
      logger.warn('Missing required fields for completion record creation', {
        requestId,
        missingFields,
        coachId: req.user._id
      });
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    logger.logDatabase('Creating completion record', 'completionRecords', recordData, {});

    const completionRecord = new CompletionRecord(recordData);
    await completionRecord.save();

    logger.info('Completion record created successfully', {
      requestId,
      recordId: completionRecord._id,
      studentName: completionRecord.name,
      eventName: completionRecord.eventName,
      coachId: req.user._id
    });

    res.status(201).json({
      success: true,
      data: completionRecord
    });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/completion-records/{id}:
 *   put:
 *     summary: Update completion record (coach or record owner)
 *     tags: [CompletionRecords]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Completion record ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
*             properties:
 *               name:
 *                 type: string
 *               eventName:
 *                 type: string
 *               eventType:
 *                 type: string
 *               gameType:
 *                 type: string
 *               result:
 *                 type: string
 *               groupName:
 *                 type: string
 *               validity:
 *                 type: boolean
 *               position:
 *                 type: number
 *               eventDate:
 *                 type: string
 *                 format: date
 *               score:
 *                 type: number
 *     responses:
 *       200:
 *         description: Completion record updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/CompletionRecord'
 *       400:
 *         description: Invalid input data
 *       404:
 *         description: Record not found
 *       500:
 *         description: Server error
 */
router.put('/:id', verifyToken, verifyCoachOrOwner, async (req, res) => {
  const requestId = req.requestId;
  const { id } = req.params;

  logger.info('HTTP Request', {
    requestId,
    method: 'PUT',
    url: `/api/completion-records/${id}`,
    userId: req.user._id
  });

  try {
    const updateData = req.body;

    // Validate required fields if provided
    const requiredFields = ['eventName', 'eventType', 'gameType', 'result', 'groupName', 'eventDate'];
    const missingFields = requiredFields.filter(field => updateData[field] !== undefined && !updateData[field]);

    if (missingFields.length > 0) {
      logger.warn('Invalid fields for completion record update', {
        requestId,
        missingFields,
        coachId: req.user._id
      });
      return res.status(400).json({
        success: false,
        message: `Invalid fields: ${missingFields.join(', ')}`
      });
    }

    logger.logDatabase('Updating completion record', 'completionRecords', { id, updateData }, {});

    const completionRecord = await CompletionRecord.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!completionRecord) {
      logger.warn('Completion record not found for update', {
        requestId,
        recordId: id,
        coachId: req.user._id
      });
      return res.status(404).json({
        success: false,
        message: 'Completion record not found'
      });
    }

    logger.info('Completion record updated successfully', {
      requestId,
      recordId: completionRecord._id,
      studentName: completionRecord.name,
      eventName: completionRecord.eventName,
      coachId: req.user._id
    });

    res.json({
      success: true,
      data: completionRecord
    });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/completion-records/{id}:
 *   delete:
 *     summary: Delete completion record (coach or record owner)
 *     tags: [CompletionRecords]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Completion record ID
 *     responses:
 *       200:
 *         description: Completion record deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       404:
 *         description: Record not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', verifyToken, verifyCoachOrOwner, async (req, res) => {
  const requestId = req.requestId;
  const { id } = req.params;

  logger.info('HTTP Request', {
    requestId,
    method: 'DELETE',
    url: `/api/completion-records/${id}`,
    userId: req.user._id
  });

  try {
    logger.logDatabase('Deleting completion record', 'completionRecords', { id }, {});

    const completionRecord = await CompletionRecord.findByIdAndDelete(id);

    if (!completionRecord) {
      logger.warn('Completion record not found for deletion', {
        requestId,
        recordId: id,
        coachId: req.user._id
      });
      return res.status(404).json({
        success: false,
        message: 'Completion record not found'
      });
    }

    logger.info('Completion record deleted successfully', {
      requestId,
      recordId: id,
      studentName: completionRecord.name,
      eventName: completionRecord.eventName,
      coachId: req.user._id
    });

    res.json({
      success: true,
      message: 'Completion record deleted successfully'
    });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/completion-records/parse-file:
 *   post:
 *     summary: Parse uploaded CSV or Excel file and return columns and data
 *     tags: [CompletionRecords]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: File parsed successfully
 *       400:
 *         description: Invalid file or format
 *       500:
 *         description: Server error
 */
router.post('/parse-file', verifyToken, verifyCoach, fileUploadMiddleware, async (req, res) => {
  const requestId = req.requestId;

  logger.info('HTTP Request', {
    requestId,
    method: 'POST',
    url: '/api/completion-records/parse-file',
    userId: req.user._id
  });

  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    let rows = [];
    let columns = [];

    // Parse based on file type
    const fileExtension = file.originalname.split('.').pop().toLowerCase();

    if (fileExtension === 'csv') {
      // Parse CSV
      const results = [];
      const stream = Readable.from(file.buffer.toString('utf-8'));

      await new Promise((resolve, reject) => {
        stream
          .pipe(csv())
          .on('data', (data) => results.push(data))
          .on('end', () => resolve())
          .on('error', (error) => reject(error));
      });

      if (results.length > 0) {
        columns = Object.keys(results[0]);
        rows = results;
      }
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      // Parse Excel
      const workbook = XLSX.read(file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (jsonData.length > 0) {
        columns = Object.keys(jsonData[0]);
        rows = jsonData;
      }
    } else {
      return res.status(400).json({
        success: false,
        message: 'Unsupported file format'
      });
    }

    logger.info('File parsed successfully', {
      requestId,
      fileName: file.originalname,
      rowCount: rows.length,
      columnCount: columns.length,
      coachId: req.user._id
    });

    res.json({
      success: true,
      data: {
        columns,
        rows,
        rowCount: rows.length
      }
    });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({
      success: false,
      message: 'Failed to parse file: ' + error.message
    });
  }
});

/**
 * @swagger
 * /api/completion-records/bulk-upsert:
 *   post:
 *     summary: Bulk insert or update completion records
 *     tags: [CompletionRecords]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               records:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Records processed successfully
 *       400:
 *         description: Invalid input data
 *       500:
 *         description: Server error
 */
router.post('/bulk-upsert', verifyToken, verifyCoach, async (req, res) => {
  const requestId = req.requestId;

  logger.info('HTTP Request', {
    requestId,
    method: 'POST',
    url: '/api/completion-records/bulk-upsert',
    userId: req.user._id
  });

  try {
    const { records } = req.body;

    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Records array is required and must not be empty'
      });
    }

    let inserted = 0;
    let updated = 0;
    const errors = [];

    // Process each record
    for (const record of records) {
      try {
        // Validate required fields
        if (!record.name || !record.eventName || !record.gameType || !record.groupName) {
          console.log('Missing required fields for record:', record);
          errors.push({
            record,
            error: 'Missing required fields: name, eventName, gameType, or groupName'
          });
          continue;
        }

        // Additional validation for eventDate
        if (!record.eventDate) {
          console.log('Missing eventDate for record:', record);
          errors.push({
            record,
            error: 'Missing required field: eventDate'
          });
          continue;
        }

        // Find existing record by unique combination
        const existingRecord = await CompletionRecord.findOne({
          name: record.name,
          eventName: record.eventName,
          gameType: record.gameType,
          groupName: record.groupName
        });

        if (existingRecord) {
          // Update existing record
          console.log('Updating existing record for:', record.name);
          await CompletionRecord.findByIdAndUpdate(
            existingRecord._id,
            record,
            { runValidators: true }
          );
          updated++;
        } else {
          // Insert new record
          console.log('Inserting new record for:', record.name);
          const newRecord = new CompletionRecord(record);
          await newRecord.save();
          inserted++;
        }
      } catch (error) {
        console.error('Error processing record:', record, 'Error:', error.message);
        errors.push({
          record,
          error: error.message
        });
      }
    }

    logger.info('Bulk upsert completed', {
      requestId,
      total: records.length,
      inserted,
      updated,
      errors: errors.length,
      coachId: req.user._id
    });

    res.json({
      success: true,
      data: {
        total: records.length,
        inserted,
        updated,
        errors: errors.length > 0 ? errors : undefined
      }
    });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({
      success: false,
      message: 'Bulk upsert failed: ' + error.message
    });
  }
});

module.exports = router;