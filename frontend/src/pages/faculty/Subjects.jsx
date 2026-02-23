import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../../components/Layout'
import { Plus, Trash2, Edit2, GraduationCap, BookOpen } from 'lucide-react'
import { subjectService } from '../../services/subjectService'

export default function FacultySubjects() {
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingSubject, setEditingSubject] = useState(null)
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    semester: '',
    department: '',
    description: '',
    branch: '',
    year: '',
    section: ''
  })

  useEffect(() => {
    fetchSubjects()
  }, [])

  const fetchSubjects = async () => {
    try {
      setLoading(true)
      const response = await subjectService.getAll()
      if (response.data && response.data.data) {
        setSubjects(response.data.data)
      }
    } catch (error) {
      console.error('Error fetching subjects:', error)
      alert('Error loading subjects: ' + (error.response?.data?.message || error.message))
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingSubject) {
        await subjectService.update(editingSubject._id, formData)
        alert('Subject updated successfully!')
      } else {
        const response = await subjectService.create(formData)
        if (response.data && response.data.success) {
          alert('Subject created successfully!')
        }
      }
      
      setShowModal(false)
      setEditingSubject(null)
      setFormData({ code: '', name: '', semester: '', department: '', description: '', branch: '', year: '', section: '' })
      fetchSubjects()
    } catch (error) {
      alert('Error: ' + (error.response?.data?.message || error.message))
    }
  }

  const handleEdit = (subject) => {
    setEditingSubject(subject)
    setFormData({
      code: subject.code,
      name: subject.name,
      semester: subject.semester,
      department: subject.department,
      description: subject.description,
      branch: subject.branch || '',
      year: subject.year || '',
      section: subject.section || ''
    })
    setShowModal(true)
  }

  const handleCancel = () => {
    setShowModal(false)
    setEditingSubject(null)
    setFormData({ code: '', name: '', semester: '', department: '', description: '', branch: '', year: '', section: '' })
  }

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this subject?')) {
      try {
        await subjectService.delete(id)
        fetchSubjects()
      } catch (error) {
        alert('Error deleting subject')
      }
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Subjects</h1>
            <p className="text-gray-600 mt-2">Manage your subjects</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary flex items-center"
          >
            <Plus className="h-5 w-5 mr-2" />
            Create Subject
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : subjects.length === 0 ? (
          <div className="card text-center py-12">
            <GraduationCap className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No subjects yet</h3>
            <p className="text-gray-600 mb-4">Create your first subject to get started</p>
            <button onClick={() => setShowModal(true)} className="btn-primary">
              Create Subject
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {subjects.map((subject) => (
              <div key={subject._id} className="card hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900">{subject.code}</h3>
                    <p className="text-lg text-primary-600">{subject.name}</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <p><span className="font-medium">Semester:</span> {subject.semester}</p>
                  <p><span className="font-medium">Department:</span> {subject.department}</p>
                  {subject.branch && (
                    <p><span className="font-medium">Branch:</span> {subject.branch}</p>
                  )}
                  {subject.year && (
                    <p><span className="font-medium">Year:</span> {subject.year}</p>
                  )}
                  {subject.description && (
                    <p className="text-gray-500">{subject.description}</p>
                  )}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEdit(subject)}
                    className="btn-secondary text-blue-600 hover:bg-blue-50"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <Link
                    to={`/units?subject=${subject._id}&subjectName=${subject.name}`}
                    className="btn-secondary flex-1 flex items-center justify-center"
                  >
                    <BookOpen className="h-4 w-4 mr-2" />
                    Units
                  </Link>
                  <button
                    onClick={() => handleDelete(subject._id)}
                    className="btn-secondary text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h2 className="text-2xl font-bold mb-4">
                {editingSubject ? 'Edit Subject' : 'Create New Subject'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subject Code
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="input-field"
                    placeholder="e.g., CSE101"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subject Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input-field"
                    placeholder="e.g., Machine Learning"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Semester
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.semester}
                    onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                    className="input-field"
                    placeholder="e.g., Fall 2024"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Department
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="input-field"
                    placeholder="e.g., Computer Science"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Branch</label>
                    <input
                      type="text"
                      value={formData.branch}
                      onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                      className="input-field"
                      placeholder="e.g., CSE"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
                    <input
                      type="text"
                      value={formData.year}
                      onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                      className="input-field"
                      placeholder="e.g., 3"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Section</label>
                    <input
                      type="text"
                      value={formData.section}
                      onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                      className="input-field"
                      placeholder="e.g., A"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="input-field"
                    rows="3"
                    placeholder="Subject description..."
                  />
                </div>
                <div className="flex space-x-3">
                  <button
                    type="submit"
                    className="btn-primary flex-1"
                  >
                    {editingSubject ? 'Update Subject' : 'Create Subject'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}