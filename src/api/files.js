import { api } from './client.js';

export const filesApi = {
  /**
   * Get a pre-signed download URL for a file.
   * @param {string} key - The S3 key of the file
   * @param {string} [bucket] - Optional bucket name. Defaults to KB bucket. Pass skills bucket for skill files.
   */
  getDownloadUrl: (key, bucket) => {
    const params = new URLSearchParams({ key });
    if (bucket) params.append('bucket', bucket);
    return api.get(`/files/download?${params.toString()}`);
  },
};
