import { api } from './client.js';

export const agentsApi = {
  list: () => api.get('/agents'),
  get: (id) => api.get(`/agents/${id}`),
  create: (data) => api.post('/agents', data),
  update: (id, data) => api.put(`/agents/${id}`, data),
  delete: (id) => api.delete(`/agents/${id}`),
  getKnowledgeBase: (id) => api.get(`/agents/${id}/kb`),
};
