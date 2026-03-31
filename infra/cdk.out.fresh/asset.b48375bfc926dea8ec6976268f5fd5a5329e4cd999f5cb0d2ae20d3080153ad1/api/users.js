import { api } from './client.js';

export const usersApi = {
  list: () => api.get('/users'),
  get: (userId) => api.get(`/users/${userId}`),
  create: (email) => api.post('/users', { email }),
  update: (userId, data) => api.put(`/users/${userId}`, data),
  delete: (userId) => api.delete(`/users/${userId}`),
};
