import { api } from './client.js';

export const projectsApi = {
  list: (params = {}) => {
    const query = new URLSearchParams();
    if (params.limit) query.append('limit', params.limit);
    if (params.lastKey) query.append('lastKey', params.lastKey);
    const qs = query.toString();
    return api.get(`/projects${qs ? `?${qs}` : ''}`);
  },
  get: (id) => api.get(`/projects/${id}`),
  create: (data) => api.post('/projects', data),
  update: (id, data) => api.put(`/projects/${id}`, data),
  delete: (id) => api.delete(`/projects/${id}`),
  getUsers: (id) => api.get(`/projects/${id}/users`),
  assignUser: (data) => api.post('/project-users', data),
  removeUser: (projectUserId) => api.delete(`/project-users/${projectUserId}`),
};
