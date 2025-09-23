const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// Swagger definition
const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Orienteering Quiz App API',
      version: '1.0.0',
      description: 'API documentation for the Orienteering Quiz Application',
      contact: {
        name: 'API Support',
        email: 'support@orienteeringx.cn'
      }
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production' 
          ? 'https://api.orienteeringx.cn'
          : `http://localhost:${process.env.PORT || 5000}`,
        description: process.env.NODE_ENV === 'production' 
          ? 'Production server'
          : 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'User ID'
            },
            username: {
              type: 'string',
              description: 'Username'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email'
            },
            role: {
              type: 'string',
              enum: ['student', 'coach'],
              description: 'User role'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Account creation date'
            }
          }
        },
        Student: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'Student ID'
            },
            name: {
              type: 'string',
              description: 'Student name'
            },
            grade: {
              type: 'string',
              description: 'Student grade'
            },
            userId: {
              type: 'string',
              description: 'Associated user ID'
            },
            coachId: {
              type: 'string',
              description: 'Coach ID'
            }
          }
        },
        Quiz: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'Quiz ID'
            },
            title: {
              type: 'string',
              description: 'Quiz title'
            },
            description: {
              type: 'string',
              description: 'Quiz description'
            },
            questions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  question: { type: 'string' },
                  options: {
                    type: 'array',
                    items: { type: 'string' }
                  },
                  correctAnswer: { type: 'number' }
                }
              }
            },
            createdBy: {
              type: 'string',
              description: 'Coach who created the quiz'
            }
          }
        },
        Assignment: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'Assignment ID'
            },
            title: {
              type: 'string',
              description: 'Assignment title'
            },
            quizId: {
              type: 'string',
              description: 'Associated quiz ID'
            },
            assignedTo: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of student IDs'
            },
            dueDate: {
              type: 'string',
              format: 'date-time',
              description: 'Assignment due date'
            },
            createdBy: {
              type: 'string',
              description: 'Coach who created the assignment'
            }
          }
        },
        QuizResult: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'Result ID'
            },
            quizId: {
              type: 'string',
              description: 'Quiz ID'
            },
            userId: {
              type: 'string',
              description: 'User ID'
            },
            score: {
              type: 'number',
              description: 'Quiz score'
            },
            correctCount: {
              type: 'number',
              description: 'Number of correct answers'
            },
            totalQuestions: {
              type: 'number',
              description: 'Total number of questions'
            },
            duration: {
              type: 'number',
              description: 'Time taken in seconds'
            },
            completedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Completion timestamp'
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                message: {
                  type: 'string',
                  description: 'Error message'
                },
                requestId: {
                  type: 'string',
                  description: 'Request ID for tracking'
                },
                timestamp: {
                  type: 'string',
                  format: 'date-time',
                  description: 'Error timestamp'
                }
              }
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: ['./routes/*.js'], // Path to the API files
};

// Generate swagger specification
const specs = swaggerJsdoc(options);

// Swagger UI options
const swaggerUiOptions = {
  explorer: true,
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true
  }
};

module.exports = {
  specs,
  swaggerUi,
  swaggerUiOptions
};