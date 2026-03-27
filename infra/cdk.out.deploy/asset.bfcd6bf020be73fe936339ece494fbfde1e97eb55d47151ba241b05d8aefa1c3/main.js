import { initRouter } from './router.js';
import { authStore } from './stores/auth.js';
import { api } from './api/client.js';

function init() {
  // Check if user has token stored
  const token = localStorage.getItem('access_token');
  const userRole = localStorage.getItem('user_role');
  const userInfoStr = localStorage.getItem('user_info');
  
  if (token) {
    // Set token in API client
    api.setToken(token);
    
    // Restore user state from localStorage
    let user = { role: userRole || 'user' };
    if (userInfoStr) {
      try {
        user = JSON.parse(userInfoStr);
      } catch (e) {
        console.error('Failed to parse user_info:', e);
      }
    }
    authStore.setUser(user);
  }

  // Get app container
  const app = document.getElementById('app');

  // Initialize router with app container
  initRouter(app);
}

// Wait for DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
