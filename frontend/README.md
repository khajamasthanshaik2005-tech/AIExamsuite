# AI-Powered Exam Suite - Frontend

Modern React frontend for the AI-Powered Exam Suite.

## Features

- 🎨 Beautiful, modern UI with Tailwind CSS
- 👥 Authentication (Login/Register)
- 📚 Faculty Dashboard (Manage subjects, units, topics, exams)
- 🎓 Student Dashboard (Take exams, view progress)
- 🤖 AI-powered exam generation
- 📊 Analytics and insights
- 📱 Responsive design

## Quick Start

### Install Dependencies

```bash
cd frontend
npm install
```

### Run Development Server

```bash
npm run dev
```

The frontend will run on `http://localhost:3000`

### Build for Production

```bash
npm run build
```

## Project Structure

```
frontend/
├── src/
│   ├── components/      # Reusable components
│   ├── context/         # React context (Auth)
│   ├── pages/           # Page components
│   ├── services/        # API services
│   ├── App.jsx          # Main app component
│   ├── main.jsx         # Entry point
│   └── index.css        # Global styles
├── index.html
├── vite.config.js
├── tailwind.config.js
└── package.json
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Technologies

- React 18
- Vite
- Tailwind CSS
- React Router
- Axios
- Lucide Icons

## Backend Integration

The frontend connects to the backend API running on `http://localhost:5000`

Make sure the backend server is running before starting the frontend!

## Features by Role

### Faculty
- Create and manage subjects
- Organize units and topics
- Create exams with AI-generated questions
- Assign exams to students
- View analytics and performance metrics
- Review student answers

### Student
- View enrolled subjects
- Access learning materials
- Take assigned exams
- View exam results and feedback
- Track performance analytics
- See AI-powered feedback

## Environment Variables

The frontend connects to the backend automatically via the Vite proxy configured in `vite.config.js`.


