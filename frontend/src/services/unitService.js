import api from './api'

export const unitService = {
  getAll: (subjectId) => api.get(`/units/subject/${subjectId}`),
  getById: (id) => api.get(`/units/${id}`),
  create: (data) => api.post('/units', data),
  update: (id, data) => api.put(`/units/${id}`, data),
  delete: (id) => api.delete(`/units/${id}`),
}


