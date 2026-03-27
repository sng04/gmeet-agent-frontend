import { api } from './client.js';

export const projectsApi = {
  list: () => api.get('/projects'),
  get: (id) => api.get(`/projects/${id}`),
  create: (data) => api.post('/projects', data),
  update: (id, data) => api.put(`/projects/${id}`, data),
  delete: (id) => api.delete(`/projects/${id}`),
  getSessions: (id) => api.get(`/projects/${id}/sessions`),
  getUsers: (id) => api.get(`/projects/${id}/users`),
  assignUser: (projectId, userId) => api.post('/project-users', { project_id: projectId, user_id: userId }),
  removeUser: (projectUserId) => api.delete(`/project-users/${projectUserId}`),
};
