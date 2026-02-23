import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import Layout from '../../components/Layout'
import { Plus, Trash2, Edit2, Tag, Upload } from 'lucide-react'
import api from '../../services/api'

export default function FacultyTopics() {
  const uploadsBase = (import.meta.env && import.meta.env.VITE_BACKEND_URL) || 'http://localhost:5000'
  const [searchParams] = useSearchParams()
  const unitId = searchParams.get('unit')
  const unitName = searchParams.get('unitName')
  
  const [topics, setTopics] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingTopic, setEditingTopic] = useState(null)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [selectedTopic, setSelectedTopic] = useState(null)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [materials, setMaterials] = useState([])
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    depthLevel: 1,
    keywords: '',
    teachingHours: '',
    unitId: unitId
  })

  useEffect(() => {
    if (unitId) {
      fetchTopics()
    }
  }, [unitId])

  const fetchTopics = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/topics/unit/${unitId}`)
      setTopics(response.data.data)
    } catch (error) {
      console.error('Error fetching topics:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        ...formData,
        keywords: formData.keywords.split(',').map(k => k.trim()).filter(k => k)
      }
      
      if (editingTopic) {
        await api.put(`/topics/${editingTopic._id}`, payload)
        alert('Topic updated successfully!')
      } else {
        await api.post('/topics', payload)
        alert('Topic created successfully!')
      }
      
      setShowModal(false)
      setEditingTopic(null)
      setFormData({ title: '', description: '', depthLevel: 1, keywords: '', teachingHours: '', unitId: unitId })
      await fetchTopics()
    } catch (error) {
      alert('Error: ' + (error.response?.data?.message || error.message))
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this topic?')) {
      try {
        await api.delete(`/topics/${id}`)
        fetchTopics()
      } catch (error) {
        alert('Error deleting topic')
      }
    }
  }

  const handleEdit = (topic) => {
    setEditingTopic(topic)
    setFormData({
      title: topic.title,
      description: topic.description || '',
      depthLevel: topic.depthLevel,
      keywords: topic.keywords?.join(', ') || '',
      teachingHours: topic.teachingHours,
      unitId: unitId
    })
    setShowModal(true)
  }

  const handleCancel = () => {
    setShowModal(false)
    setEditingTopic(null)
    setFormData({ title: '', description: '', depthLevel: 1, keywords: '', teachingHours: '', unitId: unitId })
  }

  const handleUpload = (topic) => {
    setSelectedTopic(topic)
    setShowUploadModal(true)
    fetchMaterials(topic._id)
  }

  const fetchMaterials = async (topicId) => {
    try {
      const res = await api.get(`/uploads/topics/${topicId}`)
      setMaterials(res.data.data || [])
    } catch (e) {
      setMaterials([])
    }
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    try {
      setUploadingFile(true)
      const formData = new FormData()
      formData.append('file', file)
      formData.append('topic', selectedTopic._id)

      await api.post('/uploads/topics', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      alert('File uploaded successfully!')
      await fetchMaterials(selectedTopic._id)
    } catch (error) {
      alert('Error uploading file')
    } finally {
      setUploadingFile(false)
    }
  }

  const handleDeleteMaterial = async (materialId) => {
    if (!selectedTopic) return
    if (!window.confirm('Delete this file?')) return
    try {
      await api.delete(`/uploads/topics/${selectedTopic._id}/${materialId}`)
      await fetchMaterials(selectedTopic._id)
    } catch (e) {
      alert('Error deleting file')
    }
  }

  if (!unitId) {
    return (
      <Layout>
        <div className="card text-center py-12">
          <p className="text-gray-600">No unit selected</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Topics - {unitName}</h1>
            <p className="text-gray-600 mt-2">Manage topics for this unit</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary flex items-center"
          >
            <Plus className="h-5 w-5 mr-2" />
            Create Topic
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : topics.length === 0 ? (
          <div className="card text-center py-12">
            <Tag className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No topics yet</h3>
            <p className="text-gray-600 mb-4">Create your first topic</p>
            <button onClick={() => setShowModal(true)} className="btn-primary">
              Create Topic
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {topics.map((topic) => (
              <div key={topic._id} className="card hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">{topic.title}</h3>
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                      topic.depthLevel === 1 ? 'bg-green-100 text-green-800' :
                      topic.depthLevel === 2 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      Level {topic.depthLevel}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-3">{topic.description || 'No description'}</p>
                <div className="flex justify-between items-center text-sm text-gray-600 mb-4">
                  <span>{topic.teachingHours} hours</span>
                  {topic.keywords && topic.keywords.length > 0 && (
                    <span className="text-xs text-gray-500">
                      {topic.keywords.length} keywords
                    </span>
                  )}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEdit(topic)}
                    className="btn-secondary text-blue-600 hover:bg-blue-50 flex-1"
                  >
                    <Edit2 className="h-4 w-4 mx-auto" />
                  </button>
                  <button
                    onClick={() => handleUpload(topic)}
                    className="btn-secondary text-purple-600 hover:bg-purple-50 flex-1"
                  >
                    <Upload className="h-4 w-4 mx-auto" />
                  </button>
                  <button
                    onClick={() => handleDelete(topic._id)}
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
            <div className="bg-white rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold mb-4">
                {editingTopic ? 'Edit Topic' : 'Create New Topic'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Topic Title
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="input-field"
                    placeholder="e.g., Supervised Learning"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    required
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="input-field"
                    rows="3"
                    placeholder="Topic description..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Depth Level
                  </label>
                  <select
                    required
                    value={formData.depthLevel}
                    onChange={(e) => setFormData({ ...formData, depthLevel: parseInt(e.target.value) })}
                    className="input-field"
                  >
                    <option value="1">Level 1 - Basic</option>
                    <option value="2">Level 2 - Intermediate</option>
                    <option value="3">Level 3 - Advanced</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Keywords (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={formData.keywords}
                    onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                    className="input-field"
                    placeholder="e.g., machine learning, neural networks, algorithms"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Teaching Hours
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.teachingHours}
                    onChange={(e) => setFormData({ ...formData, teachingHours: e.target.value })}
                    className="input-field"
                    placeholder="e.g., 5"
                  />
                </div>
                <div className="flex space-x-3">
                  <button
                    type="submit"
                    className="btn-primary flex-1"
                  >
                    {editingTopic ? 'Update Topic' : 'Create Topic'}
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

        {/* Upload Modal */}
        {showUploadModal && selectedTopic && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h2 className="text-2xl font-bold mb-4">Upload Study Material</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-2">
                    Upload study materials for: <strong>{selectedTopic.title}</strong>
                  </p>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.txt"
                    onChange={handleFileUpload}
                    disabled={uploadingFile}
                    className="input-field"
                  />
                </div>
                <div>
                  <h3 className="font-medium mb-2">Existing Files</h3>
                  {materials.length === 0 ? (
                    <p className="text-sm text-gray-500">No files uploaded yet.</p>
                  ) : (
                    <ul className="space-y-2 text-sm">
                      {materials.map(m => (
                        <li key={m._id} className="flex justify-between items-center">
                          <a
                            href={`${uploadsBase}/uploads/study-materials/${m.filename}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            {m.originalName}
                          </a>
                          <button
                            onClick={() => handleDeleteMaterial(m._id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            Delete
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowUploadModal(false)}
                    className="btn-secondary flex-1"
                    disabled={uploadingFile}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}