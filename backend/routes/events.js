const express = require('express');
const Event = require('../models/Event');
const CompletionRecord = require('../models/CompletionRecord');
const { verifyToken, verifyCoach, verifyCoachOrStudent } = require('../middleware/auth');
const { validateEventData } = require('../middleware/configurationValidation');
const { fileUploadMiddleware } = require('../middleware/fileUpload');
const { parseRegistrationFile } = require('../utils/fileParser');
const { processBatchRegistrations, generateErrorReport } = require('../utils/registrationProcessor');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Event:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         eventName:
 *           type: string
 *         organization:
 *           type: string
 *         startDate:
 *           type: string
 *           format: date
 *         endDate:
 *           type: string
 *           format: date
 *         eventType:
 *           type: string
 *         location:
 *           type: string
 *         scoreWeight:
 *           type: number
 *         openRegistration:
 *           type: boolean
 *         gameTypes:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               teamSize:
 *                 type: number
 *               externalGameId:
 *                 type: string
 *         groups:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               code:
 *                 type: string
 *               name:
 *                 type: string
 *               ageRange:
 *                 type: string
 *               gender:
 *                 type: string
 */

/**
 * @swagger
 * /api/events:
 *   get:
 *     summary: Get all events (coach and IT only)
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by event name or organization
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by start date (from)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by start date (to)
 *     responses:
 *       200:
 *         description: List of events
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Event'
 *       500:
 *         description: Server error
 *   post:
 *     summary: Create new event (coach and IT only)
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - eventName
 *               - organization
 *               - startDate
 *               - endDate
 *               - eventType
 *             properties:
 *               eventName:
 *                 type: string
 *               organization:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               eventType:
 *                 type: string
 *               location:
 *                 type: string
 *               scoreWeight:
 *                 type: number
 *               openRegistration:
 *                 type: boolean
 *               gameTypes:
 *                 type: array
 *                 items:
 *                   type: object
 *               groups:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       201:
 *         description: Event created successfully
 *       400:
 *         description: Validation error
 *       500:
 *         description: Server error
 */
router.get('/', verifyToken, verifyCoachOrStudent, async (req, res) => {
  const requestId = req.requestId;
  logger.info('HTTP Request', {
    requestId,
    method: 'GET',
    url: '/api/events',
    userId: req.user._id
  });
  
  try {
    const { search, startDate, endDate, openRegistration } = req.query;
    
    // Build query filter
    let filter = {};
    
    // Text search filter
    if (search && search.trim()) {
      filter.$or = [
        { eventName: { $regex: search.trim(), $options: 'i' } },
        { organization: { $regex: search.trim(), $options: 'i' } }
      ];
    }
    
    // Date range filter
    if (startDate || endDate) {
      filter.startDate = {};
      if (startDate) {
        filter.startDate.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.startDate.$lte = new Date(endDate);
      }
    }
    
    // Open registration filter
    if (openRegistration === 'true') {
      filter.openRegistration = true;
      // Also filter for future events when filtering by open registration
      const now = new Date();
      if (!filter.startDate) {
        filter.startDate = {};
      }
      filter.startDate.$gt = now;
    }
    
    logger.logDatabase('Finding events with filter', 'events', { filter }, {});
    
    const events = await Event.find(filter)
      .sort({ startDate: -1 });
    
    logger.info('Events retrieved successfully', {
      requestId,
      count: events.length,
      filter,
      userId: req.user._id
    });
    
    res.json(events);
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ message: 'Server error' });
  }
});


router.post('/', verifyToken, verifyCoach, validateEventData, async (req, res) => {
  const requestId = req.requestId;
  logger.info('HTTP Request', {
    requestId,
    method: 'POST',
    url: '/api/events',
    userId: req.user._id,
    body: req.body
  });
  
  try {
    const { 
      eventName, 
      organization, 
      startDate, 
      endDate, 
      eventType,
      location,
      scoreWeight,
      openRegistration,
      gameTypes,
      groups
    } = req.body;
    
    // Validate required fields
    if (!eventName || !organization || !startDate || !endDate || !eventType) {
      return res.status(400).json({ message: '所有字段都是必填的' });
    }
    
    // Validate date range
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) {
      return res.status(400).json({ message: '结束日期必须在开始日期之后' });
    }
    
    const event = new Event({
      eventName: eventName.trim(),
      organization,
      startDate: start,
      endDate: end,
      eventType,
      location: location || '',
      scoreWeight: scoreWeight || 1,
      openRegistration: openRegistration !== undefined ? openRegistration : false,
      gameTypes: gameTypes || [],
      groups: groups || []
    });
    
    logger.logDatabase('Creating new event', 'events', {}, event.toObject());
    
    const savedEvent = await event.save();
    
    logger.info('Event created successfully', {
      requestId,
      eventId: savedEvent._id,
      eventName: savedEvent.eventName,
      userId: req.user._id
    });
    
    res.status(201).json(savedEvent);
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
 * /api/events/open:
 *   get:
 *     summary: Get events with open registration (for students)
 *     tags: [Events]
 *     responses:
 *       200:
 *         description: List of events with open registration
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Event'
 *       500:
 *         description: Server error
 */
router.get('/open', verifyToken, async (req, res) => {
  const requestId = req.requestId;
  logger.info('HTTP Request', {
    requestId,
    method: 'GET',
    url: '/api/events/open',
    userId: req.user ? req.user._id : 'anonymous'
  });
  
  try {
    const now = new Date();
    
    // Filter for events with open registration and future start dates
    const filter = {
      openRegistration: true,
      endDate: { $gte: now }
    };
    
    logger.logDatabase('Finding open registration events', 'events', { filter }, {});
    
    const events = await Event.find(filter)
      .sort({ startDate: 1 });
    
    logger.info('Open registration events retrieved successfully', {
      requestId,
      count: events.length,
      filter
    });
    
    res.json(events);
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/events/types:
 *   get:
 *     summary: Get distinct event types
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of distinct event types
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: string
 *       500:
 *         description: Server error
 */
router.get('/types', verifyToken, verifyCoachOrStudent, async (req, res) => {
  const requestId = req.requestId;
  logger.info('HTTP Request', {
    requestId,
    method: 'GET',
    url: '/api/events/types',
    userId: req.user._id
  });
  
  try {
    logger.logDatabase('Getting distinct event types', 'events', {});
    
    const eventTypes = await Event.distinct('eventType');
    
    // Filter out null/undefined values and sort
    const filteredTypes = eventTypes
      .filter(type => type && type.trim())
      .sort();
    
    logger.info('Event types retrieved successfully', {
      requestId,
      count: filteredTypes.length,
      types: filteredTypes,
      userId: req.user._id
    });
    
    res.json(filteredTypes);
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/events/{id}:
 *   get:
 *     summary: Get event by ID (coach and IT only)
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     responses:
 *       200:
 *         description: Event details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Event'
 *       404:
 *         description: Event not found
 *       500:
 *         description: Server error
 *   put:
 *     summary: Update event (coach and IT only)
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               eventName:
 *                 type: string
 *               organization:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               eventType:
 *                 type: string
 *     responses:
 *       200:
 *         description: Event updated successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Event not found
 *       500:
 *         description: Server error
 *   delete:
 *     summary: Delete event (coach and IT only)
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     responses:
 *       200:
 *         description: Event deleted successfully
 *       400:
 *         description: Cannot delete event with associated records
 *       404:
 *         description: Event not found
 *       500:
 *         description: Server error
 */
router.get('/:id', verifyToken, verifyCoachOrStudent, async (req, res) => {
  const requestId = req.requestId;
  logger.info('HTTP Request', {
    requestId,
    method: 'GET',
    url: `/api/events/${req.params.id}`,
    userId: req.user._id
  });
  
  try {
    logger.logDatabase('Finding event by ID', 'events', { _id: req.params.id }, {});
    
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({ message: '赛事未找到' });
    }
    
    logger.info('Event retrieved successfully', {
      requestId,
      eventId: event._id,
      eventName: event.eventName,
      userId: req.user._id
    });
    
    res.json(event);
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id', verifyToken, verifyCoach, validateEventData, async (req, res) => {
  const requestId = req.requestId;
  logger.info('HTTP Request', {
    requestId,
    method: 'PUT',
    url: `/api/events/${req.params.id}`,
    userId: req.user._id,
    body: req.body
  });
  
  try {
    const { 
      eventName, 
      organization, 
      startDate, 
      endDate, 
      eventType,
      location,
      scoreWeight,
      openRegistration,
      gameTypes,
      groups
    } = req.body;
    
    // Validate date range if both dates are provided
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (end < start) {
        return res.status(400).json({ message: '结束日期必须在开始日期之后' });
      }
    }
    
    const updateData = {};
    if (eventName !== undefined) updateData.eventName = eventName.trim();
    if (organization !== undefined) updateData.organization = organization;
    if (startDate !== undefined) updateData.startDate = new Date(startDate);
    if (endDate !== undefined) updateData.endDate = new Date(endDate);
    if (eventType !== undefined) updateData.eventType = eventType;
    if (location !== undefined) updateData.location = location;
    if (scoreWeight !== undefined) updateData.scoreWeight = scoreWeight;
    if (openRegistration !== undefined) updateData.openRegistration = openRegistration;
    if (gameTypes !== undefined) updateData.gameTypes = gameTypes;
    if (groups !== undefined) updateData.groups = groups;

    
    logger.logDatabase('Updating event', 'events', { _id: req.params.id }, updateData);
    
    const event = await Event.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!event) {
      return res.status(404).json({ message: '赛事未找到' });
    }
    
    logger.info('Event updated successfully', {
      requestId,
      eventId: event._id,
      eventName: event.eventName,
      userId: req.user._id
    });
    
    res.json(event);
  } catch (error) {
    logger.logError(error, req);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server error' });
  }
});


router.delete('/:id', verifyToken, verifyCoach, async (req, res) => {
  const requestId = req.requestId;
  logger.info('HTTP Request', {
    requestId,
    method: 'DELETE',
    url: `/api/events/${req.params.id}`,
    userId: req.user._id
  });
  
  try {
    // First check if event exists
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: '赛事未找到' });
    }
    
    // Check if there are any completion records using this event
    logger.logDatabase('Checking completion records for event', 'completionRecords', { eventName: event.eventName }, {});
    
    const completionRecords = await CompletionRecord.find({ eventName: event.eventName });
    
    if (completionRecords.length > 0) {
      logger.info('Cannot delete event with associated records', {
        requestId,
        eventId: event._id,
        eventName: event.eventName,
        recordCount: completionRecords.length,
        userId: req.user._id
      });
      
      return res.status(400).json({ 
        message: `无法删除赛事，因为有 ${completionRecords.length} 条参赛记录与此赛事关联。请先删除相关的参赛记录。`,
        recordCount: completionRecords.length
      });
    }
    
    // Delete the event
    logger.logDatabase('Deleting event', 'events', { _id: req.params.id }, {});
    
    await Event.findByIdAndDelete(req.params.id);
    
    logger.info('Event deleted successfully', {
      requestId,
      eventId: event._id,
      eventName: event.eventName,
      userId: req.user._id
    });
    
    res.json({ message: '赛事删除成功' });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/events/{eventId}/upload-registrations:
 *   post:
 *     summary: Upload registration file for bulk student registration (coach only)
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
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
 *                 description: CSV or Excel file containing registration data
 *     responses:
 *       200:
 *         description: Upload processed successfully
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
 *                     totalProcessed:
 *                       type: number
 *                     successCount:
 *                       type: number
 *                     errorCount:
 *                       type: number
 *                     errors:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           row:
 *                             type: number
 *                           studentName:
 *                             type: string
 *                           error:
 *                             type: string
 *       400:
 *         description: Invalid file or validation error
 *       404:
 *         description: Event not found
 *       500:
 *         description: Server error
 */
router.post('/:eventId/upload-registrations', verifyToken, verifyCoach, fileUploadMiddleware, async (req, res) => {
  const requestId = req.requestId;
  const eventId = req.params.eventId;
  
  logger.info('HTTP Request', {
    requestId,
    method: 'POST',
    url: `/api/events/${eventId}/upload-registrations`,
    userId: req.user._id,
    fileName: req.file?.originalname,
    fileSize: req.file?.size
  });
  
  try {
    // Validate eventId parameter exists
    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: 'Event ID is required',
        data: null
      });
    }

    // Verify event exists
    logger.logDatabase('Finding event by ID for upload', 'events', { _id: eventId }, {});
    
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
        data: null
      });
    }

    // File validation is handled by fileUploadMiddleware
    // req.file is guaranteed to exist and be valid at this point
    
    logger.info('File upload validation passed', {
      requestId,
      eventId,
      eventName: event.eventName,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      userId: req.user._id
    });

    // Step 1: Parse the uploaded file based on file type
    logger.info('Starting file parsing', {
      requestId,
      fileName: req.file.originalname,
      mimeType: req.file.mimetype
    });

    const parseResult = await parseRegistrationFile(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    if (!parseResult.success) {
      logger.error('File parsing failed', {
        requestId,
        fileName: req.file.originalname,
        error: parseResult.message
      });

      return res.status(400).json({
        success: false,
        message: `File parsing failed: ${parseResult.message}`,
        data: {
          totalProcessed: 0,
          successCount: 0,
          errorCount: 0,
          errors: []
        }
      });
    }

    logger.info('File parsing completed', {
      requestId,
      fileType: parseResult.fileType,
      totalRows: parseResult.totalRows,
      validRecords: parseResult.data.length,
      parseErrors: parseResult.errors.length
    });

    // Step 2: Validate that we have data to process
    if (!parseResult.data || parseResult.data.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid registration data found in the uploaded file',
        data: {
          totalProcessed: parseResult.totalRows || 0,
          successCount: 0,
          errorCount: parseResult.errors.length,
          errors: parseResult.errors
        }
      });
    }

    // Step 3: Process EventRegistration creation/updates
    logger.info('Starting registration processing', {
      requestId,
      recordCount: parseResult.data.length
    });

    const processingResult = await processBatchRegistrations(parseResult.data);

    logger.info('Registration processing completed', {
      requestId,
      totalProcessed: processingResult.totalProcessed,
      successCount: processingResult.successCount,
      errorCount: processingResult.errorCount,
      createdCount: processingResult.createdRegistrations.length,
      updatedCount: processingResult.updatedRegistrations.length
    });

    // Step 4: Format success response with counts and details
    const allErrors = [
      ...parseResult.errors.map(error => ({
        row: error.row || 'Unknown',
        studentName: error.studentName || 'Unknown',
        error: error.error
      })),
      ...processingResult.errors
    ];

    const totalErrorCount = allErrors.length;
    const hasErrors = totalErrorCount > 0;

    // Generate detailed error report
    const errorReport = generateErrorReport(allErrors);

    // Format success response with comprehensive details
    const responseData = {
      totalProcessed: processingResult.totalProcessed,
      successCount: processingResult.successCount,
      errorCount: totalErrorCount,
      errors: allErrors,
      // Additional details for better user feedback
      createdCount: processingResult.createdRegistrations.length,
      updatedCount: processingResult.updatedRegistrations.length,
      fileInfo: {
        fileName: req.file.originalname,
        fileType: parseResult.fileType,
        fileSize: req.file.size,
        totalRows: parseResult.totalRows
      },
      errorSummary: errorReport.summary
    };

    // Generate appropriate success/error message based on results
    let message;
    let httpStatus;
    let isSuccess;

    if (processingResult.successCount > 0 && !hasErrors) {
      // Complete success
      message = `Successfully processed all ${processingResult.successCount} registrations (${processingResult.createdRegistrations.length} created, ${processingResult.updatedRegistrations.length} updated)`;
      httpStatus = 200;
      isSuccess = true;
    } else if (processingResult.successCount > 0 && hasErrors) {
      // Partial success
      message = `Partially successful: ${processingResult.successCount} registrations processed (${processingResult.createdRegistrations.length} created, ${processingResult.updatedRegistrations.length} updated), ${totalErrorCount} failed. Check error details below.`;
      httpStatus = 200; // Still return 200 for partial success
      isSuccess = true;
    } else if (totalErrorCount > 0) {
      // Complete failure
      message = `Upload failed: All ${totalErrorCount} registrations encountered errors. Please check the file format and data.`;
      httpStatus = 400;
      isSuccess = false;
    } else {
      // No data processed
      message = 'No registration data found to process';
      httpStatus = 400;
      isSuccess = false;
    }

    logger.info('Upload processing completed', {
      requestId,
      success: isSuccess,
      totalProcessed: processingResult.totalProcessed,
      successCount: processingResult.successCount,
      errorCount: totalErrorCount,
      httpStatus
    });

    res.status(httpStatus).json({
      success: isSuccess,
      message: message,
      data: responseData
    });

  } catch (error) {
    logger.logError(error, req);
    
    // Handle and format various error scenarios with appropriate HTTP status codes
    let errorMessage = 'Server error during file upload processing';
    let httpStatus = 500;
    
    // Database connection errors
    if (error.name === 'MongoError' || error.name === 'MongooseError') {
      errorMessage = 'Database connection error. Please try again later.';
      httpStatus = 503; // Service Unavailable
    }
    // Invalid ObjectId format
    else if (error.name === 'CastError' && error.path === '_id') {
      errorMessage = 'Invalid event ID format';
      httpStatus = 400; // Bad Request
    }
    // Validation errors
    else if (error.name === 'ValidationError') {
      errorMessage = `Data validation error: ${error.message}`;
      httpStatus = 400; // Bad Request
    }
    // File processing errors
    else if (error.message && error.message.includes('file')) {
      errorMessage = `File processing error: ${error.message}`;
      httpStatus = 400; // Bad Request
    }
    // Memory or resource errors
    else if (error.name === 'RangeError' || error.message.includes('memory')) {
      errorMessage = 'File too large or system resources exceeded. Please try with a smaller file.';
      httpStatus = 413; // Payload Too Large
    }
    // Timeout errors
    else if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
      errorMessage = 'Request timeout. Please try again with a smaller file.';
      httpStatus = 408; // Request Timeout
    }
    // Permission errors
    else if (error.message && error.message.includes('permission')) {
      errorMessage = 'Insufficient permissions to perform this operation';
      httpStatus = 403; // Forbidden
    }
    
    // Format error response consistently
    const errorResponse = {
      success: false,
      message: errorMessage,
      data: {
        totalProcessed: 0,
        successCount: 0,
        errorCount: 1,
        errors: [{
          row: 'N/A',
          studentName: 'N/A',
          error: error.message || 'Unknown server error'
        }],
        fileInfo: req.file ? {
          fileName: req.file.originalname,
          fileSize: req.file.size,
          mimeType: req.file.mimetype
        } : null
      }
    };
    
    res.status(httpStatus).json(errorResponse);
  }
});

module.exports = router;