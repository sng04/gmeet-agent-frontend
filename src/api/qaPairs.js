import { api } from './client.js';

export const qaPairsApi = {
  listBySession: (sessionId) => api.get(`/qa-pairs?session_id=${sessionId}`),
  listByProject: (projectId) => api.get(`/qa-pairs?project_id=${projectId}`),
  get: (id) => api.get(`/qa-pairs/${id}`),
  delete: (id) => api.delete(`/qa-pairs/${id}`),
};
