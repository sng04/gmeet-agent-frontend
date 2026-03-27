import { api } from './client.js';

export const botCredentialApi = {
  list: (params = {}) => {
    const query = new URLSearchParams();
    if (params.limit) query.append('limit', params.limit);
    if (params.lastKey) query.append('lastKey', params.lastKey);
    const qs = query.toString();
    return api.get(`/bot-credentials${qs ? `?${qs}` : ''}`);
  },
  get: (id) => api.get(`/bot-credentials/${id}`),
  create: (data) => api.post('/bot-credentials', data),
  update: (id, data) => api.put(`/bot-credentials/${id}`, data),
  delete: (id) => api.delete(`/bot-credentials/${id}`),
  getPool: (credentialId, status) => {
    const query = status ? `?status=${status}` : '';
    return api.get(`/bot-credentials/${credentialId}/pool${query}`);
  },
};
