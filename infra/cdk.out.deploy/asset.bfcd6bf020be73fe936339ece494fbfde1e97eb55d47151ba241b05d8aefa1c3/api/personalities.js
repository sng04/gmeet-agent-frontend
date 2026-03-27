import { api } from './client.js';

export const personalitiesApi = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/personalities${query ? `?${query}` : ''}`);
  },
  get: (id) => api.get(`/personalities/${id}`),
  create: (data) => api.post('/personalities', data),
  update: (id, data) => api.put(`/personalities/${id}`, data),
  delete: (id) => api.delete(`/personalities/${id}`),
};
