import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../../components/Layout'
import { Save, Plus, Trash2, Sparkles, Printer } from 'lucide-react'
import api from '../../services/api'

export default function EditExam() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [exam, setExam] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [editingSections, setEditingSections] = useState([])
  const [showGenModal, setShowGenModal] = useState(false)
  const [marksOptions, setMarksOptions] = useState([])
  const [marksCounts, setMarksCounts] = useState({})
  const [genLoading, setGenLoading] = useState(false)
  const [showQuestionModal, setShowQuestionModal] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState(null)
  const [questionForm, setQuestionForm] = useState({
    text: '',
    type: 'multiple_choice',
    options: [{ text: '', isCorrect: false }],
    correctAnswer: '',
    marks: 1,
    difficulty: 'easy'
  })

  useEffect(() => {
    fetchExam()
  }, [id])

  const fetchExam = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/exams/${id}`)
      setExam(response.data.data)
      const sections = response.data.data?.blueprint?.sections || []
      setEditingSections(JSON.parse(JSON.stringify(sections)))
      // derive marks options from sections.marksAllowed or existing question marks
      let options = []
      if (sections.length > 0) {
        const setA = new Set()
        sections.forEach(s => (s.marksAllowed||[]).forEach(m => setA.add(parseInt(m))))
        options = Array.from(setA).filter(v=>!isNaN(v))
      } else {
        const qs = response.data.data?.questions || []
        const setB = new Set(qs.map(q => parseInt(q.marks)).filter(v=>!isNaN(v)))
        options = Array.from(setB)
      }
      if (options.length === 0) options = [2,8,16]
      options.sort((a,b)=>a-b)
      setMarksOptions(options)
      const initCounts = {}
      options.forEach(m => { initCounts[m] = 0 })
      setMarksCounts(initCounts)
    } catch (error) {
      console.error('Error fetching exam:', error)
      alert('Error loading exam')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      await api.put(`/exams/${id}`, exam)
      alert('Exam updated successfully!')
      navigate('/exams')
    } catch (error) {
      alert('Error updating exam')
    } finally {
      setSaving(false)
    }
  }

  const toDateTimeLocal = (value) => {
    if (!value) return ''
    const d = new Date(value)
    const pad = (n) => String(n).padStart(2, '0')
    const yyyy = d.getFullYear()
    const mm = pad(d.getMonth() + 1)
    const dd = pad(d.getDate())
    const hh = pad(d.getHours())
    const mi = pad(d.getMinutes())
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`
  }

  const handleAddOption = () => {
    setQuestionForm({
      ...questionForm,
      options: [...questionForm.options, { text: '', isCorrect: false }]
    })
  }

  const handleRemoveOption = (index) => {
    const newOptions = questionForm.options.filter((_, i) => i !== index)
    setQuestionForm({ ...questionForm, options: newOptions })
  }

  const handleOptionChange = (index, field, value) => {
    const newOptions = [...questionForm.options]
    newOptions[index] = { ...newOptions[index], [field]: value }
    setQuestionForm({ ...questionForm, options: newOptions })
  }

  const handleAddQuestion = async () => {
    try {
      const questionData = {
        ...questionForm,
        exam: id,
        topic: exam.topics[0],
        unit: exam.units[0]
      }
      
      const response = await api.post('/questions', questionData)
      const newQuestion = response.data.data
      
      setExam({
        ...exam,
        questions: [...exam.questions, newQuestion]
      })
      
      setShowQuestionModal(false)
      setQuestionForm({
        text: '',
        type: 'multiple_choice',
        options: [{ text: '', isCorrect: false }],
        correctAnswer: '',
        marks: 1,
        difficulty: 'easy'
      })
    } catch (error) {
      alert('Error adding question')
    }
  }

  const handleDeleteQuestion = async (questionId) => {
    if (window.confirm('Are you sure you want to delete this question?')) {
      try {
        await api.delete(`/questions/${questionId}`)
        setExam({
          ...exam,
          questions: exam.questions.filter(q => q._id !== questionId)
        })
      } catch (error) {
        alert('Error deleting question')
      }
    }
  }

  const handleGenerateQuestions = () => {
    // Recompute marks options from current sections (live), else from questions, else default
    let options = []
    const sections = (editingSections && editingSections.length > 0) ? editingSections : (exam?.blueprint?.sections || [])
    if (sections.length > 0) {
      const setA = new Set()
      sections.forEach(s => (s.marksAllowed||[]).forEach(m => setA.add(parseInt(m))))
      options = Array.from(setA).filter(v=>!isNaN(v))
    } else {
      const qs = exam?.questions || []
      const setB = new Set(qs.map(q => parseInt(q.marks)).filter(v=>!isNaN(v)))
      options = Array.from(setB)
    }
    if (options.length === 0) options = [2,8,16]
    options.sort((a,b)=>a-b)
    setMarksOptions(options)
    const initCounts = {}
    options.forEach(m => { initCounts[m] = 0 })
    setMarksCounts(initCounts)
    setShowGenModal(true)
  }

  const submitGenerateQuestions = async () => {
    const dist = {}
    Object.entries(marksCounts).forEach(([m, c]) => {
      const count = parseInt(c)
      if (!isNaN(count) && count > 0) dist[m] = count
    })
    if (Object.keys(dist).length === 0) {
      alert('Please enter at least one marks count')
      return
    }
    try {
      setGenLoading(true)
      await api.post(`/exams/${id}/generate-questions`, { marksDistribution: dist })
      setShowGenModal(false)
      await fetchExam()
      alert('Questions generated successfully!')
    } catch (error) {
      alert('Error generating questions')
    } finally {
      setGenLoading(false)
    }
  }

  const renderSectionWise = () => {
    const sections = exam?.blueprint?.sections || []
    const questions = exam.questions || []
    if (sections.length === 0) {
      // Fallback: group by marks
      const byMarks = {}
      questions.forEach(q => {
        byMarks[q.marks] = byMarks[q.marks] || []
        byMarks[q.marks].push(q)
      })
      const marksKeys = Object.keys(byMarks).sort((a,b)=>parseInt(a)-parseInt(b))
      return (
        <div className="space-y-6">
          {marksKeys.map(mk => (
            <div key={mk}>
              <h3 className="font-semibold text-gray-900 mb-2">{mk} Marks</h3>
              <ol className="space-y-2 list-decimal pl-6">
                {byMarks[mk].map((q, idx) => (
                  <li key={q._id}>
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-medium">Q{idx+1}.</span> {q.text}
                        {q.choiceGroup && <span className="ml-2 text-xs text-gray-500">(Group {q.choiceGroup})</span>}
                      </div>
                      <span className="text-sm text-gray-600">[{q.marks}M]</span>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      )
    }
    // Section wise using allowed marks and choice rules
    return (
      <div className="space-y-8">
        {sections.map((sec, sIdx) => {
          const allowed = new Set((sec.marksAllowed||[]).map(m=>parseInt(m)))
          const secQs = questions.filter(q => allowed.has(parseInt(q.marks)))
          // Group by marks
          const byMarks = {}
          secQs.forEach(q => {
            const key = String(q.marks)
            byMarks[key] = byMarks[key] || []
            byMarks[key].push(q)
          })
          const marksKeys = Object.keys(byMarks).sort((a,b)=>parseInt(a)-parseInt(b))
          return (
            <div key={sIdx}>
              <h2 className="text-xl font-semibold text-gray-900 mb-1">{sec.name}</h2>
              {sec.instructions && <p className="text-sm text-gray-600 mb-3">{sec.instructions}</p>}
              {/* Inline choice editing for 8/16 marks */}
              <div className="grid grid-cols-2 gap-4 mb-3">
                {(
                  ((sec.marksAllowed && sec.marksAllowed.length > 0)
                    ? sec.marksAllowed
                    : [8, 16]
                  ).filter(m => parseInt(m) >= 8)
                ).sort((a,b)=>parseInt(a)-parseInt(b)).map(mk => {
                  const rule = (editingSections[sIdx]?.choiceRules || {})[mk] || { selectAny: 0, total: 0, groupLabel: '' }
                  return (
                    <div key={mk} className="bg-gray-50 p-3 rounded border">
                      <div className="text-sm font-medium mb-2">Choice Rules for {mk} marks</div>
                      <div className="grid grid-cols-3 gap-2 items-center">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Select Any</label>
                          <input
                            type="number"
                            min="0"
                            value={rule.selectAny}
                            onChange={(e) => {
                              const ns = [...editingSections]
                              const prev = (ns[sIdx].choiceRules||{})
                              ns[sIdx].choiceRules = { ...prev, [mk]: { ...rule, selectAny: parseInt(e.target.value)||0 } }
                              setEditingSections(ns)
                            }}
                            className="w-full px-2 py-1 border rounded text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Total</label>
                          <input
                            type="number"
                            min="0"
                            value={rule.total}
                            onChange={(e) => {
                              const ns = [...editingSections]
                              const prev = (ns[sIdx].choiceRules||{})
                              ns[sIdx].choiceRules = { ...prev, [mk]: { ...rule, total: parseInt(e.target.value)||0 } }
                              setEditingSections(ns)
                            }}
                            className="w-full px-2 py-1 border rounded text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Group Label</label>
                          <input
                            type="text"
                            value={rule.groupLabel}
                            onChange={(e) => {
                              const ns = [...editingSections]
                              const prev = (ns[sIdx].choiceRules||{})
                              ns[sIdx].choiceRules = { ...prev, [mk]: { ...rule, groupLabel: e.target.value } }
                              setEditingSections(ns)
                            }}
                            className="w-full px-2 py-1 border rounded text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              {marksKeys.map(mk => {
                const rule = sec.choiceRules?.[mk]
                return (
                  <div key={mk} className="mb-4">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-medium text-gray-900">{mk} Marks</h3>
                      {rule && rule.total > 0 && rule.selectAny > 0 && (
                        <span className="text-sm text-gray-600">Answer any {rule.selectAny} out of {rule.total}</span>
                      )}
                    </div>
                    <ol className="space-y-2 list-decimal pl-6">
                      {byMarks[mk].map((q, idx) => (
                        <li key={q._id}>
                          <div className="flex items-start justify-between">
                            <div>
                              <span className="font-medium">Q{idx+1}.</span> {q.text}
                              {q.choiceGroup && <span className="ml-2 text-xs text-gray-500">(Group {q.choiceGroup})</span>}
                            </div>
                            <span className="text-sm text-gray-600">[{q.marks}M]</span>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    )
  }

  const handlePrint = () => {
    setShowPreview(true)
    setTimeout(() => window.print(), 100)
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

  if (!exam) {
    return (
      <Layout>
        <div className="card text-center py-12">
          <p className="text-gray-600">Exam not found</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6 max-w-4xl">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Edit Exam</h1>
            <p className="text-gray-600 mt-2">{exam.title}</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowPreview(prev => !prev)}
              className="btn-secondary flex items-center"
            >
              <Printer className="h-5 w-5 mr-2" />
              {showPreview ? 'Hide Preview' : 'Preview Paper'}
            </button>
            <button
              onClick={handleGenerateQuestions}
              className="btn-primary flex items-center bg-purple-600 hover:bg-purple-700"
            >
              <Sparkles className="h-5 w-5 mr-2" />
              Generate Questions
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary flex items-center"
            >
              <Save className="h-5 w-5 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* Exam Details */}
        <div className="card space-y-4">
          <h2 className="text-xl font-semibold">Exam Information</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Exam Title
              </label>
              <input
                type="text"
                value={exam.title}
                onChange={(e) => setExam({ ...exam, title: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Duration (minutes)
              </label>
              <input
                type="number"
                value={exam.duration}
                onChange={(e) => setExam({ ...exam, duration: e.target.value })}
                className="input-field"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Total Marks
              </label>
              <input
                type="number"
                value={exam.totalMarks}
                onChange={(e) => setExam({ ...exam, totalMarks: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Passing Marks
              </label>
              <input
                type="number"
                value={exam.passingMarks}
                onChange={(e) => setExam({ ...exam, passingMarks: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={exam.status}
                onChange={(e) => setExam({ ...exam, status: e.target.value })}
                className="input-field"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
              <input
                type="datetime-local"
                value={toDateTimeLocal(exam.startTime)}
                onChange={(e) => setExam({ ...exam, startTime: new Date(e.target.value).toISOString() })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
              <input
                type="datetime-local"
                value={toDateTimeLocal(exam.endTime)}
                onChange={(e) => setExam({ ...exam, endTime: new Date(e.target.value).toISOString() })}
                className="input-field"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Target Branch (optional)</label>
              <input
                type="text"
                value={exam.targetBranch || ''}
                onChange={(e) => setExam({ ...exam, targetBranch: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Target Year (optional)</label>
              <input
                type="text"
                value={exam.targetYear || ''}
                onChange={(e) => setExam({ ...exam, targetYear: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Target Section (optional)</label>
              <input
                type="text"
                value={exam.targetSection || ''}
                onChange={(e) => setExam({ ...exam, targetSection: e.target.value })}
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Instructions
            </label>
            <textarea
              value={exam.instructions || ''}
              onChange={(e) => setExam({ ...exam, instructions: e.target.value })}
              className="input-field"
              rows="3"
            />
          </div>
        </div>

        {/* Preview */}
        {showPreview && (
          <div className="card">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-semibold">Question Paper Preview</h2>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    try {
                      const updated = { ...exam, blueprint: { ...(exam.blueprint||{}), sections: editingSections } }
                      await api.put(`/exams/${id}`, updated)
                      await fetchExam()
                      alert('Section choice rules saved')
                    } catch (e) {
                      alert('Failed to save section rules')
                    }
                  }}
                  className="btn-secondary"
                >
                  Save Section Rules
                </button>
                <button onClick={handlePrint} className="btn-secondary flex items-center">
                <Printer className="h-5 w-5 mr-2" /> Print
                </button>
              </div>
            </div>
            <div className="prose max-w-none">
              <h1 className="text-center text-2xl font-bold mb-2">{exam.subject?.name} - {exam.title}</h1>
              <p className="text-center text-sm text-gray-600 mb-4">Duration: {exam.duration} minutes | Total Marks: {exam.totalMarks}</p>
              {exam.instructions && <p className="mb-4 text-gray-700">Instructions: {exam.instructions}</p>}
              {renderSectionWise()}
            </div>
          </div>
        )}

        {/* Questions */}
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Questions ({exam.questions?.length || 0})</h2>
            <button
              onClick={() => setShowQuestionModal(true)}
              className="btn-primary flex items-center"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Question
            </button>
          </div>

          {exam.questions?.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded">
              <p className="text-gray-500 mb-4">No questions added yet</p>
              <button
                onClick={handleGenerateQuestions}
                className="btn-primary"
              >
                Generate Questions with AI
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {exam.questions.map((question, index) => (
                <div key={question._id} className="border rounded p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium">Q{index + 1}: {question.text}</h3>
                    <button
                      onClick={() => handleDeleteQuestion(question._id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="text-sm text-gray-500 mb-2">
                    Type: {question.type} | Marks: {question.marks} | Difficulty: {question.difficulty}
                  </div>
                  {question.options && (
                    <div>
                      <p className="text-sm font-medium mb-1">Options:</p>
                      <ul className="text-sm">
                        {question.options.map((option, optIndex) => (
                          <li key={optIndex} className={option.isCorrect ? 'text-green-600 font-medium' : ''}>
                            {String.fromCharCode(65 + optIndex)}. {option.text}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Generate Questions Modal */}
        {showGenModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-lg w-full">
              <div className="p-6 space-y-4">
                <h2 className="text-xl font-semibold">Generate Questions</h2>
                <p className="text-sm text-gray-600">Enter how many questions to generate for each marks value.</p>
                <div className="grid grid-cols-2 gap-3">
                  {marksOptions.map((mk) => (
                    <div key={mk} className="flex items-center gap-2">
                      <label className="w-20 text-sm text-gray-700">{mk} marks</label>
                      <input
                        type="number"
                        min="0"
                        value={marksCounts[mk] ?? 0}
                        onChange={(e) => setMarksCounts({ ...marksCounts, [mk]: e.target.value })}
                        className="flex-1 px-3 py-2 border rounded text-sm"
                      />
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setShowGenModal(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={submitGenerateQuestions}
                    disabled={genLoading}
                    className="btn-primary"
                  >
                    {genLoading ? 'Generating...' : 'Generate'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Question Modal */}
        {showQuestionModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-4">Add Question</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Question Text
                    </label>
                    <textarea
                      value={questionForm.text}
                      onChange={(e) => setQuestionForm({ ...questionForm, text: e.target.value })}
                      className="input-field"
                      rows="3"
                      placeholder="Enter your question..."
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Type
                      </label>
                      <select
                        value={questionForm.type}
                        onChange={(e) => setQuestionForm({ ...questionForm, type: e.target.value })}
                        className="input-field"
                      >
                        <option value="multiple_choice">Multiple Choice</option>
                        <option value="short_answer">Short Answer</option>
                        <option value="long_answer">Long Answer</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Marks
                      </label>
                      <input
                        type="number"
                        value={questionForm.marks}
                        onChange={(e) => setQuestionForm({ ...questionForm, marks: e.target.value })}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Difficulty
                      </label>
                      <select
                        value={questionForm.difficulty}
                        onChange={(e) => setQuestionForm({ ...questionForm, difficulty: e.target.value })}
                        className="input-field"
                      >
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                    </div>
                  </div>

                  {questionForm.type === 'multiple_choice' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Options
                      </label>
                      <div className="space-y-2">
                        {questionForm.options.map((option, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <input
                              type="text"
                              value={option.text}
                              onChange={(e) => handleOptionChange(index, 'text', e.target.value)}
                              className="input-field flex-1"
                              placeholder={`Option ${String.fromCharCode(65 + index)}`}
                            />
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={option.isCorrect}
                                onChange={(e) => handleOptionChange(index, 'isCorrect', e.target.checked)}
                                className="mr-1"
                              />
                              Correct
                            </label>
                            <button
                              onClick={() => handleRemoveOption(index)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={handleAddOption}
                          className="btn-secondary text-sm"
                        >
                          Add Option
                        </button>
                      </div>
                    </div>
                  )}

                  {questionForm.type !== 'multiple_choice' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Expected Answer/Keywords
                      </label>
                      <textarea
                        value={questionForm.correctAnswer}
                        onChange={(e) => setQuestionForm({ ...questionForm, correctAnswer: e.target.value })}
                        className="input-field"
                        rows="2"
                        placeholder="Expected answer or keywords..."
                      />
                    </div>
                  )}

                  <div className="flex space-x-3">
                    <button
                      onClick={handleAddQuestion}
                      className="btn-primary flex-1"
                    >
                      Add Question
                    </button>
                    <button
                      onClick={() => setShowQuestionModal(false)}
                      className="btn-secondary flex-1"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

