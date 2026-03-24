import { api } from './client.js';

export const projectsApi = {
  list: () => api.get('/projects'),
  get: (id) => api.get(`/projects/${id}`),
  create: (data) => api.post('/projects', data),
  update: (id, data) => api.put(`/projects/${id}`, data),
  delete: (id) => api.delete(`/projects/${id}`),
  getUsers: (id) => api.get(`/projects/${id}/users`),
  addUser: (id, email) => api.post(`/projects/${id}/users`, { email }),
  removeUser: (id, userId) => api.delete(`/projects/${id}/users/${userId}`),
};
