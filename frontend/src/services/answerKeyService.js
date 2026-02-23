import api from './api'

export const answerKeyService = {
  upload: (examId, file, cohort = {}) => {
    const formData = new FormData()
    formData.append('answerKey', file)
    if (cohort.targetBranch) formData.append('targetBranch', cohort.targetBranch)
    if (cohort.targetYear) formData.append('targetYear', cohort.targetYear)
    if (cohort.targetSection) formData.append('targetSection', cohort.targetSection)
    return api.post(`/answer-keys/exam/${examId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  getAll: (examId) => api.get(`/answer-keys/exam/${examId}`),
  getForCohort: (examId, branch, year, section) =>
    api.get(`/answer-keys/exam/${examId}`, { params: { branch, year, section } }),
  delete: (id) => api.delete(`/answer-keys/${id}`)
}




