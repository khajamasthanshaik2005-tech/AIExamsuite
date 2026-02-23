# AI-Powered Exam Suite

A comprehensive examination system with AI-powered question generation and automated evaluation capabilities.

## Features

### 📚 Faculty Management
- **Subject Management**: Create, edit, and delete subjects with code, name, semester, and department
- **Unit Management**: Organize subjects into units with teaching hours and reference materials
- **Topic Management**: Define topics under units with depth levels, keywords, and reference files
- **AI Analysis**: Automatic analysis of uploaded materials for subtopics, Bloom's taxonomy, and coverage

### ✏️ Exam Creation
- **Smart Question Generation**: AI-powered generation of MCQ, short answer, and long answer questions
- **Flexible Exam Types**: Quiz, Sessional, and Semester exams
- **Question Bank**: Reusable question bank with tagging by topic, unit, and difficulty
- **Exam Assignment**: Assign exams to individual students or entire classes

### 🎓 Student Interaction
- **Access Learning Materials**: View subjects, units, and topics with downloadable reference materials
- **Online Exams**: Take exams with rich text editor, diagrams, and tables
- **Auto-Save**: Automatic saving of answers to prevent data loss
- **Timer Control**: Built-in timer for exam duration control

### 🤖 AI Evaluation
- **Automated Grading**: Automatic grading for MCQs and AI-assisted evaluation for theory questions
- **Content Analysis**: NLP analysis of answers for grammar, relevance, and completeness
- **Coverage Analysis**: Topic coverage percentage and Bloom's taxonomy level assessment
- **Feedback Generation**: Constructive feedback for students

### 📊 Analytics & Insights
- **Faculty Dashboard**: Exam performance, question-level analytics, and topic coverage reports
- **Student Dashboard**: Grade tracking, topic coverage analysis, and performance insights
- **Performance Metrics**: Strength and weakness analysis across topics and units

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (JSON Web Tokens)
- **File Upload**: Multer (supports PDF, PPT, DOC)
- **AI Integration**: OpenAI GPT API
- **Security**: Helmet, bcryptjs, role-based access control

## Installation

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or Atlas)
- OpenAI API Key

### Steps

1. **Clone the repository**
```bash
git clone <repository-url>
cd AIEXAMSUITE2
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/ai-exam-suite

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d

# OpenAI API Configuration
OPENAI_API_KEY=your-openai-api-key-here

# File Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

4. **Start the server**
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Subjects
- `GET /api/subjects` - Get all subjects
- `GET /api/subjects/:id` - Get single subject
- `POST /api/subjects` - Create subject (Faculty)
- `PUT /api/subjects/:id` - Update subject (Faculty)
- `DELETE /api/subjects/:id` - Delete subject (Faculty)

### Units
- `GET /api/units/subject/:subjectId` - Get units for subject
- `GET /api/units/:id` - Get single unit
- `POST /api/units` - Create unit (Faculty)
- `PUT /api/units/:id` - Update unit (Faculty)
- `DELETE /api/units/:id` - Delete unit (Faculty)

### Topics
- `GET /api/topics/unit/:unitId` - Get topics for unit
- `GET /api/topics/:id` - Get single topic
- `POST /api/topics` - Create topic (Faculty)
- `PUT /api/topics/:id` - Update topic (Faculty)
- `DELETE /api/topics/:id` - Delete topic (Faculty)

### Exams
- `GET /api/exams` - Get all exams
- `GET /api/exams/:id` - Get single exam
- `POST /api/exams` - Create exam (Faculty)
- `PUT /api/exams/:id` - Update exam (Faculty)
- `POST /api/exams/:id/generate-questions` - Generate AI questions
- `PUT /api/exams/:id/assign` - Assign exam to students
- `POST /api/exams/:id/start` - Start exam attempt (Student)
- `DELETE /api/exams/:id` - Delete exam (Faculty)

### Questions
- `GET /api/questions` - Get all questions
- `GET /api/questions/:id` - Get single question
- `POST /api/questions` - Create question (Faculty)
- `PUT /api/questions/:id` - Update question (Faculty)
- `DELETE /api/questions/:id` - Delete question (Faculty)

### Answers
- `POST /api/answers` - Submit answer (Student)
- `PUT /api/answers/:id/review` - Review answer (Faculty)
- `GET /api/exams/:examId/answers` - Get exam answers

### Analytics
- `GET /api/analytics/faculty` - Get faculty analytics
- `GET /api/analytics/student` - Get student analytics

## Usage Examples

### Register Faculty
```javascript
POST /api/auth/register
{
  "name": "Dr. John Smith",
  "email": "john.smith@university.edu",
  "password": "securePassword123",
  "role": "faculty",
  "department": "Computer Science"
}
```

### Register Student
```javascript
POST /api/auth/register
{
  "name": "Jane Doe",
  "email": "jane.doe@student.edu",
  "password": "studentPass123",
  "role": "student",
  "studentId": "STU2024001"
}
```

### Create Subject
```javascript
POST /api/subjects
Headers: { Authorization: "Bearer <token>" }
{
  "code": "CSE101",
  "name": "Machine Learning",
  "semester": "Fall 2024",
  "department": "Computer Science",
  "description": "Introduction to machine learning algorithms"
}
```

### Generate Exam Questions
```javascript
POST /api/exams/:examId/generate-questions
Headers: { Authorization: "Bearer <token>" }
{
  "count": 10
}
```

### Submit Answer
```javascript
POST /api/answers
Headers: { Authorization: "Bearer <token>" }
{
  "examId": "exam_id",
  "questionId": "question_id",
  "answerText": "Student's answer here",
  "autoSaved": false
}
```

## Project Structure

```
AIEXAMSUITE2/
├── config/
│   ├── database.js       # MongoDB connection
│   └── multer.js         # File upload configuration
├── controllers/
│   ├── authController.js
│   ├── subjectController.js
│   ├── unitController.js
│   ├── topicController.js
│   ├── examController.js
│   ├── questionController.js
│   ├── answerController.js
│   └── analyticsController.js
├── middleware/
│   ├── auth.js           # JWT authentication
│   ├── errorHandler.js   # Global error handler
│   └── asyncHandler.js
├── models/
│   ├── User.js
│   ├── Subject.js
│   ├── Unit.js
│   ├── Topic.js
│   ├── Exam.js
│   ├── Question.js
│   ├── Answer.js
│   └── ExamAttempt.js
├── routes/
│   ├── auth.js
│   ├── subjects.js
│   ├── units.js
│   ├── topics.js
│   ├── exams.js
│   ├── questions.js
│   ├── answers.js
│   └── analytics.js
├── services/
│   └── aiService.js      # AI integration
├── utils/
│   └── generateToken.js
├── uploads/              # Uploaded files
├── server.js             # Main server file
├── package.json
└── README.md
```

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Role-based access control (Faculty/Student)
- Helmet for HTTP headers security
- CORS configuration
- File upload validation
- Input sanitization

## AI Features

### Question Generation
- Analyzes topic content and reference materials
- Generates questions based on depth level and keywords
- Creates multiple question types (MCQ, Short Answer, Long Answer)
- Tags questions by difficulty and topic

### Answer Evaluation
- Grammar and content analysis
- Relevance and completeness scoring
- Topic coverage percentage
- Bloom's taxonomy level assessment
- Automatic feedback generation

## Database Models

### User
- Role-based (Faculty/Student)
- Authentication credentials
- Department/Student ID

### Subject → Unit → Topic
- Hierarchical structure
- Reference materials support
- AI analysis metadata

### Exam → Questions → Answers
- Flexible exam types
- Auto-grading for MCQs
- AI evaluation for theory
- Comprehensive analytics

## Contributing

Contributions are welcome! Please follow these steps:
1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License - feel free to use this project for your educational needs.

## Support

For issues and questions, please open an issue on GitHub.

## Future Enhancements

- [ ] Real-time exam monitoring
- [ ] Advanced plagiarism detection
- [ ] Video/audio answer support
- [ ] Mobile app interface
- [ ] Integration with LMS platforms
- [ ] Multi-language support

---

**Built with ❤️ for the education community**


