import { api } from './client.js';

export const sessionsApi = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/sessions${query ? `?${query}` : ''}`);
  },
  get: (id) => api.get(`/sessions/${id}`),
  create: (data) => api.post('/sessions', data),
  getQA: (id) => api.get(`/sessions/${id}/qa`),
  getTranscript: (id) => api.get(`/sessions/${id}/transcript`),
  end: (id) => api.post(`/sessions/${id}/end`),
};
