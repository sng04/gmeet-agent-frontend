const BASE_URL = 'https://cclxwjwi3h.execute-api.ap-southeast-1.amazonaws.com/dev';

// Set to true to use mock data (for testing without backend)
const USE_MOCK = false;

class ApiClient {
  constructor() {
    this.token = localStorage.getItem('access_token');
  }

  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
      ...options.headers,
    };

    console.log('API Request:', {
      url: `${BASE_URL}${endpoint}`,
      method: options.method || 'GET',
      hasToken: !!this.token,
      tokenPreview: this.token ? this.token.substring(0, 20) + '...' : null
    });

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
        window.location.hash = '#/login';
        throw new Error(data?.message || 'Unauthorized');
      }

      if (!res.ok || (data && data.status === false)) {
        throw new Error(data?.message || res.statusText);
      }

      return data;
    } catch (err) {
      // If CORS error or network error, throw with better message
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
