import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import Layout from '../../components/Layout'
import { Plus, Trash2, Edit2, FileText, Settings, Upload, Download } from 'lucide-react'
import api from '../../services/api'

export default function FacultyUnits() {
  const [searchParams] = useSearchParams()
  const subjectId = searchParams.get('subject')
  const subjectName = searchParams.get('subjectName')
  
  const [units, setUnits] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingUnit, setEditingUnit] = useState(null)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [selectedUnit, setSelectedUnit] = useState(null)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [materials, setMaterials] = useState([])
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    estimatedHours: '',
    subjectId: subjectId
  })

  useEffect(() => {
    if (subjectId) {
      fetchUnits()
    }
  }, [subjectId])

  const fetchUnits = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/units/subject/${subjectId}`)
      setUnits(response.data.data)
    } catch (error) {
      console.error('Error fetching units:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingUnit) {
        await api.put(`/units/${editingUnit._id}`, formData)
        alert('Unit updated successfully!')
      } else {
        await api.post('/units', formData)
        alert('Unit created successfully!')
      }
      
      setShowModal(false)
      setEditingUnit(null)
      setFormData({ title: '', description: '', estimatedHours: '', subjectId: subjectId })
      await fetchUnits()
    } catch (error) {
      alert('Error: ' + (error.response?.data?.message || error.message))
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this unit?')) {
      try {
        await api.delete(`/units/${id}`)
        fetchUnits()
      } catch (error) {
        alert('Error deleting unit')
      }
    }
  }

  const handleEdit = (unit) => {
    setEditingUnit(unit)
    setFormData({
      title: unit.title,
      description: unit.description,
      estimatedHours: unit.estimatedHours,
      subjectId: subjectId
    })
    setShowModal(true)
  }

  const handleCancel = () => {
    setShowModal(false)
    setEditingUnit(null)
    setFormData({ title: '', description: '', estimatedHours: '', subjectId: subjectId })
  }

  const handleUpload = (unit) => {
    setSelectedUnit(unit)
    setShowUploadModal(true)
    fetchMaterials(unit._id)
  }

  const fetchMaterials = async (unitId) => {
    try {
      const res = await api.get(`/uploads/units/${unitId}`)
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
      formData.append('unit', selectedUnit._id)

      await api.post('/uploads/units', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      alert('File uploaded successfully!')
      await fetchMaterials(selectedUnit._id)
    } catch (error) {
      alert('Error uploading file')
    } finally {
      setUploadingFile(false)
    }
  }

  const handleDeleteMaterial = async (materialId) => {
    if (!selectedUnit) return
    if (!window.confirm('Delete this file?')) return
    try {
      await api.delete(`/uploads/units/${selectedUnit._id}/${materialId}`)
      await fetchMaterials(selectedUnit._id)
    } catch (e) {
      alert('Error deleting file')
    }
  }

  if (!subjectId) {
    return (
      <Layout>
        <div className="card text-center py-12">
          <p className="text-gray-600">No subject selected</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Units - {subjectName}</h1>
            <p className="text-gray-600 mt-2">Manage units for this subject</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary flex items-center"
          >
            <Plus className="h-5 w-5 mr-2" />
            Create Unit
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : units.length === 0 ? (
          <div className="card text-center py-12">
            <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No units yet</h3>
            <p className="text-gray-600 mb-4">Create your first unit</p>
            <button onClick={() => setShowModal(true)} className="btn-primary">
              Create Unit
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {units.map((unit) => (
              <div key={unit._id} className="card hover:shadow-lg transition-shadow">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{unit.title}</h3>
                <p className="text-sm text-gray-600 mb-4 line-clamp-3">{unit.description}</p>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm text-gray-600">{unit.estimatedHours} hours</span>
                  <Link
                    to={`/topics?unit=${unit._id}&unitName=${unit.title}`}
                    className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                  >
                    View Topics →
                  </Link>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEdit(unit)}
                    className="btn-secondary text-blue-600 hover:bg-blue-50 flex-1"
                  >
                    <Edit2 className="h-4 w-4 mx-auto" />
                  </button>
                  <button
                    onClick={() => handleUpload(unit)}
                    className="btn-secondary text-purple-600 hover:bg-purple-50 flex-1"
                  >
                    <Upload className="h-4 w-4 mx-auto" />
                  </button>
                  <Link
                    to={`/topics?unit=${unit._id}&unitName=${unit.title}`}
                    className="btn-secondary text-green-600 hover:bg-green-50 flex-1 flex items-center justify-center"
                  >
                    <FileText className="h-4 w-4" />
                  </Link>
                  <button
                    onClick={() => handleDelete(unit._id)}
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
                {editingUnit ? 'Edit Unit' : 'Create New Unit'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Unit Title
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="input-field"
                    placeholder="e.g., Introduction to ML"
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
                    placeholder="Unit description..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estimated Hours
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.estimatedHours}
                    onChange={(e) => setFormData({ ...formData, estimatedHours: e.target.value })}
                    className="input-field"
                    placeholder="e.g., 20"
                  />
                </div>
                <div className="flex space-x-3">
                  <button
                    type="submit"
                    className="btn-primary flex-1"
                  >
                    {editingUnit ? 'Update Unit' : 'Create Unit'}
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
        {showUploadModal && selectedUnit && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h2 className="text-2xl font-bold mb-4">Upload Study Material</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-2">
                    Upload study materials for: <strong>{selectedUnit.title}</strong>
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
                            href={`/uploads/study-materials/${m.filename}`}
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