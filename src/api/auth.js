import { api } from './client.js';

export const authApi = {
  // Admin login
  adminLogin: (username, password) => 
    api.post('/auth/admin/login', { username, password }),

  // User login
  userLogin: (username, password) => 
    api.post('/auth/user/login', { username, password }),

  // Change password (first login challenge)
  changePassword: (session, username, new_password) => 
    api.post('/auth/change-password', { session, username, new_password }),

  // Logout
  logout: () => api.post('/auth/logout'),

  // Get current user
  me: () => api.get('/auth/me'),
};
