import { api } from './client.js';

export const kbDocumentsApi = {
  list: (projectId, params = {}) => {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);
    const qs = query.toString();
    return api.get(`/projects/${projectId}/kb-documents${qs ? `?${qs}` : ''}`);
  },
  get: (projectId, docId) => api.get(`/projects/${projectId}/kb-documents/${docId}`),
  create: (projectId, data) => api.post(`/projects/${projectId}/kb-documents`, data),
  delete: (projectId, docId) => api.delete(`/projects/${projectId}/kb-documents/${docId}`),
  replace: (projectId, docId) => api.post(`/projects/${projectId}/kb-documents/${docId}/replace`),
};
