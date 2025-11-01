const multer = require('multer');
const path = require('path');

// Configure multer for file upload
const storage = multer.memoryStorage(); // Store files in memory for processing

// File filter to validate file types
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'text/csv',
    'application/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];
  
  const allowedExtensions = ['.csv', '.xlsx', '.xls'];
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  // Check both MIME type and file extension
  if (allowedMimeTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only CSV and Excel files are allowed.'), false);
  }
};

// Configure multer with file size and type validation
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB file size limit
    files: 1 // Only allow single file upload
  }
});

// Middleware for single file upload
const uploadSingle = upload.single('file');

// Error handling middleware for multer errors
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size too large. Maximum size is 10MB.',
        error: 'FILE_SIZE_LIMIT_EXCEEDED'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Only one file is allowed.',
        error: 'FILE_COUNT_LIMIT_EXCEEDED'
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected file field. Use "file" as the field name.',
        error: 'UNEXPECTED_FILE_FIELD'
      });
    }
  }
  
  if (error.message === 'Invalid file type. Only CSV and Excel files are allowed.') {
    return res.status(400).json({
      success: false,
      message: error.message,
      error: 'INVALID_FILE_TYPE'
    });
  }
  
  // Pass other errors to the next error handler
  next(error);
};

// Combined middleware that handles upload and errors
const fileUploadMiddleware = (req, res, next) => {
  uploadSingle(req, res, (error) => {
    if (error) {
      return handleUploadError(error, req, res, next);
    }
    
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded. Please select a CSV or Excel file.',
        error: 'NO_FILE_UPLOADED'
      });
    }
    
    next();
  });
};

module.exports = {
  fileUploadMiddleware,
  handleUploadError
};