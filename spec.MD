*   **Quizzes Collection:** Added `quiz_title_cn`, `category_cn`, and `description_cn`.
*   **Questions Collection:** Added `question_text_cn`, `explanation_cn`, and also a `text_cn` field within the `options` array, as seen in your sample data.

### **Updated Mongoose Schemas**

**Quiz Schema:**
```javascript
{
  // ... other fields
  "quiz_title": String,
  "quiz_title_cn": String,
  "description": String,
  "description_cn": String,
  "category": String,
  "category_cn": String,
  // ... other fields
}
```

**Question Schema:**
```javascript
{
  // ... other fields
  "question_text": String,
  "question_text_cn": String,
  "options": [{
    "id": String,
    "text": String,
    "text_cn": String
  }],
  "explanation": String,
  "explanation_cn": String,
  // ... other fields
}
```

I have integrated these changes directly into the final, professional prompt below. You can now use this complete prompt to generate your application.

---

### **Final Professional Prompt for Gemini**

Act as an expert full-stack software engineer. Your task is to generate a complete MERN stack application for an orienteering knowledge quiz platform.

**Project Name:** OrienteeringX Quiz

**Technology Stack:**
*   **Backend:** Node.js with Express.js
*   **Frontend:** React with Vite and Tailwind CSS
*   **Database:** MongoDB with Mongoose
*   **Authentication:** JSON Web Tokens (JWT)

**Database Schemas (Mongoose):**
You will need to create models for `Quiz`, `Question`, `QuizResult`, `Student`, and `Assignment`.

1.  **Student:**
    *   `username`: String, required, unique
    *   `password`: String, required (default: '8888888', but implement password hashing with bcrypt)
    *   `role`: String, enum: ['student', 'coach'], default: 'student'

2.  **Quiz:**
    *   `quiz_title`: String
    *   `quiz_title_cn`: String
    *   `description`: String
    *   `description_cn`: String
    *   `category`: String
    *   `category_cn`: String
    *   `maxTime`: Number (in minutes)
    *   `maxQuestions`: Number
    *   `difficulty`: String ('1', '2', '3')
    *   `status`: String ('active', 'inactive')
    *   `createdBy`: ObjectId referencing the `User` who created it.

3.  **Question:**
    *   `quizId`: ObjectId referencing a `Quiz`
    *   `sortIndex`: Number
    *   `type`: String (enum: 'single_choice', 'multi_choice', 'true_false', 'graphics_recognition', 'matching', 'imageMatching')
    *   `question_text`: String
    *   `question_text_cn`: String
    *   `image_url`: String (optional, for graphics_recognition)
    *   `options`: Array of objects `[{ id: 'A', text: '...', text_cn: '...' }]`
    *   `matches`: Array of objects (for matching types) `[{ id: 'D', text: '...', text_cn: '...' }]`
    *   `correct_answer`: Array of Strings
    *   `explanation`: String
    *   `explanation_cn`: String

4.  **QuizResult:**
    *   `quizId`: ObjectId referencing a `Quiz`
    *   `userId`: ObjectId referencing a `Student`
    *   `score`: Number
    *   `duration`: Number (in seconds)
    *   `correctCount`: Number
    *   `incorrectCount`: Number
    *   `responses`: Array of objects `[{ questionId: '...', selectedAnswers: ['...'], isCorrect: boolean }]`
    *   `startTime`: Date
    *   `endTime`: Date

5.  **Assignment:**
    *   `quizId`: ObjectId referencing a `Quiz`
    *   `assignedTo`: Array of ObjectId referencing `Student`
    *   `assignedBy`: ObjectId referencing a coach `User`
    *   `dueDate`: Date
    *   `status`: String (enum: ['pending', 'completed'])

**Backend API (Node.js/Express):**
*   **File Structure:** Use a modular structure (e.g., `routes/`, `controllers/`, `models/`, `middleware/`).
*   **Authentication (`/api/auth`):**
    *   `POST /login`: Authenticates a user, returns a JWT. Hash passwords on user creation and compare hashes on login.
*   **Middleware:** Create a `verifyToken` middleware to protect routes.
*   **API Routes:**
    *   `GET /api/quizzes`: Get all quizzes.
    *   `GET /api/quizzes/:id`: Get a single quiz with its questions.
    *   `POST /api/results/submit`: Submit quiz answers. The backend should calculate the score and save the result.
    *   `GET /api/results/student`: Get results for the logged-in student.
    *   `GET /api/assignments/student`: Get assignments for the logged-in student.
    *   **Coach-Only Routes (check for 'coach' role in JWT payload):**
        *   `GET /api/students`: Get a list of all students.
        *   `POST /api/assignments`: Create a new assignment.

**Frontend Application (React/Vite/Tailwind CSS):**
*   **Localization:** The application interface must primarily display the Chinese language fields (e.g., `quiz_title_cn`, `question_text_cn`, `options.text_cn`). The English fields should be used as a fallback only if the Chinese version is not available.
*   **Routing:** Use `react-router-dom` for client-side routing.
    *   `/login`: Login page.
    *   `/dashboard`: Student's assignment view.
    *   `/quiz/:id`: The quiz-taking interface.
    *   `/results/:resultId`: Detailed view of a past quiz result.
    *   `/history`: Student's quiz history.
    *   `/coach/dashboard`: Coach's dashboard.
*   **State Management:** Use React Context API or a library like Zustand for managing global state (e.g., authentication status, user info, theme).
*   **Components:**
    *   **`QuizCard`:** A component to display quiz information on dashboards. It should display `quiz_title_cn` and `category_cn`.
    *   **`Timer`:** A countdown timer for the quiz interface.
    *   **Question Components:** Create separate components for each question type (`SingleChoice.js`, `Matching.js`, etc.) to handle their unique UI and logic. These components must render the `question_text_cn` and `options.text_cn` fields. For matching types, consider using a library like `react-beautiful-dnd` for drag-and-drop functionality.
    *   **`ThemeToggle`:** A button to switch between light and dark modes using Tailwind's dark mode utility (`dark:`).
*   **Authentication Flow:**
    *   On login, store the JWT in `localStorage`.
    *   Create a protected route component that checks for the token. If it doesn't exist, redirect to `/login`.
    *   Use an Axios instance or similar to automatically include the JWT in the `Authorization` header for all API requests.
*   **Styling:**
    *   Use Tailwind CSS for all styling.
    *   Design should be clean, modern, and responsive.
    *   Implement a dark mode. The default theme should be light.
*   **Favicon:** Use an orienteering control flag icon for the favicon.

Please generate the complete code for this application, including the file structure for both the frontend and backend. Provide clear comments where necessary.