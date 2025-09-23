const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

// Request ID middleware
const addRequestId = (req, res, next) => {
  req.requestId = uuidv4();
  res.setHeader('X-Request-ID', req.requestId);
  next();
};

// Request logging middleware
const logRequests = (req, res, next) => {
  const startTime = Date.now();
  
  // Log incoming request
  logger.info('Incoming Request', {
    requestId: req.requestId,
    method: req.method,
    url: req.originalUrl,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined
  });

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const responseTime = Date.now() - startTime;
    
    // Log response
    logger.logRequest(req, res, responseTime);
    
    // Call original end method
    originalEnd.call(this, chunk, encoding);
  };

  next();
};

// Error logging middleware
const logErrors = (err, req, res, next) => {
  // Log the error
  logger.logError(err, req);
  
  // Determine error status code
  const statusCode = err.statusCode || err.status || 500;
  
  // Send error response
  res.status(statusCode).json({
    error: {
      message: err.message || 'Internal Server Error',
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
};

// 404 handler with logging
const handle404 = (req, res) => {
  logger.warn('Route Not Found', {
    requestId: req.requestId,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip
  });
  
  res.status(404).json({
    error: {
      message: 'Route not found',
      requestId: req.requestId,
      timestamp: new Date().toISOString()
    }
  });
};

module.exports = {
  addRequestId,
  logRequests,
  logErrors,
  handle404
};