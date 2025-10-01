const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// Import logging utilities and Swagger
const logger = require('./utils/logger');
const { addRequestId, logRequests, logErrors, handle404 } = require('./middleware/logging');
const { specs, swaggerUi, swaggerUiOptions } = require('./config/swagger');

const authRoutes = require('./routes/auth');
const quizRoutes = require('./routes/quizzes');
const resultRoutes = require('./routes/results');
const assignmentRoutes = require('./routes/assignments');
const studentRoutes = require('./routes/students');
const quizSessionRoutes = require('./routes/quizSessions');
const completionRecordRoutes = require('./routes/completionRecords');
const eventRoutes = require('./routes/events');
const registrationRoutes = require('./routes/registrations');
const relayTeamRoutes = require('./routes/relayTeams');
const configurationRoutes = require('./routes/configurations');
const documentRoutes = require('./routes/documents');

const app = express();

// Logging middleware
app.use(addRequestId);
app.use(logRequests);

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Increase limit for base64 image uploads
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, swaggerUiOptions));

// Health check endpoint
app.get('/health', (req, res) => {
  logger.info('Health check requested', { requestId: req.requestId });
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/results', resultRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/quiz-sessions', quizSessionRoutes);
app.use('/api/completion-records', completionRecordRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/registrations', registrationRoutes);
app.use('/api/relay-teams', relayTeamRoutes);
app.use('/api/configurations', configurationRoutes);
app.use('/api/documents', documentRoutes);

// 404 handler
app.use('*', handle404);

// Error handling middleware (must be last)
app.use(logErrors);

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    logger.info('MongoDB connected successfully', {
      database: process.env.MONGODB_URI?.split('/').pop()?.split('?')[0]
    });
  })
  .catch(err => {
    logger.error('MongoDB connection failed', { error: err.message, stack: err.stack });
    process.exit(1);
  });

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  logger.info('Server started successfully', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    swaggerDocs: `http://localhost:${PORT}/api-docs`
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  mongoose.connection.close(() => {
    logger.info('MongoDB connection closed');
    process.exit(0);
  });
});