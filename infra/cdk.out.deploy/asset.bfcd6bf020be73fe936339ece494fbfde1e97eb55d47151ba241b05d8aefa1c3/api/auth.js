import { api } from './client.js';

export const authApi = {
  adminLogin: (username, password) =>
    api.post('/auth/admin/login', { username, password }),

  userLogin: (username, password) =>
    api.post('/auth/user/login', { username, password }),

  changePassword: (username, previousPassword, proposedPassword) =>
    api.post('/auth/change-password', {
      username,
      previous_password: previousPassword,
      proposed_password: proposedPassword,
    }),

  /**
   * Respond to a NEW_PASSWORD_REQUIRED challenge.
   * Uses the same endpoint but with session-based payload.
   */
  respondToChallenge: (session, username, newPassword) =>
    api.post('/auth/change-password', { session, username, new_password: newPassword }),

  logout: () => api.post('/auth/logout'),
};
