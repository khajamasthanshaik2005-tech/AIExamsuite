import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { 
  Home, 
  GraduationCap, 
  BookOpen, 
  FileText, 
  BarChart3, 
  LogOut,
  User,
  ClipboardCheck
} from 'lucide-react'

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const isExamAttempt = location.pathname.startsWith('/exams/')

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const facultyLinks = [
    { to: '/', icon: Home, label: 'Dashboard' },
    { to: '/subjects', icon: GraduationCap, label: 'Subjects' },
    { to: '/exams', icon: FileText, label: 'Exams' },
    { to: '/evaluations', icon: ClipboardCheck, label: 'Evaluations' },
    { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  ]

  const studentLinks = [
    { to: '/', icon: Home, label: 'Dashboard' },
    { to: '/my-exams', icon: FileText, label: 'My Exams' },
    { to: '/analytics', icon: BarChart3, label: 'My Progress' },
  ]

  const links = user?.role === 'faculty' ? facultyLinks : studentLinks

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar (hidden in exam attempt for distraction-free mode) */}
      {!isExamAttempt && (
      <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-lg">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-center h-16 border-b border-gray-200">
            <BookOpen className="h-8 w-8 text-primary-600" />
            <h1 className="ml-2 text-xl font-bold text-gray-800">Exam Suite</h1>
          </div>

          {/* User Info */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-primary-500 flex items-center justify-center">
                  <User className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-700">{user?.name}</p>
                <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 space-y-1">
            {links.map((link) => {
              const Icon = link.icon
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className="flex items-center px-3 py-2 text-gray-700 rounded-lg hover:bg-gray-100 hover:text-primary-600 transition-colors"
                >
                  <Icon className="h-5 w-5 mr-3" />
                  {link.label}
                </Link>
              )
            })}
          </nav>

          {/* Logout Button */}
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-3 py-2 text-gray-700 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <LogOut className="h-5 w-5 mr-3" />
              Logout
            </button>
          </div>
        </div>
      </div>
      )}

      {/* Main Content */}
      <div className={isExamAttempt ? '' : 'ml-64'}>
        <main className="p-8">{children}</main>
      </div>
    </div>
  )
}


