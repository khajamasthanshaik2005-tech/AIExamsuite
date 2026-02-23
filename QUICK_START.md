# Quick Start Guide

Get the AI-Powered Exam Suite up and running in 5 minutes!

## Prerequisites
- Node.js (v14+)
- MongoDB (local or Atlas)
- OpenAI API key

## Installation

```bash
# 1. Install dependencies
npm install

# 2. Create .env file (copy from below)

# 3. Start MongoDB (if local)
# Windows: net start MongoDB
# Mac/Linux: brew services start mongodb-community

# 4. Start the server
npm run dev
```

## Environment Variables (.env)

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/ai-exam-suite
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRE=7d
OPENAI_API_KEY=sk-your-key-here
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads
FRONTEND_URL=http://localhost:3000
```

## Test the API

```bash
# Health check
curl http://localhost:5000/api/health

# Register faculty
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Dr. Smith",
    "email": "prof@university.edu",
    "password": "Test1234!",
    "role": "faculty",
    "department": "Computer Science"
  }'

# Register student
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@student.edu",
    "password": "Test1234!",
    "role": "student",
    "studentId": "STU2024001"
  }'
```

## Basic Workflow

### Faculty Workflow
1. **Login** → Get JWT token
2. **Create Subject** → With code, name, department
3. **Create Unit** → Under subject with materials
4. **Create Topic** → With depth level, keywords
5. **Create Exam** → Link to units & topics
6. **Generate Questions** → AI-powered generation
7. **Assign Exam** → To students

### Student Workflow
1. **Login** → Get JWT token
2. **View Exams** → See assigned exams
3. **Start Exam** → Begin attempt
4. **Submit Answers** → Auto-saved
5. **View Results** → Check analytics

## API Testing

Use Postman or curl. Save the token from login!

```bash
# Login (save the token!)
POST /api/auth/login
{ "email": "...", "password": "..." }

# Use token in headers
Authorization: Bearer <token>
```

## Common Issues

### MongoDB not running
```bash
# Check if running
mongosh

# Start it
net start MongoDB  # Windows
brew services start mongodb-community  # Mac
```

### OpenAI API error
- Check your API key in .env
- Ensure account has credits

### Port already in use
Change PORT in .env to 5001

## Next Steps

1. Read `SETUP_GUIDE.md` for detailed setup
2. Check `API_DOCUMENTATION.md` for all endpoints
3. Build your frontend (React recommended)
4. Customize AI prompts in `services/aiService.js`

## Key Features

✅ AI-powered question generation  
✅ Automated answer evaluation  
✅ Subject → Unit → Topic hierarchy  
✅ File uploads (PDF, PPT, DOC)  
✅ Real-time analytics  
✅ Auto-save during exams  
✅ Role-based access control  

Happy coding! 🚀


