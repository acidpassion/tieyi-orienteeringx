# OrienteeringX Quiz Platform

A comprehensive MERN stack application for orienteering knowledge quizzes, designed for coaches to assign quizzes to students and track their progress.

## Features

### For Students
- **Dashboard**: View assigned quizzes with due dates and difficulty levels
- **Quiz Interface**: Interactive quiz-taking with multiple question types:
  - Single choice
  - Multiple choice
  - True/False
  - Graphics recognition
  - Matching
  - Image matching
- **Timer**: Real-time countdown with automatic submission
- **Question Navigation**: Easy navigation between questions with progress tracking
- **History**: View past quiz attempts with detailed results
- **Dark/Light Mode**: Toggle between themes
- **Multi-language Support**: Switch between English and Chinese (中文) interface

### For Coaches
- **Student Management**: View and manage students
- **Quiz Assignment**: Assign quizzes to individual or multiple students
- **Progress Tracking**: Monitor student performance and completion rates
- **Results Analysis**: View detailed quiz results and student answers

### Question Types Supported
1. **Single Choice**: Radio button selection
2. **Multiple Choice**: Checkbox selection for multiple answers
3. **True/False**: Simple binary choice
4. **Graphics Recognition**: Image-based questions with multiple choice answers
5. **Matching**: Drag-and-drop or dropdown matching between two lists
6. **Image Matching**: Match images with descriptions

## Technology Stack

- **Backend**: Node.js, Express.js, MongoDB, Mongoose
- **Frontend**: React, Vite, Tailwind CSS
- **Authentication**: JWT (JSON Web Tokens)
- **Icons**: Lucide React
- **Styling**: Tailwind CSS with dark mode support
- **Internationalization**: Custom language context for English/Chinese support

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local installation or MongoDB Atlas)
- npm or yarn

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd orienteeringx-quiz
   ```

2. **Install backend dependencies**
   ```bash
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd client
   npm install
   cd ..
   ```

4. **Environment Setup**
   
   Create a `.env` file in the root directory:
   ```env
   MONGODB_URI=mongodb://localhost:27017/orienteeringx-quiz
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   PORT=5000
   NODE_ENV=development
   ```

5. **Start MongoDB**
   
   Make sure MongoDB is running on your system:
   ```bash
   # For local MongoDB installation
   mongod
   
   # Or use MongoDB Atlas connection string in .env
   ```

6. **Start the application**
   ```bash
   # Development mode (runs both backend and frontend)
   npm run dev
   
   # Or run separately:
   # Backend only
   npm run server
   
   # Frontend only (in another terminal)
   npm run client
   ```

7. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:5000

## Login

Use your existing MongoDB user credentials to log in. The application supports both student and coach roles based on the user data in your database.

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login

### Quizzes
- `GET /api/quizzes` - Get all active quizzes
- `GET /api/quizzes/:id` - Get quiz with questions

### Results
- `POST /api/results/submit` - Submit quiz answers
- `GET /api/results/student` - Get student's quiz history
- `GET /api/results/:id` - Get detailed quiz result

### Assignments
- `GET /api/assignments/student` - Get student's assignments
- `POST /api/assignments` - Create assignment (coach only)
- `GET /api/assignments/coach` - Get coach's assignments

### Students
- `GET /api/students` - Get all students (coach only)

## Database Schema

### Collections
- **students**: User accounts (students and coaches)
- **quizzes**: Quiz definitions
- **questions**: Individual quiz questions
- **quiz_results**: Completed quiz attempts
- **assignments**: Quiz assignments from coaches to students

## Project Structure

```
orienteeringx-quiz/
├── backend/                # Backend server
│   ├── models/             # Mongoose models
│   ├── routes/             # Express routes
│   ├── middleware/         # Custom middleware
│   ├── server.js           # Express server
│   └── package.json        # Backend dependencies
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── contexts/       # React context providers (Auth, Theme, Language)
│   │   ├── pages/          # Page components
│   │   └── ...
├── package.json            # Root package with scripts
└── README.md
```

## Multi-language Support

The application supports both English and Chinese languages:

### Database Schema
- Quiz titles: `quiz_title` (English) and `quiz_title_cn` (Chinese)
- Descriptions: `description` (English) and `description_cn` (Chinese)  
- Categories: `category` (English) and `category_cn` (Chinese)
- Questions: `question_text` (English) and `question_text_cn` (Chinese)
- Explanations: `explanation` (English) and `explanation_cn` (Chinese)

### Frontend Implementation
- Language toggle button in the top navigation
- Automatic fallback to English if Chinese text is not available
- Context-based language switching across all components

## Development

### Adding New Question Types

1. Create a new component in `client/src/components/questions/`
2. Add the question type to the enum in `models/Question.js`
3. Update the `renderQuestion` function in `client/src/pages/Quiz.jsx`
4. Update the scoring logic in `routes/results.js`

### Styling

The application uses Tailwind CSS with a custom dark mode implementation. Colors and styling can be customized in `client/tailwind.config.js`.

### Authentication

JWT tokens are stored in localStorage and automatically included in API requests. The token expires after 24 hours.

## Production Deployment

1. **Build the frontend**
   ```bash
   cd client
   npm run build
   ```

2. **Set production environment variables**
   ```env
   NODE_ENV=production
   MONGODB_URI=your-production-mongodb-uri
   JWT_SECRET=your-production-jwt-secret
   PORT=5000
   ```

3. **Start the production server**
   ```bash
   npm start
   ```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For questions or issues, please create an issue in the repository or contact the development team.