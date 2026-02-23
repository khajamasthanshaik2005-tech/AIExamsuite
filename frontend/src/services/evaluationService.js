import api from './api'

export const evaluationService = {
  getExamSubmissions: (examId, filters = {}) => {
    const params = new URLSearchParams()
    if (filters.branch) params.append('branch', filters.branch)
    if (filters.year) params.append('year', filters.year)
    if (filters.section) params.append('section', filters.section)
    return api.get(`/evaluations/exam/${examId}?${params.toString()}`)
  },
  getFilterOptions: (examId) => api.get(`/evaluations/exam/${examId}/filters`),
  getSubmission: (attemptId) => api.get(`/evaluations/submission/${attemptId}`),
  updateAnswerMarks: (answerId, data) => api.put(`/evaluations/answers/${answerId}`, data),
  bulkUpdateMarks: (attemptId, marks) => api.put(`/evaluations/submission/${attemptId}/marks`, { marks }),
  autoEvaluateSubmission: (attemptId) => api.post(`/evaluations/submission/${attemptId}/auto-evaluate`),
  bulkAutoEvaluate: (examId, filters = {}) => {
    const params = new URLSearchParams()
    if (filters.branch) params.append('branch', filters.branch)
    if (filters.year) params.append('year', filters.year)
    if (filters.section) params.append('section', filters.section)
    const qs = params.toString()
    return api.post(`/evaluations/exam/${examId}/bulk-auto-evaluate${qs ? '?' + qs : ''}`)
  }
}

