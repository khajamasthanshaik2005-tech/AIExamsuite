# MongoDB Setup Guide

## Understanding the Connection Flow

### 1. How MongoDB Connection Works

The MongoDB connection is stored as an **environment variable** in a `.env` file:

```
MONGODB_URI=mongodb://localhost:27017/ai-exam-suite
```

When the server starts:
1. `server.js` loads the `.env` file using `dotenv.config()`
2. `database.js` reads `process.env.MONGODB_URI`
3. Connects to MongoDB using that URI
4. All data (subjects, exams, answers) is stored in MongoDB

### 2. You Need to Create `.env` File

I provided `.env.example` as a template. **You must create your own `.env` file.**

## Setup Options

### Option A: Local MongoDB (Easier for Testing)

**Step 1: Install MongoDB**
```bash
# Windows
# Download from: https://www.mongodb.com/try/download/community
# Or use chocolatey: choco install mongodb

# Mac
brew install mongodb-community

# Linux
sudo apt-get install mongodb
```

**Step 2: Start MongoDB**
```bash
# Windows
net start MongoDB

# Mac/Linux
brew services start mongodb-community
# or
sudo systemctl start mongod
```

**Step 3: Create `.env` file**
```env
MONGODB_URI=mongodb://localhost:27017/ai-exam-suite
```

### Option B: MongoDB Atlas (Cloud - No Installation Required)

**Step 1: Create Free Account**
1. Go to https://www.mongodb.com/cloud/atlas
2. Click "Try Free"
3. Sign up (it's free!)

**Step 2: Create Cluster**
1. Click "Build a Database"
2. Choose FREE tier (M0)
3. Select any cloud provider/region
4. Click "Create"

**Step 3: Get Connection String**
1. Click "Connect" on your cluster
2. Choose "Connect your application"
3. Copy the connection string:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

**Step 4: Add Database User**
1. Go to "Database Access"
2. Click "Add New Database User"
3. Create username and password
4. **SAVE THESE CREDENTIALS!**

**Step 5: Update .env File**
Replace `<username>` and `<password>` in connection string:
```env
MONGODB_URI=mongodb+srv://myusername:mypassword@cluster0.xxxxx.mongodb.net/ai-exam-suite?retryWrites=true&w=majority
```

**Step 6: Allow Network Access**
1. Go to "Network Access"
2. Click "Add IP Address"
3. Click "Allow Access from Anywhere"
4. Add `0.0.0.0/0`

## Complete .env File Template

Create a file named `.env` in the project root:

```env
# Server
PORT=5000
NODE_ENV=development

# MongoDB (Choose ONE - either local or Atlas)
# For local:
MONGODB_URI=mongodb://localhost:27017/ai-exam-suite

# For Atlas (replace with your actual credentials):
# MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/ai-exam-suite?retryWrites=true&w=majority

# Authentication
JWT_SECRET=generate-a-random-string-here-at-least-32-chars-long
JWT_EXPIRE=7d

# OpenAI (Get from https://platform.openai.com/api-keys)
OPENAI_API_KEY=sk-your-actual-api-key-here

# File Uploads
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads

# CORS
FRONTEND_URL=http://localhost:3000
```

## How Data is Stored

When you create subjects, exams, etc., the data is stored in MongoDB:

```
ai-exam-suite (database)
├── users (collection)
│   ├── Faculty users
│   └── Student users
├── subjects (collection)
│   └── CSE101, etc.
├── units (collection)
│   └── Linked to subjects
├── topics (collection)
│   └── Linked to units
├── exams (collection)
│   └── Linked to subjects/units/topics
├── questions (collection)
│   └── Questions for exams
├── answers (collection)
│   └── Student answers
└── examattempts (collection)
    └── Exam sessions
```

## Testing Your Connection

After creating `.env`, test the connection:

```bash
# Start the server
npm start

# You should see:
# Server running in development mode on port 5000
# MongoDB Connected: localhost (or your Atlas cluster)
```

## Common Issues

### "Cannot connect to MongoDB"
- Check if MongoDB is running: `mongosh`
- Verify MONGODB_URI in `.env`
- For Atlas: Check network access settings

### "Authentication failed"
- Verify username/password in connection string
- Check database user was created in Atlas

### "Connection timeout"
- For Atlas: Add your IP to Network Access
- Check firewall settings

## Generate Secure JWT Secret

Run this to generate a secure JWT secret:

```bash
# In terminal/command prompt
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and paste it as your `JWT_SECRET` in `.env`

## Summary

1. ✅ Create `.env` file with your MongoDB connection string
2. ✅ Start MongoDB (local) or use Atlas (cloud)
3. ✅ Run `npm start`
4. ✅ Check console for "MongoDB Connected" message
5. ✅ Start creating subjects, exams, and using the system!

The AI integration (for questions and evaluations) uses your OpenAI API key from the `.env` file.


