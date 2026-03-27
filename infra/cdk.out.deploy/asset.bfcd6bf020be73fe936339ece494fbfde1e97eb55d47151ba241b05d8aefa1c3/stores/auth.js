// Restore user info from localStorage
const savedUserInfo = localStorage.getItem('user_info');
const savedUser = savedUserInfo ? JSON.parse(savedUserInfo) : null;

const state = {
  user: savedUser,
  token: localStorage.getItem('access_token'),
  isAdmin: localStorage.getItem('user_role') === 'admin',
  isAuthenticated: !!localStorage.getItem('access_token'),
  // For password change challenge
  challenge: null,
  challengeSession: null,
  challengeUsername: null,
};

const listeners = new Set();

function notify() {
  listeners.forEach(fn => fn(state));
}

export const authStore = {
  getState: () => ({ ...state }),

  subscribe: (fn) => {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  setTokens: (tokens) => {
    state.token = tokens.access_token;
    state.isAuthenticated = true;
    state.challenge = null; // Clear challenge after successful auth
    localStorage.setItem('access_token', tokens.access_token);
    if (tokens.id_token) localStorage.setItem('id_token', tokens.id_token);
    if (tokens.refresh_token) localStorage.setItem('refresh_token', tokens.refresh_token);
    notify();
  },

  setUser: (user) => {
    state.user = user;
    state.isAdmin = user?.role === 'admin';
    localStorage.setItem('user_role', user?.role || 'user');
    // Save user info for persistence
    if (user) {
      localStorage.setItem('user_info', JSON.stringify(user));
    }
    notify();
  },

  setChallenge: (challenge, session, username) => {
    state.challenge = challenge;
    state.challengeSession = session;
    state.challengeUsername = username;
    // Mark as authenticated but with pending challenge
    state.isAuthenticated = true;
    notify();
  },

  clearChallenge: () => {
    state.challenge = null;
    state.challengeSession = null;
    state.challengeUsername = null;
    notify();
  },

  logout: () => {
    state.user = null;
    state.token = null;
    state.isAdmin = false;
    state.isAuthenticated = false;
    state.challenge = null;
    state.challengeSession = null;
    state.challengeUsername = null;
    localStorage.removeItem('access_token');
    localStorage.removeItem('id_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_info');
    notify();
  },
};
