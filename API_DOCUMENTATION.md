# API Documentation

## Base URL
```
http://localhost:5000/api
```

## Authentication

All protected routes require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

---

## Authentication Endpoints

### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "faculty|student",
  "department": "Computer Science",
  "studentId": "STU2024001" // Only for students
}
```

**Response:**
```json
{
  "success": true,
  "token": "jwt_token_here",
  "data": {
    "user": {
      "id": "user_id",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "faculty",
      "department": "Computer Science"
    }
  }
}
```

### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <token>
```

---

## Subject Endpoints

### Get All Subjects
```http
GET /api/subjects
Authorization: Bearer <token>
```

### Get Single Subject
```http
GET /api/subjects/:id
Authorization: Bearer <token>
```

### Create Subject (Faculty Only)
```http
POST /api/subjects
Authorization: Bearer <token>
Content-Type: application/json

{
  "code": "CSE101",
  "name": "Machine Learning",
  "semester": "Fall 2024",
  "department": "Computer Science",
  "description": "Introduction to ML"
}
```

### Update Subject
```http
PUT /api/subjects/:id
Authorization: Bearer <token>
```

### Delete Subject
```http
DELETE /api/subjects/:id
Authorization: Bearer <token>
```

---

## Unit Endpoints

### Get Units for Subject
```http
GET /api/units/subject/:subjectId
Authorization: Bearer <token>
```

### Get Single Unit
```http
GET /api/units/:id
Authorization: Bearer <token>
```

### Create Unit (Faculty Only)
```http
POST /api/units
Authorization: Bearer <token>
Content-Type: multipart/form-data

{
  "title": "Supervised Learning",
  "description": "...",
  "estimatedHours": 20,
  "subjectId": "subject_id"
}
// Upload files as: referenceMaterials[]
```

### Update Unit
```http
PUT /api/units/:id
Authorization: Bearer <token>
```

### Delete Unit
```http
DELETE /api/units/:id
Authorization: Bearer <token>
```

---

## Topic Endpoints

### Get Topics for Unit
```http
GET /api/topics/unit/:unitId
Authorization: Bearer <token>
```

### Get Single Topic
```http
GET /api/topics/:id
Authorization: Bearer <token>
```

### Create Topic (Faculty Only)
```http
POST /api/topics
Authorization: Bearer <token>
Content-Type: multipart/form-data

{
  "title": "Decision Trees",
  "description": "...",
  "depthLevel": 1, // 1=Basic, 2=Intermediate, 3=Advanced
  "keywords": "decision tree, splitting, entropy",
  "teachingHours": 10,
  "unitId": "unit_id"
}
// Upload files as: referenceFiles[]
```

### Update Topic
```http
PUT /api/topics/:id
Authorization: Bearer <token>
```

### Delete Topic
```http
DELETE /api/topics/:id
Authorization: Bearer <token>
```

---

## Exam Endpoints

### Get All Exams
```http
GET /api/exams
Authorization: Bearer <token>
```

### Get Single Exam
```http
GET /api/exams/:id
Authorization: Bearer <token>
```

### Create Exam (Faculty Only)
```http
POST /api/exams
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Midterm Exam",
  "type": "sessional", // quiz | sessional | semester
  "duration": 120, // minutes
  "totalMarks": 100,
  "passingMarks": 50,
  "subject": "subject_id",
  "units": ["unit_id1", "unit_id2"],
  "topics": ["topic_id1", "topic_id2"],
  "instructions": "Follow all instructions",
  "startTime": "2024-12-01T09:00:00Z",
  "endTime": "2024-12-01T11:00:00Z"
}
```

### Generate AI Questions
```http
POST /api/exams/:id/generate-questions
Authorization: Bearer <token>
Content-Type: application/json

{
  "count": 10
}
```

### Assign Exam to Students
```http
PUT /api/exams/:id/assign
Authorization: Bearer <token>
Content-Type: application/json

{
  "assignedTo": ["student_id1", "student_id2"]
}
```

### Start Exam Attempt (Student Only)
```http
POST /api/exams/:id/start
Authorization: Bearer <token>
```

### Get Exam Answers
```http
GET /api/exams/:examId/answers
Authorization: Bearer <token>
```

---

## Question Endpoints

### Get All Questions
```http
GET /api/questions?examId=exam_id
Authorization: Bearer <token>
```

### Get Single Question
```http
GET /api/questions/:id
Authorization: Bearer <token>
```

### Create Question (Faculty Only)
```http
POST /api/questions
Authorization: Bearer <token>
Content-Type: application/json

{
  "text": "What is machine learning?",
  "type": "multiple_choice", // multiple_choice | short_answer | long_answer
  "options": [
    {"text": "Option A", "isCorrect": false},
    {"text": "Option B", "isCorrect": true},
    {"text": "Option C", "isCorrect": false},
    {"text": "Option D", "isCorrect": false}
  ],
  "correctAnswer": "Option B",
  "marks": 2,
  "difficulty": "medium", // easy | medium | hard
  "topic": "topic_id",
  "unit": "unit_id",
  "examId": "exam_id" // optional
}
```

### Update Question
```http
PUT /api/questions/:id
Authorization: Bearer <token>
```

### Delete Question
```http
DELETE /api/questions/:id
Authorization: Bearer <token>
```

---

## Answer Endpoints

### Submit Answer (Student Only)
```http
POST /api/answers
Authorization: Bearer <token>
Content-Type: application/json

{
  "examId": "exam_id",
  "questionId": "question_id",
  "answerText": "My answer here",
  "autoSaved": false // true for auto-save
}
```

### Review Answer (Faculty Only)
```http
PUT /api/answers/:id/review
Authorization: Bearer <token>
Content-Type: application/json

{
  "score": 8,
  "feedback": "Good answer but missing key points"
}
```

---

## Student Endpoints

### Enroll in Subject
```http
POST /api/students/enroll/:subjectId
Authorization: Bearer <token>
```

### Unenroll from Subject
```http
DELETE /api/students/enroll/:subjectId
Authorization: Bearer <token>
```

### Get My Subjects
```http
GET /api/students/my-subjects
Authorization: Bearer <token>
```

### Download Reference Material
```http
GET /api/students/download/:filename
Authorization: Bearer <token>
```

---

## Analytics Endpoints

### Get Faculty Analytics
```http
GET /api/analytics/faculty
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalExams": 5,
    "publishedExams": 3,
    "totalQuestions": 50,
    "examPerformance": [
      {
        "examId": "...",
        "examTitle": "...",
        "totalAttempts": 30,
        "avgScore": 75.5,
        "completionRate": 28,
        "questionAnalytics": [...]
      }
    ]
  }
}
```

### Get Student Analytics
```http
GET /api/analytics/student
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalExams": 3,
    "completedExams": 2,
    "avgScore": 78.5,
    "examHistory": [...],
    "topicCoverage": [
      {
        "topicTitle": "Decision Trees",
        "avgScore": 85,
        "coveragePercentage": 90
      }
    ]
  }
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": "Error message"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Not authorized to access this route"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "Not authorized to update this resource"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Resource not found"
}
```

### 500 Server Error
```json
{
  "success": false,
  "error": "Server Error"
}
```

---

## Notes

- All timestamps are in ISO 8601 format
- File uploads are limited to 10MB
- Supported file types: PDF, PPT, PPTX, DOC, DOCX
- JWT tokens expire in 7 days by default
- Auto-save functionality triggers every 30 seconds during exams
- AI evaluation runs automatically for theory questions


