import api from './api'

export const examService = {
  getAll: () => api.get('/exams'),
  getById: (id) => api.get(`/exams/${id}`),
  create: (data) => api.post('/exams', data),
  update: (id, data) => api.put(`/exams/${id}`, data),
  delete: (id) => api.delete(`/exams/${id}`),
  generateQuestions: (id, count = 10) => api.post(`/exams/${id}/generate-questions`, { count }),
  assign: (id, studentIds) => api.put(`/exams/${id}/assign`, { assignedTo: studentIds }),
  start: (id, meta) => api.post(`/exams/${id}/start`, { meta }),
  abandon: (id) => api.put(`/exams/${id}/abandon`),
  finalSubmit: (id) => api.post(`/exams/${id}/submit`),
  getAttemptStatus: (id) => api.get(`/exams/${id}/attempt-status`),
  submitAnswer: ({ examId, questionId, answerText, autoSaved, attachmentDataUrl }) =>
    api.post('/answers', { examId, questionId, answerText, autoSaved, attachmentDataUrl }),
  getExamAnswers: (id) => api.get(`/exams/${id}/answers`),
  releaseResults: (id, filters = {}) => {
    const params = new URLSearchParams()
    if (filters.branch) params.append('branch', filters.branch)
    if (filters.year) params.append('year', filters.year)
    if (filters.section) params.append('section', filters.section)
    const qs = params.toString()
    return api.post(`/exams/${id}/release-results${qs ? `?${qs}` : ''}`)
  },
  getMyResult: (id) => api.get(`/exams/${id}/my-result`)
}


