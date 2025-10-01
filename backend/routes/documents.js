const express = require('express');
const multer = require('multer');
const { verifyToken, verifyCoachOrStudent } = require('../middleware/auth');
const Document = require('../models/Document');
const EventRegistration = require('../models/EventRegistration');
const logger = require('../utils/logger');

const router = express.Router();

// Configure multer for file upload (memory storage)
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 5 // Max 5 files per upload
  },
  fileFilter: (req, file, cb) => {
    // Allowed file types
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png', 
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件类型。请上传图片、PDF或Word文档。'), false);
    }
  }
});

// Add middleware to handle UTF-8 filenames
const handleUTF8Filenames = (req, res, next) => {
  if (req.files) {
    req.files.forEach(file => {
      try {
        // Try to properly decode the filename
        const decoded = decodeURIComponent(escape(file.originalname));
        file.originalname = decoded;
      } catch (e) {
        // If decoding fails, keep the original name
        console.warn('Failed to decode filename:', file.originalname);
      }
    });
  }
  next();
};

/**
 * @swagger
 * /api/documents/upload/{registrationId}:
 *   post:
 *     summary: Upload documents for event registration
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: registrationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Event registration ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *               descriptions:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Optional descriptions for each file
 *     responses:
 *       200:
 *         description: Files uploaded successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Registration not found
 *       500:
 *         description: Server error
 */
router.post('/upload/:registrationId', verifyToken, verifyCoachOrStudent, upload.array('files', 5), handleUTF8Filenames, async (req, res) => {
  const requestId = req.requestId;
  logger.info('HTTP Request', {
    requestId,
    method: 'POST',
    url: `/api/documents/upload/${req.params.registrationId}`,
    userId: req.user._id,
    fileCount: req.files?.length || 0
  });

  try {
    const { registrationId } = req.params;
    let { descriptions = [] } = req.body;
    
    // Parse descriptions if it's a JSON string
    if (typeof descriptions === 'string') {
      try {
        descriptions = JSON.parse(descriptions);
      } catch (e) {
        descriptions = [];
      }
    }
    
    // Log for debugging
    logger.info('Processing file upload', {
      requestId,
      fileCount: req.files?.length || 0,
      descriptionsType: typeof descriptions,
      descriptions: descriptions
    });
    
    // Check if registration exists and user has permission
    const registration = await EventRegistration.findById(registrationId);
    if (!registration) {
      return res.status(404).json({ message: '报名记录未找到' });
    }

    // Check if user owns this registration (students can only upload to their own registrations)
    if (req.user.role === 'student' && registration.studentId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: '无权限上传文件到此报名记录' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: '请选择要上传的文件' });
    }

    // Check total document count limit
    const currentDocCount = registration.documents.length;
    if (currentDocCount + req.files.length > 5) {
      return res.status(400).json({ 
        message: `每个报名记录最多只能上传5个文件。当前已有${currentDocCount}个文件，无法再上传${req.files.length}个文件。` 
      });
    }

    const uploadedDocuments = [];
    
    // Process each file
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      let description = Array.isArray(descriptions) ? descriptions[i] || '' : descriptions || '';
      
      // Ensure description is a string, not an array
      if (Array.isArray(description)) {
        description = description.join(' ') || '';
      }
      
      // Ensure it's a string
      description = String(description || '').trim();
      
      // Create document record (filename already processed by middleware)
      const timestamp = Date.now();
      
      const document = new Document({
        filename: `${timestamp}_${file.originalname}`,
        originalName: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
        data: file.buffer,
        uploadedBy: req.user._id,
        description: description
      });

      await document.save();
      
      // Add to registration
      registration.documents.push({
        documentId: document._id,
        description: description,
        uploadedAt: new Date()
      });

      uploadedDocuments.push({
        id: document._id,
        filename: document.filename,
        originalName: document.originalName,
        mimeType: document.mimeType,
        fileSize: document.fileSize,
        description: description,
        uploadedAt: document.uploadedAt
      });
    }

    await registration.save();

    logger.info('Documents uploaded successfully', {
      requestId,
      registrationId,
      documentCount: uploadedDocuments.length,
      userId: req.user._id
    });

    res.json({
      message: '文件上传成功',
      documents: uploadedDocuments
    });

  } catch (error) {
    logger.error('Document upload failed', {
      requestId,
      error: error.message,
      stack: error.stack
    });

    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: '文件大小超过5MB限制' });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ message: '一次最多只能上传5个文件' });
    }
    if (error.message.includes('不支持的文件类型')) {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/documents/{documentId}:
 *   get:
 *     summary: Download/view a document
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Document ID
 *     responses:
 *       200:
 *         description: Document file
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Document not found
 *       500:
 *         description: Server error
 */
router.get('/:documentId', verifyToken, verifyCoachOrStudent, async (req, res) => {
  const requestId = req.requestId;
  logger.info('HTTP Request', {
    requestId,
    method: 'GET',
    url: `/api/documents/${req.params.documentId}`,
    userId: req.user._id
  });

  try {
    const { documentId } = req.params;
    
    const document = await Document.findById(documentId);
    if (!document) {
      return res.status(404).json({ message: '文件未找到' });
    }

    // Check if user has permission to view this document
    // Students can only view their own documents, coaches can view all
    if (req.user.role === 'student' && document.uploadedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: '无权限查看此文件' });
    }

    // Set appropriate headers with proper Chinese filename encoding
    const isViewable = document.mimeType.startsWith('image/') || document.mimeType === 'application/pdf';
    const disposition = isViewable ? 'inline' : 'attachment';
    
    res.set({
      'Content-Type': document.mimeType,
      'Content-Length': document.fileSize,
      'Content-Disposition': `${disposition}; filename*=UTF-8''${encodeURIComponent(document.originalName)}`,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    logger.info('Document served successfully', {
      requestId,
      documentId,
      filename: document.originalName,
      fileSize: document.fileSize,
      userId: req.user._id
    });

    res.send(document.data);

  } catch (error) {
    logger.error('Document download failed', {
      requestId,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/documents/{documentId}:
 *   delete:
 *     summary: Delete a document
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Document ID
 *     responses:
 *       200:
 *         description: Document deleted successfully
 *       404:
 *         description: Document not found
 *       500:
 *         description: Server error
 */
router.delete('/:documentId', verifyToken, verifyCoachOrStudent, async (req, res) => {
  const requestId = req.requestId;
  logger.info('HTTP Request', {
    requestId,
    method: 'DELETE',
    url: `/api/documents/${req.params.documentId}`,
    userId: req.user._id
  });

  try {
    const { documentId } = req.params;
    
    const document = await Document.findById(documentId);
    if (!document) {
      return res.status(404).json({ message: '文件未找到' });
    }

    // Check if user has permission to delete this document
    if (req.user.role === 'student' && document.uploadedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: '无权限删除此文件' });
    }

    // Remove document reference from all registrations
    await EventRegistration.updateMany(
      { 'documents.documentId': documentId },
      { $pull: { documents: { documentId: documentId } } }
    );

    // Delete the document
    await Document.findByIdAndDelete(documentId);

    logger.info('Document deleted successfully', {
      requestId,
      documentId,
      filename: document.originalName,
      userId: req.user._id
    });

    res.json({ message: '文件删除成功' });

  } catch (error) {
    logger.error('Document deletion failed', {
      requestId,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/documents/registration/{registrationId}:
 *   get:
 *     summary: Get document list for a registration
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: registrationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Event registration ID
 *     responses:
 *       200:
 *         description: Document list retrieved successfully
 *       404:
 *         description: Registration not found
 *       500:
 *         description: Server error
 */
router.get('/registration/:registrationId', verifyToken, verifyCoachOrStudent, async (req, res) => {
  const requestId = req.requestId;
  logger.info('HTTP Request', {
    requestId,
    method: 'GET',
    url: `/api/documents/registration/${req.params.registrationId}`,
    userId: req.user._id
  });

  try {
    const { registrationId } = req.params;
    
    const registration = await EventRegistration.findById(registrationId)
      .populate({
        path: 'documents.documentId',
        select: 'filename originalName mimeType fileSize uploadedAt description'
      });

    if (!registration) {
      return res.status(404).json({ message: '报名记录未找到' });
    }

    // Check if user has permission to view this registration's documents
    if (req.user.role === 'student' && registration.studentId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: '无权限查看此报名记录的文件' });
    }

    const documents = registration.documents.map(doc => ({
      id: doc.documentId._id,
      filename: doc.documentId.filename,
      originalName: doc.documentId.originalName,
      mimeType: doc.documentId.mimeType,
      fileSize: doc.documentId.fileSize,
      description: doc.description,
      uploadedAt: doc.uploadedAt
    }));

    logger.info('Registration documents retrieved successfully', {
      requestId,
      registrationId,
      documentCount: documents.length,
      userId: req.user._id
    });

    res.json({ documents });

  } catch (error) {
    logger.error('Registration documents retrieval failed', {
      requestId,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;