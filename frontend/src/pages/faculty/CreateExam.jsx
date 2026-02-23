import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../components/Layout'
import ExamBlueprint from '../../components/ExamBlueprint'
import { FileText, Sparkles } from 'lucide-react'
import { subjectService } from '../../services/subjectService'
import api from '../../services/api'

export default function CreateExam() {
  const navigate = useNavigate()
  const [subjects, setSubjects] = useState([])
  const [units, setUnits] = useState([])
  const [topics, setTopics] = useState([])
  const [selectedSubjects, setSelectedSubjects] = useState([])
  const [selectedUnits, setSelectedUnits] = useState([])
  const [selectedTopics, setSelectedTopics] = useState([])
  const [loading, setLoading] = useState(false)
  const [blueprint, setBlueprint] = useState({})
  
  const [formData, setFormData] = useState({
    title: '',
    type: 'quiz',
    duration: '',
    totalMarks: '',
    passingMarks: '',
    subject: '',
    instructions: '',
    startTime: '',
    endTime: '',
    targetBranch: '',
    targetYear: '',
    targetSection: ''
  })

  useEffect(() => {
    fetchSubjects()
  }, [])

  const fetchSubjects = async () => {
    try {
      const response = await subjectService.getAll()
      setSubjects(response.data.data)
    } catch (error) {
      console.error('Error fetching subjects:', error)
    }
  }

  const handleSubjectChange = async (subjectId) => {
    setFormData({ ...formData, subject: subjectId })
    try {
      const response = await api.get(`/units/subject/${subjectId}`)
      setUnits(response.data.data)
      setTopics([])
      setSelectedUnits([])
      setSelectedTopics([])
    } catch (error) {
      console.error('Error fetching units:', error)
    }
  }

  const handleUnitClick = async (unitId) => {
    try {
      const response = await api.get(`/topics/unit/${unitId}`)
      const newTopics = response.data.data
      setTopics(prev => [...prev, ...newTopics])
      
      // Toggle unit selection
      if (selectedUnits.includes(unitId)) {
        setSelectedUnits(prev => prev.filter(id => id !== unitId))
      } else {
        setSelectedUnits(prev => [...prev, unitId])
      }
    } catch (error) {
      console.error('Error fetching topics:', error)
    }
  }

  const handleTopicClick = (topicId) => {
    if (selectedTopics.includes(topicId)) {
      setSelectedTopics(prev => prev.filter(id => id !== topicId))
    } else {
      setSelectedTopics(prev => [...prev, topicId])
    }
  }

  const handleGenerateQuestions = async () => {
    if (selectedTopics.length === 0) {
      alert('Please select at least one topic')
      return
    }

    if (!formData.totalMarks) {
      alert('Please enter total marks first')
      return
    }

    try {
      setLoading(true)
      // Create exam with blueprint
      const examData = {
        ...formData,
        units: selectedUnits,
        topics: selectedTopics,
        blueprint: blueprint
      }
      const examResponse = await api.post('/exams', examData)
      const examId = examResponse.data.data._id

      // Generate questions with blueprint data
      const generatePayload = {
        marksDistribution: blueprint.marksDistribution || {},
        difficultyRatio: blueprint.difficultyRatio || { easy: 30, medium: 50, hard: 20 },
        topicDifficultyMap: blueprint.topicDifficultyMap || {},
        bloomsDistribution: blueprint.bloomsDistribution || {},
        examStructure: blueprint.examStructure || [],
        includeDiagrams: blueprint.includeDiagrams || false,
        includeModelAnswers: blueprint.includeModelAnswers !== false
      }
      
      await api.post(`/exams/${examId}/generate-questions`, generatePayload)
      alert('Questions generated successfully!')
      navigate('/exams')
    } catch (error) {
      alert('Error: ' + (error.response?.data?.message || error.message))
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (selectedTopics.length === 0) {
      alert('Please select at least one topic')
      return
    }

    setLoading(true)
    try {
      const examData = {
        ...formData,
        units: selectedUnits,
        topics: selectedTopics,
        blueprint: blueprint
      }
      const response = await api.post('/exams', examData)
      alert('Exam created successfully!')
      navigate('/exams')
    } catch (error) {
      alert('Error creating exam: ' + (error.response?.data?.message || error.message))
    } finally {
      setLoading(false)
    }
  }
  
  const handleBlueprintChange = (newBlueprint) => {
    setBlueprint(newBlueprint)
  }
  
  // Get selected topic objects for blueprint
  const selectedTopicObjects = topics.filter(topic => selectedTopics.includes(topic._id))

  return (
    <Layout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Create New Exam</h1>
          <p className="text-gray-600 mt-2">Set up a new exam for your students</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="card space-y-4">
            <h2 className="text-xl font-semibold">Basic Information</h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Exam Title
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="input-field"
                placeholder="e.g., Midterm Exam"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Exam Type
                </label>
                <select
                  required
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="input-field"
                >
                  <option value="quiz">Quiz</option>
                  <option value="sessional">Sessional Exam</option>
                  <option value="semester">Semester Exam</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject
                </label>
                <select
                  required
                  value={formData.subject}
                  onChange={(e) => handleSubjectChange(e.target.value)}
                  className="input-field"
                >
                  <option value="">Select a subject</option>
                  {subjects.map((subject) => (
                    <option key={subject._id} value={subject._id}>
                      {subject.code} - {subject.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  required
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  className="input-field"
                  placeholder="60"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total Marks
                </label>
                <input
                  type="number"
                  required
                  value={formData.totalMarks}
                  onChange={(e) => setFormData({ ...formData, totalMarks: e.target.value })}
                  className="input-field"
                  placeholder="100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Passing Marks
                </label>
                <input
                  type="number"
                  required
                  value={formData.passingMarks}
                  onChange={(e) => setFormData({ ...formData, passingMarks: e.target.value })}
                  className="input-field"
                  placeholder="50"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Time
                </label>
                <input
                  type="datetime-local"
                  required
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Time
                </label>
                <input
                  type="datetime-local"
                  required
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  className="input-field"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Instructions
              </label>
              <textarea
                value={formData.instructions}
                onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                className="input-field"
                rows="3"
                placeholder="Exam instructions..."
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Branch (optional)
              </label>
              <input
                type="text"
                value={formData.targetBranch}
                onChange={(e) => setFormData({ ...formData, targetBranch: e.target.value })}
                className="input-field"
                placeholder="e.g., CSE"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Year (optional)
              </label>
              <input
                type="text"
                value={formData.targetYear}
                onChange={(e) => setFormData({ ...formData, targetYear: e.target.value })}
                className="input-field"
                placeholder="e.g., 3"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Section (optional)
              </label>
              <input
                type="text"
                value={formData.targetSection}
                onChange={(e) => setFormData({ ...formData, targetSection: e.target.value })}
                className="input-field"
                placeholder="e.g., A"
              />
            </div>
          </div>

          {/* Units Selection */}
          {formData.subject && (
            <div className="card">
              <h2 className="text-xl font-semibold mb-4">Select Units</h2>
              {units.length === 0 ? (
                <p className="text-gray-500">No units available for this subject</p>
              ) : (
                <div className="space-y-2">
                  {units.map((unit) => (
                    <button
                      key={unit._id}
                      type="button"
                      onClick={() => handleUnitClick(unit._id)}
                      className={`w-full p-3 border rounded-lg text-left transition-colors ${
                        selectedUnits.includes(unit._id)
                          ? 'bg-primary-50 border-primary-500'
                          : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium text-gray-900">{unit.title}</p>
                          <p className="text-sm text-gray-600">{unit.estimatedHours} hours</p>
                        </div>
                        {selectedUnits.includes(unit._id) && (
                          <div className="bg-primary-600 text-white px-2 py-1 rounded text-sm">
                            Selected
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Topics Selection */}
          {selectedUnits.length > 0 && (
            <div className="card">
              <h2 className="text-xl font-semibold mb-4">
                Select Topics ({selectedTopics.length} selected)
              </h2>
              {topics.length === 0 ? (
                <p className="text-gray-500">Select units to see topics</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {topics.map((topic) => (
                    <button
                      key={topic._id}
                      type="button"
                      onClick={() => handleTopicClick(topic._id)}
                      className={`p-3 border rounded-lg text-left transition-colors ${
                        selectedTopics.includes(topic._id)
                          ? 'bg-green-50 border-green-500'
                          : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <p className="font-medium text-gray-900 text-sm">{topic.title}</p>
                      <p className="text-xs text-gray-500">Level: {topic.depthLevel}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Exam Blueprint */}
          {selectedTopics.length > 0 && formData.totalMarks && (
            <ExamBlueprint
              totalMarks={parseInt(formData.totalMarks) || 50}
              examType={formData.type}
              topics={selectedTopicObjects}
              onChange={handleBlueprintChange}
              initialBlueprint={blueprint}
            />
          )}

          {/* Actions */}
          <div className="flex space-x-3">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex-1"
            >
              {loading ? 'Creating...' : 'Create Exam'}
            </button>
            <button
              type="button"
              onClick={handleGenerateQuestions}
              disabled={loading || selectedTopics.length === 0}
              className="btn-primary flex-1 flex items-center justify-center bg-purple-600 hover:bg-purple-700"
            >
              <Sparkles className="h-5 w-5 mr-2" />
              Generate with AI
            </button>
            <button
              type="button"
              onClick={() => navigate('/exams')}
              className="btn-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </Layout>
  )
}