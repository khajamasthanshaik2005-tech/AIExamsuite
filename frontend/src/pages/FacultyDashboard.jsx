import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { CheckCircle, Clock, Users, FileText, BarChart3, Star, MessageSquare } from 'lucide-react'
import api from '../services/api'

export default function FacultyDashboard() {
  const [stats, setStats] = useState({
    subjects: 0,
    units: 0,
    topics: 0,
    exams: 0,
    pendingEvaluations: 0
  })
  const [recentExams, setRecentExams] = useState([])
  const [pendingAnswers, setPendingAnswers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      // Fetch subjects
      const subjectsResponse = await api.get('/subjects')
      const subjects = subjectsResponse.data.data || []
      
      // Fetch units for all subjects
      let totalUnits = 0
      let totalTopics = 0
      for (const subject of subjects) {
        try {
          const unitsResponse = await api.get(`/units/subject/${subject._id}`)
          totalUnits += unitsResponse.data.data?.length || 0
          
          // Fetch topics for each unit
          for (const unit of unitsResponse.data.data || []) {
            try {
              const topicsResponse = await api.get(`/topics/unit/${unit._id}`)
              totalTopics += topicsResponse.data.data?.length || 0
            } catch (error) {
              console.error('Error fetching topics:', error)
            }
          }
        } catch (error) {
          console.error('Error fetching units:', error)
        }
      }
      
      // Fetch exams
      const examsResponse = await api.get('/exams')
      const exams = examsResponse.data.data || []
      
      // Fetch pending evaluations
      const evaluationsResponse = await api.get('/answers/pending-evaluations')
      const pendingEvaluations = evaluationsResponse.data.data || []
      
      setStats({
        subjects: subjects.length,
        units: totalUnits,
        topics: totalTopics,
        exams: exams.length,
        pendingEvaluations: pendingEvaluations.length
      })
      
      setRecentExams(exams.slice(0, 5))
      setPendingAnswers(pendingEvaluations.slice(0, 5))
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEvaluateAnswer = async (answerId) => {
    try {
      await api.post(`/answers/${answerId}/evaluate`)
      alert('Answer evaluated successfully!')
      fetchDashboardData()
    } catch (error) {
      alert('Error evaluating answer')
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Faculty Dashboard</h1>
          <p className="text-gray-600 mt-2">Welcome back! Here's your overview</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <div className="card">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Subjects</p>
                <p className="text-2xl font-bold text-gray-900">{stats.subjects}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <FileText className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Units</p>
                <p className="text-2xl font-bold text-gray-900">{stats.units}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <FileText className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Topics</p>
                <p className="text-2xl font-bold text-gray-900">{stats.topics}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <FileText className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Exams</p>
                <p className="text-2xl font-bold text-gray-900">{stats.exams}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <MessageSquare className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pendingEvaluations}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Exams */}
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Recent Exams</h2>
              <a href="/exams" className="text-primary-600 hover:text-primary-700 text-sm">
                View All
              </a>
            </div>
            {recentExams.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">No exams created yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentExams.map((exam) => (
                  <div key={exam._id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{exam.title}</p>
                      <p className="text-sm text-gray-600">{exam.subject?.code}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">{exam.questions?.length || 0} questions</p>
                      <span className={`px-2 py-1 rounded text-xs ${
                        exam.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                        exam.status === 'published' ? 'bg-green-100 text-green-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {exam.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pending Evaluations */}
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Pending Evaluations</h2>
              <a href="/evaluations" className="text-primary-600 hover:text-primary-700 text-sm">
                View All
              </a>
            </div>
            {pendingAnswers.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-2" />
                <p className="text-gray-500">No pending evaluations</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingAnswers.map((answer) => (
                  <div key={answer._id} className="p-3 border rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium text-gray-900">{answer.question?.text?.substring(0, 50)}...</p>
                        <p className="text-sm text-gray-600">Student: {answer.student?.name}</p>
                      </div>
                      <button
                        onClick={() => handleEvaluateAnswer(answer._id)}
                        className="btn-primary text-sm"
                      >
                        Evaluate
                      </button>
                    </div>
                    <p className="text-sm text-gray-600">
                      Answer: {answer.answerText?.substring(0, 100)}...
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <a href="/subjects" className="btn-secondary text-center">
              <FileText className="h-5 w-5 mx-auto mb-2" />
              Manage Subjects
            </a>
            <a href="/exams/create" className="btn-secondary text-center">
              <FileText className="h-5 w-5 mx-auto mb-2" />
              Create Exam
            </a>
            <a href="/analytics" className="btn-secondary text-center">
              <BarChart3 className="h-5 w-5 mx-auto mb-2" />
              View Analytics
            </a>
            <a href="/evaluations" className="btn-secondary text-center">
              <MessageSquare className="h-5 w-5 mx-auto mb-2" />
              Evaluate Answers
            </a>
          </div>
        </div>
      </div>
    </Layout>
  )
}