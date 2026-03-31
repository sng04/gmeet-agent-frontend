import { api } from './client.js';

export const changelogApi = {
  list: (params = {}) => {
    const query = new URLSearchParams();
    if (params.entity_type) query.append('entity_type', params.entity_type);
    if (params.entity_id) query.append('entity_id', params.entity_id);
    if (params.admin_user_id) query.append('admin_user_id', params.admin_user_id);
    if (params.limit) query.append('limit', params.limit);
    if (params.lastKey) query.append('lastKey', params.lastKey);
    if (params.lastTimestamp) query.append('lastTimestamp', params.lastTimestamp);
    const qs = query.toString();
    return api.get(`/admin/changelog${qs ? `?${qs}` : ''}`);
  },
};
