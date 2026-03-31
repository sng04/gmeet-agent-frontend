import { api } from './client.js';

export const filesApi = {
  /**
   * Get a pre-signed download URL for a file.
   * @param {string} key - The S3 key of the file
   * @param {string} [bucket] - Optional bucket name. Defaults to KB bucket. Pass skills bucket for skill files.
   */
  getDownloadUrl: (key, bucket) => {
    let url = '/files/download?key=' + encodeURIComponent(key);
    if (bucket) url += '&bucket=' + encodeURIComponent(bucket);
    return api.get(url);
  },
};
