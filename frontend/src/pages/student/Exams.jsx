import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../../components/Layout'
import { FileText, Clock, CalendarDays, Play, CheckCircle, XCircle, AlertCircle, Eye } from 'lucide-react'
import { examService } from '../../services/examService'

export default function StudentExams() {
  const [exams, setExams] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchExams()
  }, [])

  const fetchExams = async () => {
    try {
      const response = await examService.getAll()
      const examsData = response.data.data || []
      
      // Fetch attempt status for each exam
      const examsWithStatus = await Promise.all(
        examsData.map(async (exam) => {
          try {
            const statusRes = await examService.getAttemptStatus(exam._id)
            return {
              ...exam,
              attemptStatus: statusRes.data?.data
            }
          } catch (e) {
            return { ...exam, attemptStatus: null }
          }
        })
      )
      
      setExams(examsWithStatus)
    } catch (error) {
      console.error('Error fetching exams:', error)
    } finally {
      setLoading(false)
    }
  }

  const fmt = (dt) => {
    if (!dt) return '-'
    const d = new Date(dt)
    return d.toLocaleString()
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Exams</h1>
          <p className="text-gray-600 mt-2">View and take your assigned exams</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : exams.length === 0 ? (
          <div className="card text-center py-12">
            <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No exams assigned</h3>
            <p className="text-gray-600">You don't have any exams assigned yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {exams.map((exam) => (
              <div key={exam._id} className="card hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900">{exam.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {exam.type.charAt(0).toUpperCase() + exam.type.slice(1)} Exam
                    </p>
                    <div className="flex items-center gap-4 mt-3 text-sm text-gray-600">
                      <span className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {exam.duration} minutes
                      </span>
                      <span>Total Marks: {exam.totalMarks}</span>
                      <span className="flex items-center">
                        <CalendarDays className="h-4 w-4 mr-1" />
                        {fmt(exam.startTime)} - {fmt(exam.endTime)}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {exam.attemptStatus && (
                      <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                        exam.attemptStatus.status === 'submitted' || exam.attemptStatus.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : exam.attemptStatus.status === 'abandoned'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {exam.attemptStatus.status === 'submitted' || exam.attemptStatus.status === 'completed' ? (
                          <>
                            <CheckCircle className="h-4 w-4" />
                            <span>Submitted</span>
                          </>
                        ) : exam.attemptStatus.status === 'abandoned' ? (
                          <>
                            <XCircle className="h-4 w-4" />
                            <span>Abandoned</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="h-4 w-4" />
                            <span>In Progress</span>
                          </>
                        )}
                      </div>
                    )}
                    {/* Action button: either Take/Continue exam, or View Result when published */} 
                    {exam.attemptStatus && (exam.attemptStatus.status === 'submitted' || exam.attemptStatus.status === 'completed' || exam.attemptStatus.status === 'abandoned') ? (
                      exam.attemptStatus.resultsPublished ? (
                        <Link
                          to={`/exams/${exam._id}/result`}
                          className="btn-primary flex items-center"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Result
                        </Link>
                      ) : (
                        <button
                          disabled
                          className="btn-secondary flex items-center opacity-50 cursor-not-allowed"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Submitted – Waiting for Results
                        </button>
                      )
                    ) : (
                      <Link
                        to={`/exams/${exam._id}`}
                        className="btn-primary flex items-center"
                      >
                        <Play className="h-4 w-4 mr-2" />
                        {exam.attemptStatus?.status === 'in_progress' ? 'Continue Exam' : 'Take Exam'}
                      </Link>
                    )}
                  </div>
                </div>
                {exam.instructions && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-700">{exam.instructions}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}