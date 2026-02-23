import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Register from './pages/Register'
import FacultyDashboard from './pages/FacultyDashboard'
import StudentDashboard from './pages/StudentDashboard'
import FacultySubjects from './pages/faculty/Subjects'
import FacultyUnits from './pages/faculty/Units'
import FacultyTopics from './pages/faculty/Topics'
import FacultyExams from './pages/faculty/Exams'
import CreateExam from './pages/faculty/CreateExam'
import EditExam from './pages/faculty/EditExam'
import Evaluations from './pages/faculty/Evaluations'
import StudentExams from './pages/student/Exams'
import TakeExam from './pages/student/TakeExam'
import ExamResult from './pages/student/ExamResult'
import Analytics from './pages/Analytics'

function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
      <Route path="/register" element={!user ? <Register /> : <Navigate to="/" />} />
      
      {/* Protected Routes */}
      <Route path="/" element={user ? (user.role === 'faculty' ? <FacultyDashboard /> : <StudentDashboard />) : <Navigate to="/login" />} />
      
      {/* Faculty Routes */}
      {user?.role === 'faculty' && (
        <>
          <Route path="/subjects" element={<FacultySubjects />} />
          <Route path="/units" element={<FacultyUnits />} />
          <Route path="/topics" element={<FacultyTopics />} />
          <Route path="/exams" element={<FacultyExams />} />
          <Route path="/exams/create" element={<CreateExam />} />
          <Route path="/exams/edit/:id" element={<EditExam />} />
          <Route path="/evaluations" element={<Evaluations />} />
          <Route path="/analytics" element={<Analytics />} />
        </>
      )}
      
      {/* Student Routes */}
      {user?.role === 'student' && (
        <>
          <Route path="/my-exams" element={<StudentExams />} />
          <Route path="/exams/:id" element={<TakeExam />} />
          <Route path="/exams/:id/result" element={<ExamResult />} />
          <Route path="/analytics" element={<Analytics />} />
        </>
      )}
      
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}

export default App

