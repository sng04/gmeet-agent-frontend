import { api } from './client.js';

export const botPoolApi = {
  start: (data = {}) => api.post('/warm-pool/start', data),
  stop: (data = {}) => api.post('/warm-pool/stop', data),
};
