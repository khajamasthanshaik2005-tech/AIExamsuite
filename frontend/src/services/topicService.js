import api from './api'

export const topicService = {
  getAll: (unitId) => api.get(`/topics/unit/${unitId}`),
  getById: (id) => api.get(`/topics/${id}`),
  create: (data) => api.post('/topics', data),
  update: (id, data) => api.put(`/topics/${id}`, data),
  delete: (id) => api.delete(`/topics/${id}`),
}


