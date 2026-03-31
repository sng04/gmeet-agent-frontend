import { api } from './client.js';

export const agentsApi = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/agents${query ? `?${query}` : ''}`);
  },
  get: (id) => api.get(`/agents/${id}`),
  create: (data) => api.post('/agents', data),
  update: (id, data) => api.put(`/agents/${id}`, data),
  delete: (id) => api.delete(`/agents/${id}`),
  testPrompt: (data) => api.post('/agents/test-prompt', data),
  // Agent-Skill junction
  listSkills: (agentId) => api.get(`/agents/${agentId}/skills`),
  attachSkill: (agentId, skillId) => api.post(`/agents/${agentId}/skills/${skillId}`),
  detachSkill: (agentId, skillId) => api.delete(`/agents/${agentId}/skills/${skillId}`),
};
