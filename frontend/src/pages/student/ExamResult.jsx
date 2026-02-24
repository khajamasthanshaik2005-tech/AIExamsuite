import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../../components/Layout'
import { FileText, Download, CheckCircle, XCircle, Sparkles } from 'lucide-react'
import { examService } from '../../services/examService'

export default function ExamResult() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchResult = async () => {
      try {
        const res = await examService.getMyResult(id)
        setData(res.data.data)
      } catch (e) {
        console.error('Error loading result:', e)
        setError(e.response?.data?.message || 'Failed to load result')
      } finally {
        setLoading(false)
      }
    }
    fetchResult()
  }, [id])

  const stripHtml = (html) => {
    if (!html) return ''
    const div = document.createElement('div')
    div.innerHTML = html
    return div.textContent || div.innerText || ''
  }

  const handleDownload = () => {
    if (!data?.attempt?.answerScriptPath) return
    const backendUrl =
      (import.meta.env && (import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_BASE_URL)) ||
      'http://localhost:5000'
    window.open(`${backendUrl}/${data.attempt.answerScriptPath}`, '_blank')
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

  if (error) {
    return (
      <Layout>
        <div className="card text-center py-12">
          <FileText className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Result not available</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button onClick={() => navigate(-1)} className="btn-secondary">
            Go Back
          </button>
        </div>
      </Layout>
    )
  }

  const { exam, attempt, answers } = data || {}
  const passed = attempt?.passed

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Exam Result</h1>
            <p className="text-gray-600 mt-2">
              {exam?.title} ({exam?.type}){exam?.subject ? ` – ${exam.subject.name}` : ''}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Total Marks: {exam?.totalMarks} | Passing Marks: {exam?.passingMarks}
            </p>
          </div>
          <div className="text-right">
            <div
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}
            >
              {passed ? <CheckCircle className="h-4 w-4 mr-1" /> : <XCircle className="h-4 w-4 mr-1" />}
              {passed ? 'Passed' : 'Failed'}
            </div>
            <p className="mt-2 text-lg font-semibold text-gray-900">
              Score: {attempt?.totalScore ?? 0}/{exam?.totalMarks}
            </p>
            {attempt?.submittedAt && (
              <p className="text-xs text-gray-500 mt-1">
                Submitted: {new Date(attempt.submittedAt).toLocaleString()}
              </p>
            )}
            {attempt?.answerScriptPath && (
              <button onClick={handleDownload} className="btn-secondary mt-3 flex items-center gap-2">
                <Download className="h-4 w-4" />
                Download Answer Script (PDF)
              </button>
            )}
          </div>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            Question-wise Feedback (AI + Marks)
          </h2>
          {!answers || answers.length === 0 ? (
            <p className="text-gray-600 text-sm">No answers found for this exam.</p>
          ) : (
            <div className="space-y-4">
              {answers.map((ans, idx) => {
                const q = ans.question
                if (!q) return null
                const maxMarks = q.marks || ans.maxScore || 0
                return (
                  <div key={ans._id || idx} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-gray-900">
                        Q{idx + 1}. {stripHtml(q.text || '')}
                      </h3>
                      <div className="text-sm text-gray-700">
                        Marks: <span className="font-semibold">{ans.score ?? 0}</span> / {maxMarks}
                      </div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded mb-2">
                      <p className="text-sm font-medium text-gray-700 mb-1">Your Answer:</p>
                      <p className="text-gray-800 whitespace-pre-wrap">
                        {stripHtml(ans.answerText || 'No answer provided')}
                      </p>
                    </div>
                    {ans.aiEvaluation && (
                      <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded">
                        <p className="text-sm font-semibold text-blue-900 mb-1 flex items-center gap-2">
                          <Sparkles className="h-4 w-4" />
                          AI Feedback
                        </p>
                        <p className="text-xs text-gray-700 mb-1">
                          Suggested Score: <span className="font-semibold">
                            {ans.aiEvaluation.suggestedScore ?? ans.score ?? 0}/{maxMarks}
                          </span>
                        </p>
                        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                          {ans.aiEvaluation.contentRelevance != null && (
                            <span>Relevance: {ans.aiEvaluation.contentRelevance}/10</span>
                          )}
                          {ans.aiEvaluation.completeness != null && (
                            <span>Completeness: {ans.aiEvaluation.completeness}/10</span>
                          )}
                          {ans.aiEvaluation.grammarScore != null && (
                            <span>Grammar: {ans.aiEvaluation.grammarScore}/10</span>
                          )}
                        </div>
                        {ans.aiEvaluation.feedback && (
                          <p className="text-xs text-gray-700 mt-2 italic">
                            {ans.aiEvaluation.feedback}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}

