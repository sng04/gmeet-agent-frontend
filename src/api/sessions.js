import { api } from './client.js';

export const sessionsApi = {
  // List all sessions (admin sees all, user sees assigned projects only)
  list: (params = {}) => {
    const query = new URLSearchParams();
    if (params.limit) query.append('limit', params.limit);
    if (params.lastKey) query.append('lastKey', params.lastKey);
    const qs = query.toString();
    return api.get(`/sessions${qs ? `?${qs}` : ''}`);
  },

  // Get sessions for a specific project
  listByProject: (projectId, params = {}) => {
    const query = new URLSearchParams();
    if (params.limit) query.append('limit', params.limit);
    if (params.lastKey) query.append('lastKey', params.lastKey);
    const qs = query.toString();
    return api.get(`/projects/${projectId}/sessions${qs ? `?${qs}` : ''}`);
  },

  // Get single session
  get: (id) => api.get(`/sessions/${id}`),

  // Create new session
  create: (data) => api.post('/sessions', data),

  // Update session
  update: (id, data) => api.put(`/sessions/${id}`, data),

  // Delete session
  delete: (id) => api.delete(`/sessions/${id}`),

  // Stop meeting bot
  stopBot: (id) => api.post(`/sessions/${id}/stop-bot`),

  // Get bot status
  getBotStatus: (id) => api.get(`/sessions/${id}/bot-status`),

  // Get transcripts
  getTranscripts: (id, params = {}) => {
    const query = new URLSearchParams();
    if (params.limit) query.append('limit', params.limit);
    if (params.lastKey) query.append('lastKey', params.lastKey);
    const qs = query.toString();
    return api.get(`/sessions/${id}/transcripts${qs ? `?${qs}` : ''}`);
  },

  // Legacy endpoints (keep for backward compatibility)
  getQA: (id) => api.get(`/sessions/${id}/qa`),
  getTranscript: (id) => api.get(`/sessions/${id}/transcript`),
  end: (id) => api.post(`/sessions/${id}/end`),
};
