import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000
})

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('currentUser')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const authApi = {
  getPublicKey: () => api.get('/auth/public-key'),
  login: (username, encryptedPassword) => api.post('/auth/login', { username, encryptedPassword }),
  me: () => api.get('/auth/me')
}

export const requirementApi = {
  getAll: (page, pageSize, filters = {}) => {
    const hasFilters = Object.values(filters).some(value => value !== '' && value !== null && value !== undefined)
    return api.get('/requirements', { params: { page, pageSize, ...filters, ...(hasFilters ? { _t: Date.now() } : {}) } })
  },
  getApprovalList: (page, pageSize, filters = {}) => api.get('/requirements/approval-list', { params: { page, pageSize, ...filters } }),
  getBySubmitter: (submitter, page, pageSize) => api.get('/requirements/my', { params: { submitter, page, pageSize } }),
  getDrafts: (submitter) => api.get('/requirements/drafts', { params: { submitter } }),
  getLatestDraft: (submitter) => api.get('/requirements/drafts/latest', { params: { submitter } }),
  getDashboard: () => api.get('/requirements/dashboard'),
  getGanttData: (filters) => api.get('/requirements/gantt', { params: filters }),
  getById: (id) => api.get(`/requirements/${id}`),
  create: (data) => api.post('/requirements', data),
  update: (id, data) => api.put(`/requirements/${id}`, data),
  remove: (id) => api.delete(`/requirements/${id}`),
  updateStatus: (id, status) => api.put(`/requirements/${id}/status`, { status }),
  approve: (id, approved, comment, actualDate) => api.put(`/requirements/${id}/approve`, { approved, comment, actualDate }),
  score: (id, score) => api.put(`/requirements/${id}/score`, { score })
}

export const emailApi = {
  send: (data) => api.post('/email/send', data),
  getSettings: () => api.get('/email/settings'),
  updateSettings: (data) => api.put('/email/settings', data)
}

export const developerApi = {
  getAssignable: () => api.get('/developers/assignable', { params: { _t: Date.now() } }),
  getAll: (filters = {}) => api.get('/developers', { params: { ...filters, _t: Date.now() } }),
  getById: (id) => api.get(`/developers/${id}`),
  create: (data) => api.post('/developers', data),
  update: (id, data) => api.put(`/developers/${id}`, data),
  remove: (id) => api.delete(`/developers/${id}`),
  getLoadStats: () => api.get('/developers/load-stats', { params: { _t: Date.now() } }),
  getDepartments: () => api.get('/developers/departments', { params: { _t: Date.now() } })
}

export const commentApi = {
  create: (data) => api.post('/comments', data),
  getList: (requirementId) => api.get(`/comments/${requirementId}`)
}

export const aiApi = {
  chat: (question) => api.post('/ai/chat', { question }, { timeout: 600000 })
}

export const auditLogApi = {
  getList: (filters) => api.get('/audit-logs', { params: filters }),
  getActions: () => api.get('/audit-logs/actions')
}

export const notificationApi = {
  getList: (filters) => api.get('/notifications', { params: filters }),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
  remove: (id) => api.delete(`/notifications/${id}`)
}

export const permissionApi = {
  getAll: () => api.get('/permissions'),
  getModules: () => api.get('/permissions/modules'),
  getByRole: (roleId) => api.get(`/permissions/role/${roleId}`),
  assignPermissions: (roleId, permissionIds) => api.put(`/permissions/role/${roleId}`, { permissionIds })
}

export const userApi = {
  getAll: (params = {}) => api.get('/users', { params: { ...params, _t: Date.now() } }),
  updateRole: (id, role) => api.put(`/users/${id}/role`, { role })
}

export const workflowApi = {
  getStatuses: () => api.get('/workflows/requirement/statuses'),
  updateStatuses: (statuses) => api.put('/workflows/requirement/statuses', { statuses }),
  getTransitions: () => api.get('/workflows/requirement/transitions'),
  createTransition: (data) => api.post('/workflows/requirement/transitions', data),
  updateTransition: (id, data) => api.put(`/workflows/requirement/transitions/${id}`, data),
  reload: () => api.post('/workflows/requirement/reload')
}

export const attachmentApi = {
  getByRequirement: (requirementId) => api.get(`/attachments/requirements/${requirementId}`),
  uploadFormal: (requirementId, formData) => api.post(`/attachments/requirements/${requirementId}/upload`, formData),
  uploadCommentFiles: (formData) => api.post('/attachments/comments/upload', formData),
  addVersion: (attachmentId, formData) => api.post(`/attachments/${attachmentId}/versions`, formData),
  promoteCommentAttachment: (commentAttachmentId, data) => api.post(`/attachments/comments/${commentAttachmentId}/promote`, data),
  remove: (attachmentId) => api.delete(`/attachments/${attachmentId}`),
  fetchFileBlob: (kind, id, mode = 'download') => api.get(`/attachments/files/${kind}/${id}`, {
    params: { mode },
    responseType: 'blob'
  })
}

export default api

