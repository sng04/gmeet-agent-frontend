import { api } from './client.js';

export const sessionsApi = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/sessions${query ? `?${query}` : ''}`);
  },
  get: (id) => api.get(`/sessions/${id}`),
  create: (data) => api.post('/sessions', data),
  update: (id, data) => api.put(`/sessions/${id}`, data),
  delete: (id) => api.delete(`/sessions/${id}`),
  listByProject: (projectId) => api.get(`/projects/${projectId}/sessions`),
  getTranscripts: (id) => api.get(`/sessions/${id}/transcripts`),
  getBotStatus: (id) => api.get(`/sessions/${id}/bot-status`),
  stopBot: (id) => api.post(`/sessions/${id}/stop-bot`),
};
