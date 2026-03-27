import { api } from './client.js';

export const usersApi = {
  list: () => api.get('/users'),
  create: (data) => api.post('/users', data),
  delete: (userId) => api.delete(`/users/${userId}`),
  getProjects: (userId) => api.get(`/users/${userId}/projects`),
};
