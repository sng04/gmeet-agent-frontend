import { api } from './client.js';

export const gmailApi = {
  list: () => api.get('/gmail-credentials'),
  get: (id) => api.get(`/gmail-credentials/${id}`),
  create: (data) => api.post('/gmail-credentials', data),
  update: (id, data) => api.put(`/gmail-credentials/${id}`, data),
  delete: (id) => api.delete(`/gmail-credentials/${id}`),
  test: (id) => api.post(`/gmail-credentials/${id}/test`),
};
