import { authApi } from '../../api/auth.js';
import { authStore } from '../../stores/auth.js';
import { navigate } from '../../router.js';
import { api } from '../../api/client.js';
import { decodeJwt } from '../../utils/format.js';

export default async function AdminLoginPage() {
  const container = document.createElement('div');
  container.className = 'login-page';

  container.innerHTML = `
    <div class="login-card">
      <div class="login-logo">
        <svg width="40" height="40" viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="8" fill="var(--pri-500)"/>
          <path d="M8 12L16 8L24 12V20L16 24L8 20V12Z" stroke="white" stroke-width="2" fill="none"/>
          <circle cx="16" cy="16" r="3" fill="white"/>
        </svg>
        <span class="login-brand">MeetAgent</span>
        <span class="login-badge">Admin Portal</span>
      </div>
      <h1 class="login-title">Welcome back</h1>
      <p class="login-sub">Sign in to your admin account</p>
      <form id="login-form">
        <div class="form-g">
          <label class="form-l">Email / Username</label>
          <input type="text" name="username" class="form-i" placeholder="admin@example.com" required>
        </div>
        <div class="form-g">
          <label class="form-l">Password</label>
          <div class="form-pwd-wrap">
            <input type="password" name="password" class="form-i" placeholder="Enter your password" required>
            <button type="button" class="pwd-toggle" data-show="false">👁</button>
          </div>
        </div>
        <div class="login-error" id="login-error" style="display:none;"></div>
        <button type="submit" class="btn btn-p btn-lg login-btn">
          <span class="btn-text">Sign In</span>
          <span class="btn-loading" style="display:none;">Signing in...</span>
        </button>
      </form>
      <div class="login-footer">
        <a href="/login" class="login-link">User Portal Login →</a>
      </div>
    </div>
  `;

  const form = container.querySelector('#login-form');
  const errorEl = container.querySelector('#login-error');
  const pwdToggle = container.querySelector('.pwd-toggle');
  const pwdInput = container.querySelector('input[name="password"]');

  pwdToggle.addEventListener('click', () => {
    const isShow = pwdToggle.dataset.show === 'true';
    pwdInput.type = isShow ? 'password' : 'text';
    pwdToggle.textContent = isShow ? '👁' : '🙈';
    pwdToggle.dataset.show = !isShow;
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const username = formData.get('username');
    const password = formData.get('password');

    const btnText = form.querySelector('.btn-text');
    const btnLoading = form.querySelector('.btn-loading');
    const submitBtn = form.querySelector('button[type="submit"]');

    btnText.style.display = 'none';
    btnLoading.style.display = 'inline';
    submitBtn.disabled = true;
    errorEl.style.display = 'none';

    try {
      const response = await authApi.adminLogin(username, password);
      
      if (response.data?.challenge === 'NEW_PASSWORD_REQUIRED') {
        // Set user as admin first
        authStore.setUser({ role: 'admin', email: username, name: username.split('@')[0] });
        // Then set challenge (this marks as authenticated with pending challenge)
        authStore.setChallenge(
          response.data.challenge,
          response.data.session,
          response.data.username || username
        );
        navigate('admin/change-password');
      } else if (response.data?.access_token) {
        const payload = decodeJwt(response.data.access_token);
        console.log('JWT payload:', payload);
        
        const role = payload?.role || payload?.['custom:role'] || payload?.['cognito:groups']?.[0];
        console.log('Detected role:', role);
        
        if (role !== 'admin') {
          throw new Error('Access denied. Admin privileges required.');
        }
        
        const user = {
          role: 'admin',
          email: payload?.email || username,
          name: payload?.name || payload?.email?.split('@')[0] || username.split('@')[0],
          sub: payload?.sub,
        };
        
        authStore.setUser(user);
        authStore.setTokens(response.data);
        api.setToken(response.data.access_token);
        navigate('');
      }
    } catch (err) {
      errorEl.textContent = err.message || 'Login failed. Please try again.';
      errorEl.style.display = 'block';
    } finally {
      btnText.style.display = 'inline';
      btnLoading.style.display = 'none';
      submitBtn.disabled = false;
    }
  });

  return container;
}
