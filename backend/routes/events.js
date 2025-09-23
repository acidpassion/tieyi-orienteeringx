const express = require('express');
const Event = require('../models/Event');
const CompletionRecord = require('../models/CompletionRecord');
const { verifyToken, verifyCoach, verifyCoachOrStudent } = require('../middleware/auth');
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
    const { search, startDate, endDate } = req.query;
    
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

/**
 * @swagger
 * /api/events:
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
 *     responses:
 *       201:
 *         description: Event created successfully
 *       400:
 *         description: Validation error
 *       500:
 *         description: Server error
 */
router.post('/', verifyToken, verifyCoach, async (req, res) => {
  const requestId = req.requestId;
  logger.info('HTTP Request', {
    requestId,
    method: 'POST',
    url: '/api/events',
    userId: req.user._id,
    body: req.body
  });
  
  try {
    const { eventName, organization, startDate, endDate, eventType } = req.body;
    
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
      eventType
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
 * /api/events/{id}:
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
 */
router.put('/:id', verifyToken, verifyCoach, async (req, res) => {
  const requestId = req.requestId;
  logger.info('HTTP Request', {
    requestId,
    method: 'PUT',
    url: `/api/events/${req.params.id}`,
    userId: req.user._id,
    body: req.body
  });
  
  try {
    const { eventName, organization, startDate, endDate, eventType } = req.body;
    
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

/**
 * @swagger
 * /api/events/{id}:
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
    logger.logDatabase('Getting distinct event types', 'events', {}, {});
    
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

module.exports = router;