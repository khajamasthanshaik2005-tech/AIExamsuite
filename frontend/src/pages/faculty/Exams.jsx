import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Layout from '../../components/Layout'
import { Plus, Edit2, Trash2, Eye, Users, Clock, FileText, Sparkles, Upload, Download } from 'lucide-react'
import api from '../../services/api'

export default function FacultyExams() {
  const navigate = useNavigate()
  const [exams, setExams] = useState([])
  const [loading, setLoading] = useState(true)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [selectedExam, setSelectedExam] = useState(null)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [students, setStudents] = useState([])
  const [selectedStudents, setSelectedStudents] = useState([])
  const [assignTab, setAssignTab] = useState('cohort')
  const [cohort, setCohort] = useState({ targetBranch: '', targetYear: '', targetSection: '' })

  useEffect(() => {
    fetchExams()
    fetchStudents()
  }, [])

  const fetchExams = async () => {
    try {
      setLoading(true)
      const response = await api.get('/exams')
      setExams(response.data.data)
    } catch (error) {
      console.error('Error fetching exams:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStudents = async () => {
    try {
      const response = await api.get('/students')
      setStudents(response.data.data)
    } catch (error) {
      console.error('Error fetching students:', error)
    }
  }

  const handlePreview = (exam) => {
    setSelectedExam(exam)
    setShowPreviewModal(true)
  }

  const handleEdit = (exam) => {
    navigate(`/exams/edit/${exam._id}`)
  }

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this exam?')) {
      try {
        await api.delete(`/exams/${id}`)
        fetchExams()
      } catch (error) {
        alert('Error deleting exam')
      }
    }
  }

  const handleAssign = (exam) => {
    setSelectedExam(exam)
    setShowAssignModal(true)
    setAssignTab('cohort')
    setCohort({
      targetBranch: exam.targetBranch || '',
      targetYear: exam.targetYear || '',
      targetSection: exam.targetSection || ''
    })
  }

  const handleAssignSubmit = async () => {
    try {
      if (assignTab === 'individual') {
        await api.put(`/exams/${selectedExam._id}/assign`, { assignedTo: selectedStudents })
      } else {
        await api.put(`/exams/${selectedExam._id}`, {
          targetBranch: cohort.targetBranch || undefined,
          targetYear: cohort.targetYear || undefined,
          targetSection: cohort.targetSection || undefined,
          status: 'published'
      })
      }
      alert('Exam assignment updated!')
      setShowAssignModal(false)
      fetchExams()
    } catch (error) {
      alert('Error assigning exam')
    }
  }

  const handleGenerateMoreQuestions = async (examId) => {
    const count = parseInt(prompt('How many additional questions to generate?', '5')) || 5
    try {
      await api.post(`/exams/${examId}/generate-questions`, { count })
      alert(`Generated ${count} additional questions!`)
      fetchExams()
    } catch (error) {
      alert('Error generating questions')
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800'
      case 'published': return 'bg-green-100 text-green-800'
      case 'completed': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Exams</h1>
            <p className="text-gray-600 mt-2">Manage your exams and assignments</p>
          </div>
          <Link to="/exams/create" className="btn-primary flex items-center">
            <Plus className="h-5 w-5 mr-2" />
            Create Exam
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : exams.length === 0 ? (
          <div className="card text-center py-12">
            <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No exams yet</h3>
            <p className="text-gray-600 mb-4">Create your first exam</p>
            <Link to="/exams/create" className="btn-primary">
              Create Exam
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {exams.map((exam) => (
              <div key={exam._id} className="card hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">{exam.title}</h3>
                    <p className="text-sm text-gray-600">{exam.subject?.code} - {exam.subject?.name}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(exam.status)}`}>
                    {exam.status}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <Clock className="h-4 w-4 mr-2" />
                    {exam.duration} minutes
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <FileText className="h-4 w-4 mr-2" />
                    {exam.questions?.length || 0} questions
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Users className="h-4 w-4 mr-2" />
                    {exam.assignedTo?.length || 0} students assigned
                  </div>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => handlePreview(exam)}
                    className="btn-secondary text-blue-600 hover:bg-blue-50 flex-1"
                  >
                    <Eye className="h-4 w-4 mx-auto" />
                  </button>
                  <button
                    onClick={() => handleEdit(exam)}
                    className="btn-secondary text-green-600 hover:bg-green-50 flex-1"
                  >
                    <Edit2 className="h-4 w-4 mx-auto" />
                  </button>
                  <button
                    onClick={() => handleAssign(exam)}
                    className="btn-secondary text-purple-600 hover:bg-purple-50 flex-1"
                  >
                    <Users className="h-4 w-4 mx-auto" />
                  </button>
                  <button
                    onClick={() => handleDelete(exam._id)}
                    className="btn-secondary text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {exam.questions?.length === 0 && (
                  <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
                    <p className="text-sm text-yellow-800">No questions yet</p>
                    <button
                      onClick={() => handleGenerateMoreQuestions(exam._id)}
                      className="text-sm text-yellow-600 hover:text-yellow-700 mt-1"
                    >
                      Generate with AI →
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Preview Modal */}
        {showPreviewModal && selectedExam && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold">Exam Preview</h2>
                  <button
                    onClick={() => setShowPreviewModal(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <h3 className="font-semibold text-gray-900">Exam Details</h3>
                      <p className="text-gray-600">{selectedExam.title}</p>
                      <p className="text-sm text-gray-500">{selectedExam.subject?.code} - {selectedExam.subject?.name}</p>
                    </div>
                    <div className="text-right">
                      <h3 className="font-semibold text-gray-900">Timing</h3>
                      <p className="text-gray-600">{selectedExam.duration} minutes</p>
                      <p className="text-sm text-gray-500">
                        {new Date(selectedExam.startTime).toLocaleString()} - 
                        {new Date(selectedExam.endTime).toLocaleString()}
                      </p>
                      <button
                        type="button"
                        onClick={() => window.print()}
                        className="mt-3 btn-secondary text-xs"
                      >
                        Print Question Paper
                      </button>
                    </div>
                  </div>

                  <ExamPaperPreview exam={selectedExam} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Assign Modal */}
        {showAssignModal && selectedExam && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h2 className="text-2xl font-bold mb-4">Assign Exam</h2>
              <div className="flex border-b mb-4">
                <button className={`px-3 py-2 text-sm ${assignTab==='cohort'?'border-b-2 border-primary-600 font-semibold':''}`} onClick={()=>setAssignTab('cohort')}>Cohort</button>
                <button className={`px-3 py-2 text-sm ${assignTab==='individual'?'border-b-2 border-primary-600 font-semibold':''}`} onClick={()=>setAssignTab('individual')}>Individual</button>
              </div>
              {assignTab === 'cohort' ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                      <input type="text" value={cohort.targetBranch} onChange={(e)=>setCohort({...cohort, targetBranch: e.target.value})} className="input-field" placeholder="e.g., CSE" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                      <input type="text" value={cohort.targetYear} onChange={(e)=>setCohort({...cohort, targetYear: e.target.value})} className="input-field" placeholder="e.g., 2" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Section (optional)</label>
                      <input type="text" value={cohort.targetSection} onChange={(e)=>setCohort({...cohort, targetSection: e.target.value})} className="input-field" placeholder="e.g., A" />
                    </div>
                  </div>
                  <div className="flex space-x-3">
                    <button onClick={handleAssignSubmit} className="btn-primary flex-1">Publish to Cohort</button>
                    <button onClick={()=>setShowAssignModal(false)} className="btn-secondary flex-1">Cancel</button>
                  </div>
                </div>
              ) : (
              <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Students</label>
                  <div className="max-h-60 overflow-y-auto border rounded">
                    {students.map((student) => (
                      <label key={student._id} className="flex items-center p-2 hover:bg-gray-50">
                          <input type="checkbox" checked={selectedStudents.includes(student._id)} onChange={(e)=>{
                            if (e.target.checked) setSelectedStudents([...selectedStudents, student._id])
                            else setSelectedStudents(selectedStudents.filter(id => id !== student._id))
                          }} className="mr-2" />
                        <span className="text-sm">{student.name} ({student.email})</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex space-x-3">
                    <button onClick={handleAssignSubmit} className="btn-primary flex-1">Assign Individually</button>
                    <button onClick={()=>setShowAssignModal(false)} className="btn-secondary flex-1">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

// Structured question paper preview using sections and marks
function ExamPaperPreview({ exam }) {
  const questions = exam.questions || []
  const blueprint = exam.blueprint || {}
  const sections = blueprint.sections || []

  if (!questions.length) {
    return (
      <div className="mt-4">
        <h3 className="font-semibold text-gray-900 mb-2">Questions</h3>
        <div className="text-center py-8 bg-gray-50 rounded">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-500">No questions added yet</p>
        </div>
      </div>
    )
  }

  // Fallback simple list when no sections defined
  if (!sections.length) {
    return (
      <div className="mt-4">
        <h3 className="font-semibold text-gray-900 mb-2">Questions ({questions.length})</h3>
        <div className="space-y-2">
          {questions.map((q, idx) => (
            <p key={q._id || idx} className="text-gray-900">
              <span className="font-semibold">Q{idx + 1}.</span> {q.text}{' '}
              <span className="text-xs text-gray-500">[{q.marks}M]</span>
            </p>
          ))}
        </div>
      </div>
    )
  }

  const unusedIds = new Set(questions.map(q => String(q._id)))
  let globalQ = 1

  const renderSection = (section, idx) => {
    const allowedMarks = (section.marksAllowed && section.marksAllowed.length > 0)
      ? section.marksAllowed
      : Array.from(new Set(questions.map(q => q.marks))).filter(m => m > 0)

    const sortedMarks = [...allowedMarks].sort((a, b) => a - b)

    return (
      <div key={idx} className="mb-5">
        <h3 className="font-semibold text-gray-900">
          {section.name || `Section ${String.fromCharCode(65 + idx)}`}
        </h3>
        {section.instructions && (
          <p className="text-sm text-gray-600 mb-1">{section.instructions}</p>
        )}

        {sortedMarks.map(mk => {
          const rule = section.choiceRules?.[mk]
          const headerBits = [`${mk} Marks`]
          if (rule && (rule.selectAny || rule.total)) {
            headerBits.push(
              `– Answer any ${rule.selectAny || 0} out of ${rule.total || 0}` +
              (rule.groupLabel ? ` (Group ${rule.groupLabel})` : '')
            )
          }

          const qs = questions.filter(q => {
            const id = String(q._id)
            return q.marks === mk && unusedIds.has(id)
          })

          if (!qs.length) return null

          return (
            <div key={mk} className="mt-2">
              <p className="text-sm font-medium text-gray-800">{headerBits.join(' ')}</p>
              <div className="mt-1 space-y-1">
                {qs.map((q) => {
                  const id = String(q._id)
                  unusedIds.delete(id)
                  const label = `Q${globalQ++}`
                  return (
                    <p key={id} className="text-gray-900">
                      <span className="font-semibold">{label}.</span>{' '}
                      {q.text}{' '}
                      <span className="text-xs text-gray-500">[{q.marks}M]</span>
                    </p>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="mt-4 border rounded-lg p-4 bg-white">
      <div className="text-center mb-4">
        <p className="font-semibold text-gray-900">{exam.title}</p>
        <p className="text-sm text-gray-600">
          Duration: {exam.duration} minutes | Total Marks: {exam.totalMarks}
        </p>
        {exam.instructions && (
          <p className="text-xs text-gray-500 mt-1">{exam.instructions}</p>
        )}
      </div>
      {sections.map(renderSection)}
    </div>
  )
}
