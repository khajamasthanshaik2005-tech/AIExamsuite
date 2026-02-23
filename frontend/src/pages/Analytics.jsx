import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import { examService } from '../services/examService'
import { evaluationService } from '../services/evaluationService'
import { BarChart3, CheckCircle, XCircle, Sparkles } from 'lucide-react'

export default function Analytics() {
  const { user } = useAuth()

  if (!user) {
    return (
      <Layout>
        <div className="card text-center py-12">
          <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Please log in</h3>
          <p className="text-gray-600">Analytics are available after you sign in.</p>
        </div>
      </Layout>
    )
  }

  if (user.role === 'faculty') {
    return <FacultyAnalytics />
  }

  return <StudentProgress />
}

function FacultyAnalytics() {
  const [exams, setExams] = useState([])
  const [selectedExam, setSelectedExam] = useState(null)
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingSubmissions, setLoadingSubmissions] = useState(false)
  const [releasing, setReleasing] = useState(false)
  const [filters, setFilters] = useState({ branch: '', year: '', section: '' })
  const [filterOptions, setFilterOptions] = useState({ branches: [], years: [], sections: [] })

  useEffect(() => {
    const fetchExams = async () => {
      try {
        const res = await examService.getAll()
        setExams(res.data.data || [])
      } catch (e) {
        console.error('Error loading exams for analytics:', e)
      } finally {
        setLoading(false)
      }
    }
    fetchExams()
  }, [])

  useEffect(() => {
    if (!selectedExam) return
    const fetchSubs = async () => {
      setLoadingSubmissions(true)
      try {
        const res = await evaluationService.getExamSubmissions(selectedExam._id)
        setSubmissions(res.data.data || [])
      } catch (e) {
        console.error('Error loading submissions for analytics:', e)
        setSubmissions([])
      } finally {
        setLoadingSubmissions(false)
      }
    }
    fetchSubs()
    const fetchOptions = async () => {
      try {
        const res = await evaluationService.getFilterOptions(selectedExam._id)
        setFilterOptions(res.data.data || { branches: [], years: [], sections: [] })
      } catch (e) {
        console.error('Error loading filter options for analytics:', e)
      }
    }
    fetchOptions()
  }, [selectedExam])

  const refreshExam = async () => {
    try {
      const res = await examService.getAll()
      const list = res.data.data || []
      setExams(list)
      if (selectedExam) {
        const updated = list.find(e => e._id === selectedExam._id)
        if (updated) setSelectedExam(updated)
      }
    } catch (e) {
      console.error('Error refreshing exams:', e)
    }
  }

  const handleReleaseResults = async () => {
    if (!selectedExam) return
    const hasFilters = !!(filters.branch || filters.year || filters.section)
    if (!hasFilters && selectedExam.resultsPublished) {
      alert('Results are already released for this exam.')
      return
    }
    const msg = hasFilters
      ? `Release results ONLY for Branch ${filters.branch || 'All'} / Year ${filters.year || 'All'} / Section ${filters.section || 'All'}?`
      : 'Release results to all students for this exam? Students will be able to see their marks and AI feedback.'
    if (!window.confirm(msg)) return

    setReleasing(true)
    try {
      const res = await examService.releaseResults(selectedExam._id, filters)
      alert(res.data?.message || 'Results released successfully.')
      await refreshExam()
    } catch (e) {
      console.error('Error releasing results:', e)
      alert(e.response?.data?.message || 'Failed to release results')
    } finally {
      setReleasing(false)
    }
  }

  const fmt = (dt) => (dt ? new Date(dt).toLocaleString() : '-')

  const filteredSubs = submissions.filter((s) => {
    if (filters.branch && s.branch !== filters.branch) return false
    if (filters.year && s.year !== filters.year) return false
    if (filters.section && s.section !== filters.section) return false
    return true
  })

  const total = filteredSubs.length
  const passed = filteredSubs.filter(s => s.passed).length
  const failed = total - passed
  const avgScore = total > 0
    ? (filteredSubs.reduce((sum, s) => sum + (s.totalScore || 0), 0) / total).toFixed(1)
    : 0

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Faculty Analytics & Results</h1>
          <p className="text-gray-600 mt-2">Release results and see basic class statistics for each exam.</p>
        </div>

        {/* Select exam */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Select Exam</h2>
          {loading ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : exams.length === 0 ? (
            <p className="text-gray-600 text-sm">No exams available yet.</p>
          ) : (
            <select
              className="input-field"
              value={selectedExam?._id || ''}
              onChange={(e) => {
                const exam = exams.find(ex => ex._id === e.target.value)
                setSelectedExam(exam || null)
              }}
            >
              <option value="">-- Select an exam --</option>
              {exams.map((exam) => (
                <option key={exam._id} value={exam._id}>
                  {exam.title} ({exam.type}) {exam.subject?.name ? `- ${exam.subject.name}` : ''}
                </option>
              ))}
            </select>
          )}
        </div>

        {selectedExam && (
          <>
            {/* Exam info + release button */}
            <div className="card">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{selectedExam.title}</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedExam.type.charAt(0).toUpperCase() + selectedExam.type.slice(1)}
                    {selectedExam.subject?.name ? ` – ${selectedExam.subject.name}` : ''}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Total Marks: {selectedExam.totalMarks} | Passing Marks: {selectedExam.passingMarks}
                  </p>
                </div>
                <div className="text-right">
                  <div className="mb-2">
                    {selectedExam.resultsPublished ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Results Released
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        <Sparkles className="h-3 w-3 mr-1" />
                        Results Not Released
                      </span>
                    )}
                  </div>
                  <button
                    onClick={handleReleaseResults}
                    disabled={releasing || selectedExam.resultsPublished}
                    className="btn-primary text-sm"
                  >
                    {releasing ? 'Releasing...' : selectedExam.resultsPublished ? 'Results Released' : 'Release Results to Students'}
                  </button>
                  {selectedExam.resultsPublishedAt && (
                    <p className="text-xs text-gray-500 mt-1">
                      Released: {fmt(selectedExam.resultsPublishedAt)}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Cohort filters for statistics & release */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Filter (Branch / Year / Section)</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Branch</label>
                  <select
                    className="input-field"
                    value={filters.branch}
                    onChange={(e) => setFilters({ ...filters, branch: e.target.value })}
                  >
                    <option value="">All Branches</option>
                    {filterOptions.branches.map((b) => (
                      <option key={b} value={b}>{b}</option>
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
                    {filterOptions.years.map((y) => (
                      <option key={y} value={y}>{y}</option>
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
                    {filterOptions.sections.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                These filters control both the statistics below and cohort-wise result release.
                Leave all empty to see full-class stats and release results for the entire exam.
              </p>
            </div>

            {/* Class statistics for selected cohort */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Class Statistics (Filtered)</h2>
              {loadingSubmissions ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                </div>
              ) : total === 0 ? (
                <p className="text-gray-600 text-sm">No submissions yet for the selected cohort.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-gray-500">Total Submissions</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{total}</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <p className="text-gray-500">Passed</p>
                    <p className="text-2xl font-bold text-green-700 mt-1">{passed}</p>
                  </div>
                  <div className="p-4 bg-red-50 rounded-lg">
                    <p className="text-gray-500">Failed</p>
                    <p className="text-2xl font-bold text-red-700 mt-1">{failed}</p>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-gray-500">Average Score</p>
                    <p className="text-2xl font-bold text-blue-700 mt-1">
                      {avgScore}/{selectedExam.totalMarks}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}

function StudentProgress() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const res = await examService.getAll()
        const exams = res.data.data || []
        const withStatus = await Promise.all(
          exams.map(async (exam) => {
            try {
              const statusRes = await examService.getAttemptStatus(exam._id)
              return { exam, attemptStatus: statusRes.data?.data || null }
            } catch {
              return { exam, attemptStatus: null }
            }
          })
        )

        const completedWithResults = withStatus.filter(
          ({ attemptStatus }) =>
            attemptStatus &&
            (attemptStatus.status === 'submitted' || attemptStatus.status === 'completed' || attemptStatus.status === 'abandoned') &&
            attemptStatus.resultsPublished
        )

        const mapped = completedWithResults.map(({ exam, attemptStatus }) => ({
          id: exam._id,
          title: exam.title,
          type: exam.type,
          subject: exam.subject,
          totalMarks: attemptStatus.totalMarks || exam.totalMarks,
          passingMarks: attemptStatus.passingMarks || exam.passingMarks,
          score: attemptStatus.totalScore ?? 0,
          passed: attemptStatus.passed,
          releasedAt: attemptStatus.resultsPublishedAt
        }))

        setRows(mapped)
      } catch (e) {
        console.error('Error loading student progress:', e)
        setRows([])
      } finally {
        setLoading(false)
      }
    }
    fetchProgress()
  }, [])

  const fmt = (dt) => (dt ? new Date(dt).toLocaleString() : '-')

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Progress</h1>
          <p className="text-gray-600 mt-2">See your marks and results for published exams.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : rows.length === 0 ? (
          <div className="card text-center py-12">
            <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No published results yet</h3>
            <p className="text-gray-600">Once your faculty releases results, they will appear here.</p>
          </div>
        ) : (
          <div className="card overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2">Exam</th>
                  <th className="text-left py-2 px-2">Subject</th>
                  <th className="text-left py-2 px-2">Score</th>
                  <th className="text-left py-2 px-2">Status</th>
                  <th className="text-left py-2 px-2">Released</th>
                  <th className="text-left py-2 px-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-gray-200">
                    <td className="py-2 px-2">
                      <div className="font-medium text-gray-900">{r.title}</div>
                      <div className="text-xs text-gray-500">
                        {r.type.charAt(0).toUpperCase() + r.type.slice(1)}
                      </div>
                    </td>
                    <td className="py-2 px-2 text-gray-700">
                      {r.subject?.name || '-'}
                    </td>
                    <td className="py-2 px-2">
                      <span className="font-semibold">
                        {r.score}/{r.totalMarks}
                      </span>
                    </td>
                    <td className="py-2 px-2">
                      {r.passed ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-green-100 text-green-800 text-xs">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Passed
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-xs">
                          <XCircle className="h-3 w-3 mr-1" />
                          Failed
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-2 text-gray-600 text-xs">
                      {fmt(r.releasedAt)}
                    </td>
                    <td className="py-2 px-2">
                      <Link
                        to={`/exams/${r.id}/result`}
                        className="btn-secondary text-xs"
                      >
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  )
}
