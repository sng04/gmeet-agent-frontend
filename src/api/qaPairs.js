import { api } from './client.js';

export const qaPairsApi = {
  list: (params = {}) => {
    const query = new URLSearchParams();
    if (params.limit) query.append('limit', params.limit);
    if (params.lastKey) query.append('lastKey', params.lastKey);
    if (params.session_id) query.append('session_id', params.session_id);
    if (params.project_id) query.append('project_id', params.project_id);
    const qs = query.toString();
    return api.get(`/qa-pairs${qs ? `?${qs}` : ''}`);
  },
  listBySession: (sessionId) => api.get(`/qa-pairs?session_id=${sessionId}`),
  listByProject: (projectId) => api.get(`/qa-pairs?project_id=${projectId}`),
  get: (id) => api.get(`/qa-pairs/${id}`),
  delete: (id) => api.delete(`/qa-pairs/${id}`),
};
