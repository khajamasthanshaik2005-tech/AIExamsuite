import { useState, useEffect } from 'react'
import Layout from '../../components/Layout'
import { evaluationService } from '../../services/evaluationService'
import { answerKeyService } from '../../services/answerKeyService'
import { examService } from '../../services/examService'
import {
  FileText,
  Download,
  CheckCircle,
  XCircle,
  Filter,
  Eye,
  Upload,
  Sparkles,
  RefreshCw,
} from 'lucide-react'

export default function Evaluations() {
  const [exams, setExams] = useState([])
  const [selectedExam, setSelectedExam] = useState(null)
  const [submissions, setSubmissions] = useState([])
  const [filters, setFilters] = useState({ branch: '', year: '', section: '' })
  const [filterOptions, setFilterOptions] = useState({ branches: [], years: [], sections: [] })
  const [loading, setLoading] = useState(true)
  const [selectedSubmission, setSelectedSubmission] = useState(null)
  const [showEvaluation, setShowEvaluation] = useState(false)
  const [answerKeys, setAnswerKeys] = useState([])
  const [uploading, setUploading] = useState(false)
  const [evaluating, setEvaluating] = useState(false)
  const [showAnswerKeyUpload, setShowAnswerKeyUpload] = useState(false)
  const [uploadCohort, setUploadCohort] = useState({ targetBranch: '', targetYear: '', targetSection: '' })

  useEffect(() => {
    fetchExams()
  }, [])

  useEffect(() => {
    if (selectedExam) {
      fetchSubmissions()
      fetchFilterOptions()
      fetchAnswerKeys()
    }
  }, [selectedExam, filters])

  const fetchAnswerKeys = async () => {
    if (!selectedExam) return
    try {
      const response = await answerKeyService.getAll(selectedExam._id)
      const data = response.data.data
      setAnswerKeys(Array.isArray(data) ? data : (data ? [data] : []))
    } catch (error) {
      if (error.response?.status !== 404) console.error('Error fetching answer keys:', error)
      setAnswerKeys([])
    }
  }

  const handleUploadAnswerKey = async (file) => {
    if (!selectedExam || !file) return
    setUploading(true)
    try {
      await answerKeyService.upload(selectedExam._id, file, uploadCohort)
      alert('Answer key uploaded and processed successfully!')
      await fetchAnswerKeys()
      setShowAnswerKeyUpload(false)
      setUploadCohort({ targetBranch: '', targetYear: '', targetSection: '' })
    } catch (error) {
      console.error('Error uploading answer key:', error)
      alert(error.response?.data?.message || 'Failed to upload answer key')
    } finally {
      setUploading(false)
    }
  }

  const hasAnswerKeyForCohort = (branch, year, section) => {
    if (answerKeys.length === 0) return false
    const sb = (branch || '').trim().toLowerCase()
    const sy = (year || '').trim().toLowerCase()
    const ss = (section || '').trim().toLowerCase()
    return answerKeys.some(k => {
      const tb = (k.targetBranch || '').trim().toLowerCase()
      const ty = (k.targetYear || '').trim().toLowerCase()
      const ts = (k.targetSection || '').trim().toLowerCase()
      const matchB = !tb || tb === sb
      const matchY = !ty || ty === sy
      const matchS = !ts || ts === ss
      return matchB && matchY && matchS
    })
  }

  const canBulkEvaluate = answerKeys.length > 0 && submissions.length > 0
  const filtersActive = !!(filters.branch || filters.year || filters.section)

  const handleAutoEvaluate = async (attemptId) => {
    if (!window.confirm('Auto-evaluate this submission using AI?')) return
    setEvaluating(true)
    try {
      await evaluationService.autoEvaluateSubmission(attemptId)
      alert('Submission auto-evaluated successfully!')
      await fetchSubmissions()
    } catch (error) {
      console.error('Error auto-evaluating:', error)
      alert(error.response?.data?.message || 'Failed to auto-evaluate')
    } finally {
      setEvaluating(false)
    }
  }

  const handleBulkEvaluateFiltered = async () => {
    if (!selectedExam || !canBulkEvaluate) return
    if (!filtersActive) {
      alert('Select Branch, Year, and/or Section to evaluate class-wise.')
      return
    }
    if (!window.confirm(`Evaluate ${submissions.length} submission(s) for ${filters.branch || 'All'} / ${filters.year || 'All'} / ${filters.section || 'All'}?`)) return
    setEvaluating(true)
    try {
      const response = await evaluationService.bulkAutoEvaluate(selectedExam._id, filters)
      alert(`Bulk evaluation completed! ${response.data.data.evaluated} evaluated, ${response.data.data.errors} errors.`)
      await fetchSubmissions()
    } catch (error) {
      console.error('Error bulk evaluating:', error)
      alert(error.response?.data?.message || 'Failed to bulk evaluate')
    } finally {
      setEvaluating(false)
    }
  }

  const handleBulkEvaluateAll = async () => {
    if (!selectedExam || !canBulkEvaluate) return
    if (!window.confirm(`Evaluate ALL submissions for this exam (${submissions.length} shown)? This may take a while.`)) return
    setEvaluating(true)
    try {
      const response = await evaluationService.bulkAutoEvaluate(selectedExam._id)
      alert(`Bulk evaluation completed! ${response.data.data.evaluated} evaluated, ${response.data.data.errors} errors.`)
      await fetchSubmissions()
    } catch (error) {
      console.error('Error bulk evaluating:', error)
      alert(error.response?.data?.message || 'Failed to bulk evaluate')
    } finally {
      setEvaluating(false)
    }
  }

  const fetchExams = async () => {
    try {
      const response = await examService.getAll()
      setExams(response.data.data || [])
    } catch (error) {
      console.error('Error fetching exams:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchFilterOptions = async () => {
    if (!selectedExam) return
    try {
      const response = await evaluationService.getFilterOptions(selectedExam._id)
      setFilterOptions(response.data.data || { branches: [], years: [], sections: [] })
    } catch (error) {
      console.error('Error fetching filter options:', error)
    }
  }

  const fetchSubmissions = async () => {
    if (!selectedExam) return
    setLoading(true)
    try {
      const response = await evaluationService.getExamSubmissions(selectedExam._id, filters)
      setSubmissions(response.data.data || [])
    } catch (error) {
      console.error('Error fetching submissions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleViewSubmission = async (attemptId) => {
    try {
      const response = await evaluationService.getSubmission(attemptId)
      setSelectedSubmission(response.data.data)
      setShowEvaluation(true)
    } catch (error) {
      console.error('Error fetching submission:', error)
      alert('Failed to load submission details')
    }
  }

  const handleDownloadPDF = (attempt) => {
    if (!attempt.answerScriptPath) {
      alert('PDF not available for this submission')
      return
    }
    const backendUrl = (import.meta.env && import.meta.env.VITE_BACKEND_URL) || 'http://localhost:5000'
    window.open(`${backendUrl}/${attempt.answerScriptPath}`, '_blank')
  }

  const handleViewAnswerKey = (key) => {
    const backendUrl = (import.meta.env && import.meta.env.VITE_BACKEND_URL) || 'http://localhost:5000'
    window.open(`${backendUrl}/${key.path}`, '_blank')
  }

  if (loading && !selectedExam) {
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
          <h1 className="text-3xl font-bold text-gray-900">Evaluate Answers</h1>
          <p className="text-gray-600 mt-2">Review and grade student exam submissions by subject, year, and branch</p>
        </div>

        {/* Step 1: Select Exam */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Step 1: Select Exam</h2>
          <select
            className="input-field"
            value={selectedExam?._id || ''}
            onChange={(e) => {
              const exam = exams.find(ex => ex._id === e.target.value)
              setSelectedExam(exam || null)
              setSubmissions([])
              setAnswerKeys([])
              setFilters({ branch: '', year: '', section: '' })
            }}
          >
            <option value="">-- Select an exam --</option>
            {exams.map((exam) => (
              <option key={exam._id} value={exam._id}>
                {exam.title} ({exam.type}) {exam.subject?.name ? `- ${exam.subject.name}` : ''}
              </option>
            ))}
          </select>
        </div>

        {selectedExam && (
          <>
            {/* Step 2: Answer Keys (Subject / Year / Branch) */}
            <div className="card bg-blue-50 border-l-4 border-blue-600">
              <h2 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Step 2: Answer Keys
              </h2>
              <p className="text-sm text-gray-600 mb-3">
                Upload answer keys for specific Branch / Year / Section. Each cohort can have its own answer key.
              </p>

              {answerKeys.length > 0 && (
                <div className="mb-4 overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Branch</th>
                        <th className="text-left py-2">Year</th>
                        <th className="text-left py-2">Section</th>
                        <th className="text-left py-2">File</th>
                        <th className="text-left py-2">Uploaded</th>
                        <th className="text-left py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {answerKeys.map((key) => (
                        <tr key={key._id} className="border-b border-gray-200">
                          <td className="py-2">{key.targetBranch || 'All'}</td>
                          <td className="py-2">{key.targetYear || 'All'}</td>
                          <td className="py-2">{key.targetSection || 'All'}</td>
                          <td className="py-2 font-medium">{key.filename || '—'}</td>
                          <td className="py-2 text-gray-600">
                            {key.uploadedAt ? new Date(key.uploadedAt).toLocaleDateString() : '—'}
                          </td>
                          <td className="py-2">
                            <button
                              onClick={() => handleViewAnswerKey(key)}
                              className="text-primary-600 hover:underline mr-3"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <button
                onClick={() => setShowAnswerKeyUpload(!showAnswerKeyUpload)}
                className="btn-primary text-sm flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                {showAnswerKeyUpload ? 'Cancel' : 'Upload Answer Key'}
              </button>

              {showAnswerKeyUpload && (
                <div className="mt-4 p-4 bg-white rounded border">
                  <p className="text-sm font-medium text-gray-700 mb-2">Map to Branch / Year / Section (leave empty for "All"):</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Branch</label>
                      <select
                        className="input-field"
                        value={uploadCohort.targetBranch}
                        onChange={(e) => setUploadCohort({ ...uploadCohort, targetBranch: e.target.value })}
                      >
                        <option value="">All Branches</option>
                        {filterOptions.branches.map((b) => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Year</label>
                      <select
                        className="input-field"
                        value={uploadCohort.targetYear}
                        onChange={(e) => setUploadCohort({ ...uploadCohort, targetYear: e.target.value })}
                      >
                        <option value="">All Years</option>
                        {filterOptions.years.map((y) => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Section</label>
                      <select
                        className="input-field"
                        value={uploadCohort.targetSection}
                        onChange={(e) => setUploadCohort({ ...uploadCohort, targetSection: e.target.value })}
                      >
                        <option value="">All Sections</option>
                        {filterOptions.sections.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => {
                      const file = e.target.files[0]
                      if (file) handleUploadAnswerKey(file)
                    }}
                    className="input-field"
                    disabled={uploading}
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Upload a PDF. The system will extract and structure it. Select Branch/Year/Section to map this key to a specific cohort.
                  </p>
                  {uploading && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-blue-600">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Processing answer key...
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Step 3: Filter Submissions */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Filter className="h-5 w-5 text-gray-600" />
                Step 3: Filter Submissions
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Branch</label>
                  <select
                    className="input-field"
                    value={filters.branch}
                    onChange={(e) => setFilters({ ...filters, branch: e.target.value })}
                  >
                    <option value="">All Branches</option>
                    {filterOptions.branches.map((branch) => (
                      <option key={branch} value={branch}>{branch}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Year</label>
                  <select
                    className="input-field"
                    value={filters.year}
                    onChange={(e) => setFilters({ ...filters, year: e.target.value })}
                  >
                    <option value="">All Years</option>
                    {filterOptions.years.map((year) => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Section</label>
                  <select
                    className="input-field"
                    value={filters.section}
                    onChange={(e) => setFilters({ ...filters, section: e.target.value })}
                  >
                    <option value="">All Sections</option>
                    {filterOptions.sections.map((section) => (
                      <option key={section} value={section}>{section}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Step 4: AI Auto-Evaluation - after filters are chosen */}
            {submissions.length > 0 && (
              <div className="card bg-green-50 border-l-4 border-green-600">
                <h2 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Step 4: AI Auto-Evaluation
                </h2>
                {answerKeys.length === 0 ? (
                  <p className="text-amber-700 bg-amber-100 px-3 py-2 rounded">
                    Upload an answer key (Step 2) to enable AI evaluation. Once uploaded, you can evaluate
                    the filtered class, all students, or a single student (using the Auto button in Step 5).
                  </p>
                ) : (
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-3">
                      {filtersActive && (
                        <button
                          onClick={handleBulkEvaluateFiltered}
                          disabled={evaluating}
                          className="btn-primary flex items-center gap-2"
                        >
                          {evaluating ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <Sparkles className="h-4 w-4" />
                          )}
                          Evaluate Filtered ({filters.branch || 'All'} / {filters.year || 'All'} / {filters.section || 'All'})
                        </button>
                      )}
                      <button
                        onClick={handleBulkEvaluateAll}
                        disabled={evaluating}
                        className="btn-secondary flex items-center gap-2"
                      >
                        {evaluating ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4" />
                        )}
                        Evaluate All Submissions
                      </button>
                    </div>
                    <p className="text-xs text-gray-700">
                      <span className="font-semibold">Single-student evaluation:</span> in Step 5, click the
                      <span className="inline-flex items-center mx-1 px-2 py-0.5 border rounded text-xs">
                        <Sparkles className="h-3 w-3 mr-1" /> Auto
                      </span>
                      button for the specific student to evaluate only that submission.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Step 5: Submissions List */}
            <div className="card">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Step 5: Submissions ({submissions.length})
              </h2>

              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                </div>
              ) : submissions.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No submissions found</h3>
                  <p className="text-gray-600">No students have submitted this exam yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {submissions.map((submission) => {
                    const hasKey = hasAnswerKeyForCohort(submission.branch, submission.year, submission.section)
                    return (
                      <div
                        key={submission._id}
                        className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-semibold text-gray-900">
                                {submission.studentName || submission.student?.name || 'Unknown'}
                              </h3>
                              {submission.passed ? (
                                <CheckCircle className="h-5 w-5 text-green-600" />
                              ) : (
                                <XCircle className="h-5 w-5 text-red-600" />
                              )}
                            </div>
                            <div className="text-sm text-gray-600 space-y-1">
                              <p>ID: {submission.studentIdentifier || submission.student?.studentId || 'N/A'}</p>
                              <p>Branch: {submission.branch || 'N/A'} | Year: {submission.year || 'N/A'} | Section: {submission.section || 'N/A'}</p>
                              <p>Score: {submission.totalScore ?? 0}/{submission.maxScore || selectedExam.totalMarks}</p>
                              <p>Submitted: {submission.submittedAt ? new Date(submission.submittedAt).toLocaleString() : 'N/A'}</p>
                            </div>
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            {hasKey && (
                              <button
                                onClick={() => handleAutoEvaluate(submission._id)}
                                disabled={evaluating}
                                className="btn-secondary flex items-center gap-2 text-sm"
                                title="Auto-evaluate only this student's submission using AI"
                              >
                                {evaluating ? (
                                  <RefreshCw className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Sparkles className="h-4 w-4" />
                                )}
                                Auto Evaluate
                              </button>
                            )}
                            <button
                              onClick={() => handleViewSubmission(submission._id)}
                              className="btn-secondary flex items-center gap-2"
                            >
                              <Eye className="h-4 w-4" />
                              Review
                            </button>
                            {submission.answerScriptPath && (
                              <button
                                onClick={() => handleDownloadPDF(submission)}
                                className="btn-secondary flex items-center gap-2"
                              >
                                <Download className="h-4 w-4" />
                                PDF
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {showEvaluation && selectedSubmission && (
          <EvaluationModal
            submission={selectedSubmission}
            onClose={() => {
              setShowEvaluation(false)
              setSelectedSubmission(null)
            }}
            onSave={() => {
              fetchSubmissions()
              setShowEvaluation(false)
            }}
          />
        )}
      </div>
    </Layout>
  )
}

function EvaluationModal({ submission, onClose, onSave }) {
  const [answers, setAnswers] = useState([])
  const [marks, setMarks] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (submission.answers) {
      setAnswers(submission.answers)
      const initialMarks = {}
      submission.answers.forEach(ans => {
        if (ans.question) {
          const qId = ans.question._id || ans.question
          initialMarks[String(qId)] = ans.score || 0
        }
      })
      setMarks(initialMarks)
    }
  }, [submission])

  const handleMarkChange = (questionId, value) => {
    setMarks({ ...marks, [questionId]: parseFloat(value) || 0 })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await evaluationService.bulkUpdateMarks(submission.attempt._id, marks)
      alert('Marks updated successfully!')
      onSave()
    } catch (error) {
      console.error('Error updating marks:', error)
      alert('Failed to update marks')
    } finally {
      setSaving(false)
    }
  }

  const stripHtml = (html) => {
    if (!html) return ''
    const div = document.createElement('div')
    div.innerHTML = html
    return div.textContent || div.innerText || ''
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">
            Evaluate: {submission.attempt.studentName || submission.attempt.student?.name}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>
        <div className="p-6 space-y-6">
          {answers.map((answer, index) => {
            const question = answer.question
            if (!question) return null
            const questionId = String(question._id || question)
            const maxMarks = question.marks || answer.maxScore || 0
            return (
              <div key={answer._id || index} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-semibold text-gray-900">Question {index + 1} ({maxMarks} marks)</h3>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-700">Score:</label>
                    <input
                      type="number"
                      min="0"
                      max={maxMarks}
                      step="0.5"
                      value={marks[questionId] || 0}
                      onChange={(e) => handleMarkChange(questionId, e.target.value)}
                      className="w-20 input-field"
                    />
                    <span className="text-sm text-gray-600">/ {maxMarks}</span>
                  </div>
                </div>
                <p className="text-gray-700 mb-3">{stripHtml(question.text || '')}</p>
                <div className="bg-gray-50 p-3 rounded mb-3">
                  <p className="text-sm font-medium text-gray-700 mb-1">Student Answer:</p>
                  <p className="text-gray-800 whitespace-pre-wrap">{stripHtml(answer.answerText || 'No answer provided')}</p>
                </div>
                {answer.aiEvaluation && (
                  <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded">
                    <p className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
                      <Sparkles className="h-4 w-4" /> AI Evaluation
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-gray-600">Suggested Score:</span>
                        <span className="font-semibold text-blue-700 ml-2">
                          {answer.aiEvaluation.suggestedScore ?? answer.score ?? 0}/{maxMarks}
                        </span>
                      </div>
                      {answer.aiEvaluation.contentRelevance != null && (
                        <div><span className="text-gray-600">Relevance:</span> <span className="ml-2">{answer.aiEvaluation.contentRelevance}/10</span></div>
                      )}
                      {answer.aiEvaluation.completeness != null && (
                        <div><span className="text-gray-600">Completeness:</span> <span className="ml-2">{answer.aiEvaluation.completeness}/10</span></div>
                      )}
                      {answer.aiEvaluation.grammarScore != null && (
                        <div><span className="text-gray-600">Grammar:</span> <span className="ml-2">{answer.aiEvaluation.grammarScore}/10</span></div>
                      )}
                    </div>
                    {answer.aiEvaluation.feedback && (
                      <p className="text-xs text-gray-700 mt-2 italic">{answer.aiEvaluation.feedback}</p>
                    )}
                    {answer.aiEvaluation.keywordsFound && answer.aiEvaluation.keywordsFound.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-gray-600">Keywords Found:</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {answer.aiEvaluation.keywordsFound.map((kw, i) => (
                            <span key={i} className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs">{kw}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button onClick={onClose} className="btn-secondary" disabled={saving}>Cancel</button>
            <button onClick={handleSave} className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Marks'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
