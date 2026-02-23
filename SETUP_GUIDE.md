# Setup Guide - AI-Powered Exam Suite

## Quick Start

### Prerequisites Check
- [ ] Node.js installed (v14+)
- [ ] MongoDB installed and running (local or Atlas)
- [ ] OpenAI API key obtained

## Step-by-Step Setup

### 1. Clone and Install
```bash
# Navigate to project directory
cd AIEXAMSUITE2

# Install dependencies
npm install
```

### 2. MongoDB Setup

#### Option A: Local MongoDB
```bash
# Start MongoDB service
# Windows:
net start MongoDB

# Linux/Mac:
brew services start mongodb-community
# or
sudo systemctl start mongod
```

#### Option B: MongoDB Atlas (Cloud)
- Create account at https://www.mongodb.com/cloud/atlas
- Create cluster and get connection string
- Update MONGODB_URI in .env

### 3. Configure Environment

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/ai-exam-suite
# Or for Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ai-exam-suite?retryWrites=true&w=majority

# JWT Secret (generate a secure random string)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-min-32-chars
JWT_EXPIRE=7d

# OpenAI API Key
OPENAI_API_KEY=sk-your-openai-api-key-here

# File Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000
```

### 4. Get OpenAI API Key

1. Visit https://platform.openai.com/
2. Sign up or log in
3. Go to API Keys section
4. Create new secret key
5. Copy and paste in .env file

**Note:** You'll need a paid OpenAI account to use GPT-4

### 5. Create Upload Directory

The server will automatically create the uploads directory, but you can create it manually:

```bash
mkdir uploads
mkdir uploads/units
mkdir uploads/topics
mkdir uploads/attachments
```

### 6. Start the Server

#### Development Mode (with auto-reload)
```bash
npm run dev
```

#### Production Mode
```bash
npm start
```

You should see:
```
Server running in development mode on port 5000
MongoDB Connected: localhost
```

### 7. Test the Setup

Open your browser or use Postman:

```bash
GET http://localhost:5000/api/health
```

Expected response:
```json
{
  "success": true,
  "message": "Server is running"
}
```

## Create Test Users

### Register Faculty
```bash
POST http://localhost:5000/api/auth/register
Content-Type: application/json

{
  "name": "Dr. Smith",
  "email": "prof.smith@university.edu",
  "password": "Test1234!",
  "role": "faculty",
  "department": "Computer Science"
}
```

### Register Student
```bash
POST http://localhost:5000/api/auth/register
Content-Type: application/json

{
  "name": "John Student",
  "email": "john.student@university.edu",
  "password": "Test1234!",
  "role": "student",
  "studentId": "STU2024001"
}
```

## Usage Workflow

### For Faculty

1. **Login**
   ```bash
   POST /api/auth/login
   # Save the returned token
   ```

2. **Create Subject**
   ```bash
   POST /api/subjects
   Authorization: Bearer <token>
   {
     "code": "CSE101",
     "name": "Machine Learning",
     "semester": "Fall 2024",
     "department": "Computer Science",
     "description": "Intro to ML"
   }
   ```

3. **Create Unit**
   ```bash
   POST /api/units
   Authorization: Bearer <token>
   # Add subjectId in body
   ```

4. **Create Topic (AI will analyze)**
   ```bash
   POST /api/topics
   Authorization: Bearer <token>
   # Add unitId in body
   # Upload reference files
   ```

5. **Create Exam**
   ```bash
   POST /api/exams
   Authorization: Bearer <token>
   ```

6. **Generate Questions with AI**
   ```bash
   POST /api/exams/:id/generate-questions
   Authorization: Bearer <token>
   { "count": 10 }
   ```

7. **Assign to Students**
   ```bash
   PUT /api/exams/:id/assign
   Authorization: Bearer <token>
   { "assignedTo": ["student_id"] }
   ```

### For Students

1. **Login**
   ```bash
   POST /api/auth/login
   ```

2. **View Assigned Exams**
   ```bash
   GET /api/exams
   Authorization: Bearer <token>
   ```

3. **Start Exam**
   ```bash
   POST /api/exams/:id/start
   Authorization: Bearer <token>
   ```

4. **Submit Answers**
   ```bash
   POST /api/answers
   Authorization: Bearer <token>
   {
     "examId": "...",
     "questionId": "...",
     "answerText": "..."
   }
   ```

5. **View Results**
   ```bash
   GET /api/analytics/student
   Authorization: Bearer <token>
   ```

## Troubleshooting

### MongoDB Connection Error
```
Error: Could not connect to MongoDB
```
**Solution:** Check MongoDB is running and MONGODB_URI is correct

### OpenAI API Error
```
Error: Invalid API key
```
**Solution:** Verify OPENAI_API_KEY in .env

### Port Already in Use
```
Error: Port 5000 is already in use
```
**Solution:** Change PORT in .env to another port (e.g., 5001)

### File Upload Error
```
Error: ENOENT: no such file or directory
```
**Solution:** Ensure uploads directories exist:
```bash
mkdir -p uploads/units uploads/topics uploads/attachments
```

## Security Checklist

Before deploying to production:

- [ ] Change JWT_SECRET to a strong random string
- [ ] Set NODE_ENV=production
- [ ] Use MongoDB Atlas or secure local MongoDB
- [ ] Enable HTTPS
- [ ] Configure CORS for specific domains
- [ ] Set up rate limiting
- [ ] Implement request validation
- [ ] Add logging and monitoring
- [ ] Regular database backups
- [ ] Keep dependencies updated

## Production Deployment

### Using PM2
```bash
npm install -g pm2
pm2 start server.js --name ai-exam-suite
pm2 save
pm2 startup
```

### Using Docker
```bash
# Build image
docker build -t ai-exam-suite .

# Run container
docker run -p 5000:5000 --env-file .env ai-exam-suite
```

## Next Steps

1. Explore the API with Postman or similar tool
2. Build a frontend interface (React suggested)
3. Customize AI prompts in `services/aiService.js`
4. Add email notifications
5. Implement real-time features with Socket.io

## Support

For issues or questions:
- Check API_DOCUMENTATION.md for endpoint details
- Review README.md for feature overview
- Open an issue on GitHub

Happy Coding! 🚀


