import { api } from './client.js';

export const skillsApi = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/skills${query ? `?${query}` : ''}`);
  },
  get: (id) => api.get(`/skills/${id}`),
  create: (data) => api.post('/skills', data),
  update: (id, data) => api.put(`/skills/${id}`, data),
  delete: (id) => api.delete(`/skills/${id}`),
  replaceDocument: (id) => api.post(`/skills/${id}/replace-document`),

  /**
   * Upload file to the pre-signed URL returned by create().
   * @param {string} uploadUrl - Pre-signed S3 URL
   * @param {File} file - File object to upload
   */
  upload: (uploadUrl, file, contentType) =>
    fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': contentType || 'application/octet-stream' },
      body: file,
    }),
};
