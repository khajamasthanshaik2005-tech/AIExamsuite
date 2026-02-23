# Frontend Setup Guide

## Complete Setup Instructions

I've created a modern, beautiful React frontend for your AI-Powered Exam Suite! 

### Step 1: Navigate to Frontend Directory

```bash
cd frontend
```

### Step 2: Install Dependencies

```bash
npm install
```

This will install:
- React 18
- Vite (build tool)
- Tailwind CSS
- React Router
- Axios
- Lucide Icons

### Step 3: Start Development Server

```bash
npm run dev
```

The frontend will be available at: `http://localhost:3000`

## What's Included

### 🎨 **Beautiful UI Components**
- Modern, responsive design with Tailwind CSS
- Professional dashboard layouts
- Interactive forms and buttons
- Smooth animations and transitions

### 👥 **Authentication**
- Login page with email/password
- Registration page with role selection
- JWT token management
- Protected routes based on user role

### 📚 **Faculty Features**
- Dashboard with statistics
- Subject management (Create, View, Edit, Delete)
- Unit and topic management
- Exam creation and AI-powered question generation
- Student assignment
- Analytics dashboard

### 🎓 **Student Features**
- Personal dashboard
- View enrolled subjects
- Access learning materials
- Take exams with auto-save
- View results and feedback
- Performance tracking

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── Layout.jsx         # Main layout with sidebar
│   │   └── Stats.jsx          # Dashboard statistics
│   ├── context/
│   │   └── AuthContext.jsx   # Authentication context
│   ├── pages/
│   │   ├── Login.jsx         # Login page
│   │   ├── Register.jsx      # Registration page
│   │   ├── FacultyDashboard.jsx
│   │   └── StudentDashboard.jsx
│   ├── services/
│   │   ├── api.js            # Axios configuration
│   │   ├── subjectService.js
│   │   └── examService.js
│   ├── App.jsx               # Main app router
│   ├── main.jsx              # Entry point
│   └── index.css             # Tailwind styles
├── index.html
├── vite.config.js            # Vite configuration
├── tailwind.config.js        # Tailwind configuration
└── package.json
```

## How to Use

### 1. Make Sure Backend is Running

The backend should be running on `http://localhost:5000`

### 2. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

### 3. Access the Application

Open your browser and go to: `http://localhost:3000`

### 4. Register/Login

- Register as Faculty or Student
- Login with your credentials
- You'll be redirected to the appropriate dashboard

## Available Routes

### Public
- `/login` - Login page
- `/register` - Registration page

### Faculty Routes
- `/` - Faculty dashboard
- `/subjects` - Manage subjects
- `/exams` - Manage exams
- `/analytics` - View analytics

### Student Routes
- `/` - Student dashboard
- `/my-exams` - View assigned exams
- `/analytics` - View progress

## Styling

The frontend uses **Tailwind CSS** for styling. Key classes:

- `btn-primary` - Primary button
- `btn-secondary` - Secondary button
- `input-field` - Form inputs
- `card` - Card container

## Building for Production

When ready to deploy:

```bash
npm run build
```

This creates an optimized build in the `dist/` folder.

## Next Steps

1. Complete the missing page components (Subject, Unit, Topic, Exam management pages)
2. Add more detailed features
3. Connect all pages to the backend API
4. Add loading states and error handling
5. Implement file upload functionality

## Notes

- The frontend automatically proxies API calls to `http://localhost:5000`
- Authentication tokens are stored in localStorage
- The app uses React Router for navigation
- All components are responsive and mobile-friendly

Happy coding! 🚀


