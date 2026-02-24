import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { FileText, CheckCircle, XCircle, Download, ChevronDown, ChevronRight, Folder, BookOpen } from 'lucide-react'
import api from '../services/api'

export default function StudentDashboard() {
  const [overview, setOverview] = useState([])
  const [loading, setLoading] = useState(true)
  const [eligible, setEligible] = useState([])
  const [expandedId, setExpandedId] = useState(null)
  const [subjectDataMap, setSubjectDataMap] = useState({})
  const [loadingSubjectId, setLoadingSubjectId] = useState(null)
  const uploadsBase =
    (import.meta.env && (import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_BASE_URL)) ||
    'http://localhost:5000'

  useEffect(() => {
    fetchOverview()
  }, [])

  const fetchOverview = async () => {
    try {
      const response = await api.get('/students/overview')
      const data = response.data.data || []
      setOverview(data)
      if ((data || []).length === 0) {
        const eligRes = await api.get('/students/eligible-subjects')
        setEligible(eligRes.data.data || [])
      }
    } catch (error) {
      console.error('Error fetching overview:', error)
    } finally {
      setLoading(false)
    }
  }

  const enrollAllEligible = async () => {
    try {
      setLoading(true)
      await api.post('/students/enroll/auto')
      await fetchOverview()
    } catch (e) {
      // no-op
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Dashboard</h1>
          <p className="text-gray-600 mt-2">View your subjects and study materials</p>
        </div>

        {/* Subjects overview */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {overview.length === 0 ? (
              <div className="card py-6">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-gray-700 font-medium">You have not enrolled in any subjects yet.</p>
                  {eligible.length > 0 && (
                    <button onClick={enrollAllEligible} className="btn-primary">Enroll all eligible</button>
                  )}
              </div>
                {eligible.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-600">
                          <th className="py-2 pr-4">Subject</th>
                          <th className="py-2 pr-4">Code</th>
                          <th className="py-2 pr-4">Dept/Branch</th>
                          <th className="py-2 pr-4">Year</th>
                          <th className="py-2 pr-4">Section</th>
                        </tr>
                      </thead>
                      <tbody>
                        {eligible.map(s => (
                          <tr key={s._id} className="border-t">
                            <td className="py-2 pr-4">{s.name}</td>
                            <td className="py-2 pr-4">{s.code}</td>
                            <td className="py-2 pr-4">{s.department || s.branch || '-'}</td>
                            <td className="py-2 pr-4">{s.year || '-'}</td>
                            <td className="py-2 pr-4">{s.section || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
            </div>
                ) : (
                  <p className="text-sm text-gray-500">No eligible subjects found for your cohort yet.</p>
                )}
              </div>
            ) : (
              overview.map((s) => (
                <div key={s.subject.id} className="card">
                  <button
                    className="w-full flex justify-between items-center mb-2 text-left"
                    onClick={async () => {
                      const newId = expandedId === s.subject.id ? null : s.subject.id
                      setExpandedId(newId)
                      if (newId && !subjectDataMap[s.subject.id]) {
                        try {
                          setLoadingSubjectId(s.subject.id)
                          // Fetch units for this subject
                          const unitsRes = await api.get(`/units/subject/${s.subject.id}`)
                          const units = unitsRes.data.data || []
                          // For each unit, fetch topics and materials
                          const unitsWithChildren = await Promise.all(units.map(async (u) => {
                            const [topicsRes, unitMatRes] = await Promise.all([
                              api.get(`/topics/unit/${u._id}`),
                              api.get(`/uploads/units/${u._id}`)
                            ])
                            const topics = topicsRes.data.data || []
                            const unitMaterials = (unitMatRes.data.data || []).map(m => ({ filename: m.filename, originalName: m.originalName }))
                            // For each topic, fetch materials
                            const topicsWithMaterials = await Promise.all(topics.map(async (t) => {
                              try {
                                const tMatRes = await api.get(`/uploads/topics/${t._id}`)
                                const topicMaterials = (tMatRes.data.data || []).map(m => ({ filename: m.filename, originalName: m.originalName }))
                                return { id: t._id, title: t.title, materials: topicMaterials }
                              } catch {
                                return { id: t._id, title: t.title, materials: [] }
                              }
                            }))
                            return { id: u._id, title: u.title, materials: unitMaterials, topics: topicsWithMaterials }
                          }))
                          setSubjectDataMap(prev => ({ ...prev, [s.subject.id]: { units: unitsWithChildren } }))
                        } catch (e) {
                          // ignore
                        } finally {
                          setLoadingSubjectId(null)
                        }
                      }
                    }}
                  >
                    <div className="flex items-center">
                      {expandedId === s.subject.id ? (
                        <ChevronDown className="h-5 w-5 text-gray-500 mr-2" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-500 mr-2" />
                      )}
                      <div>
                        <h2 className="text-xl font-semibold">{s.subject.name} ({s.subject.code})</h2>
                        <p className="text-sm text-gray-500">{s.subject.department} • Semester {s.subject.semester}</p>
            </div>
          </div>
                    <div className="flex space-x-6 text-sm">
                      <div className="flex items-center space-x-2"><FileText className="h-4 w-4 text-blue-600" /><span>{s.counts.units} Units</span></div>
                      <div className="flex items-center space-x-2"><CheckCircle className="h-4 w-4 text-green-600" /><span>{s.counts.topics} Topics</span></div>
                      <div className="flex items-center space-x-2"><XCircle className="h-4 w-4 text-purple-600" /><span>{s.counts.materials} Materials</span></div>
                    </div>
                  </button>

                  {expandedId === s.subject.id && (
                    <div className="mt-2">
                      {loadingSubjectId === s.subject.id ? (
                        <div className="flex justify-center py-6">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                        </div>
                      ) : !subjectDataMap[s.subject.id] ? (
                        <p className="text-sm text-gray-500">No units or topics available yet.</p>
                      ) : (
                        <div className="space-y-4">
                          {(subjectDataMap[s.subject.id].units || []).map((u, idx) => (
                            <div key={`u-${idx}`} className="border rounded-lg p-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <Folder className="h-4 w-4 text-blue-600" />
                                  <span className="font-medium">{u.title}</span>
                                </div>
                                <div>
                                  {u.materials && u.materials[0] ? (
                                    <a
                                      href={`${uploadsBase}/uploads/study-materials/${u.materials[0].filename}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center text-blue-600 hover:underline text-sm"
                                    >
                                      <Download className="h-4 w-4 mr-1" /> Download unit file
                                    </a>
                                  ) : (
                                    <span className="text-gray-400 text-sm">No unit file</span>
                                  )}
              </div>
            </div>
                              <div className="mt-2 pl-6 space-y-2">
                                {(u.topics || []).map((t, tIdx) => (
                                  <div key={`t-${idx}-${tIdx}`} className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                      <BookOpen className="h-4 w-4 text-green-600" />
                                      <span className="text-sm">{t.title}</span>
          </div>
                                    <div>
                                      {t.materials && t.materials[0] ? (
                                        <a
                                          href={`${uploadsBase}/uploads/study-materials/${t.materials[0].filename}`}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="inline-flex items-center text-blue-600 hover:underline text-sm"
                                        >
                                          <Download className="h-4 w-4 mr-1" /> Download
                                        </a>
                                      ) : (
                                        <span className="text-gray-400 text-sm">No file</span>
                                      )}
              </div>
            </div>
                                ))}
          </div>
        </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
        </div>
        )}
      </div>
    </Layout>
  )
}