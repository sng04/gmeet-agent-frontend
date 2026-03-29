import { API_BASE_URL, USE_MOCK } from '../config.js';

const BASE_URL = API_BASE_URL;

class ApiClient {
  constructor() {
    this.token = localStorage.getItem('access_token');
  }

  async request(endpoint, options = {}) {
    // Don't send auth header for login/public endpoints
    const isPublicEndpoint = endpoint.startsWith('/auth/') && !endpoint.includes('/logout');
    const headers = {
      'Content-Type': 'application/json',
      ...(!isPublicEndpoint && this.token && { Authorization: `Bearer ${this.token}` }),
      ...options.headers,
    };

    try {
      const res = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });

      const contentType = res.headers.get('content-type');
      let data;
      if (contentType?.includes('application/json')) {
        data = await res.json();
      } else {
        data = await res.text();
      }

      if (res.status === 401) {
        this.token = null;
        localStorage.removeItem('access_token');
        localStorage.removeItem('id_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user_role');
        localStorage.removeItem('user_info');
        // Use History API navigation (not hash)
        window.history.pushState({}, '', '/login');
        window.dispatchEvent(new PopStateEvent('popstate'));
        throw new Error(data?.message || 'Unauthorized');
      }

      if (!res.ok || (data && data.status === false)) {
        throw new Error(data?.message || res.statusText);
      }

      return data;
    } catch (err) {
      if (err.message === 'Failed to fetch') {
        throw new Error('Network error - API may have CORS issues or is unreachable');
      }
      throw err;
    }
  }

  get(endpoint) {
    return this.request(endpoint);
  }

  post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('access_token', token);
    } else {
      localStorage.removeItem('access_token');
    }
  }

  clearTokens() {
    this.token = null;
    localStorage.removeItem('access_token');
    localStorage.removeItem('id_token');
    localStorage.removeItem('refresh_token');
  }
}

export const api = new ApiClient();
