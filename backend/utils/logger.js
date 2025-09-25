const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

// Create logs directory if it doesn't exist
const fs = require('fs');
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format for structured logging
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, requestId, method, url, statusCode, responseTime, stack, ...meta }) => {
    const logEntry = {
      timestamp,
      level,
      message,
      ...(requestId && { requestId }),
      ...(method && { method }),
      ...(url && { url }),
      ...(statusCode && { statusCode }),
      ...(responseTime && { responseTime }),
      ...(stack && { stack }),
      ...meta
    };
    return JSON.stringify(logEntry);
  })
);

// Configure transports
const transports = [
  // Console transport for development
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple(),
      winston.format.printf(({ timestamp, level, message, requestId, method, url, statusCode, responseTime }) => {
        let logMessage = `${timestamp} [${level}]: ${message}`;
        if (requestId) logMessage += ` | RequestID: ${requestId}`;
        if (method && url) logMessage += ` | ${method} ${url}`;
        if (statusCode) logMessage += ` | Status: ${statusCode}`;
        if (responseTime) logMessage += ` | ${responseTime}ms`;
        return logMessage;
      })
    )
  }),

  // File transport for all logs
  new DailyRotateFile({
    filename: path.join(logsDir, 'application-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d',
    format: logFormat
  }),

  // Separate file for errors
  new DailyRotateFile({
    filename: path.join(logsDir, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    maxSize: '20m',
    maxFiles: '30d',
    format: logFormat
  })
];

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports,
  exitOnError: false
});

// Helper functions for structured logging
logger.logRequest = (req, res, responseTime) => {
  if (!req || typeof req.get !== 'function') {
    logger.error('Invalid request object passed to logRequest');
    return;
  }
  
  logger.info('HTTP Request', {
    requestId: req.requestId,
    method: req.method,
    url: req.originalUrl,
    statusCode: res?.statusCode,
    responseTime,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });
};

logger.logError = (error, req = null) => {
  const errorLog = {
    message: error.message,
    stack: error.stack,
    ...(req && typeof req.get === 'function' && {
      requestId: req.requestId,
      method: req.method,
      url: req.originalUrl,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    })
  };
  logger.error('Application Error', errorLog);
};

logger.logAuth = (action, userId, req, success = true, details = {}) => {
  logger.info('Authentication Event', {
    action,
    userId,
    success,
    requestId: req?.requestId,
    ip: req?.ip,
    userAgent: req && typeof req.get === 'function' ? req.get('User-Agent') : undefined,
    ...details
  });
};

logger.logDatabase = (operation, collection, query = {}, result = {}) => {
  // 避免对复杂对象进行JSON.stringify，这会导致数据被意外序列化
  const safeQuery = typeof query === 'object' && query !== null ? 
    Object.keys(query).reduce((acc, key) => {
      // 只记录简单的查询信息，避免序列化复杂的嵌套对象
      if (typeof query[key] === 'string' || typeof query[key] === 'number' || typeof query[key] === 'boolean') {
        acc[key] = query[key];
      } else {
        acc[key] = '[Complex Object]';
      }
      return acc;
    }, {}) : query;
    
  logger.info('Database Operation', {
    operation,
    collection,
    query: safeQuery,
    resultCount: result.length || (result.acknowledged ? 1 : 0)
  });
};

module.exports = logger;