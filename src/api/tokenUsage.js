import { api } from './client.js';

export const tokenUsageApi = {
  summary: (period) => api.get(`/admin/token-usage/summary${period ? '?period=' + period : ''}`),
  daily: (period) => api.get(`/admin/token-usage/daily${period ? '?period=' + period : ''}`),
  byProject: (period) => api.get(`/admin/token-usage/by-project${period ? '?period=' + period : ''}`),
};
