import { authApi } from '../../api/auth.js';
import { authStore } from '../../stores/auth.js';
import { navigate } from '../../router.js';
import { api } from '../../api/client.js';

export default async function AdminChangePasswordPage() {
  const container = document.createElement('div');
  container.className = 'login-page';

  const { challengeSession, challengeUsername, challenge } = authStore.getState();

  // If no challenge, redirect to login
  if (!challenge || !challengeSession || !challengeUsername) {
    navigate('admin/login');
    return container;
  }

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
      <h1 class="login-title">Set New Password</h1>
      <p class="login-sub">Please create a new password for your account</p>
      <form id="change-pwd-form">
        <div class="form-g">
          <label class="form-l">New Password</label>
          <div class="form-pwd-wrap">
            <input type="password" name="new_password" class="form-i" placeholder="Enter new password" required>
            <button type="button" class="pwd-toggle" data-show="false">👁</button>
          </div>
          <div class="form-h">Min 8 chars, uppercase, lowercase, number, special char</div>
        </div>
        <div class="form-g">
          <label class="form-l">Confirm Password</label>
          <div class="form-pwd-wrap">
            <input type="password" name="confirm_password" class="form-i" placeholder="Confirm new password" required>
            <button type="button" class="pwd-toggle" data-show="false">👁</button>
          </div>
        </div>
        <div class="pwd-strength" id="pwd-strength"></div>
        <div class="login-error" id="login-error" style="display:none;"></div>
        <button type="submit" class="btn btn-p btn-lg login-btn">
          <span class="btn-text">Set Password</span>
          <span class="btn-loading" style="display:none;">Setting password...</span>
        </button>
      </form>
    </div>
  `;

  const form = container.querySelector('#change-pwd-form');
  const errorEl = container.querySelector('#login-error');
  const strengthEl = container.querySelector('#pwd-strength');
  const pwdToggles = container.querySelectorAll('.pwd-toggle');

  pwdToggles.forEach(toggle => {
    toggle.addEventListener('click', () => {
      const input = toggle.previousElementSibling;
      const isShow = toggle.dataset.show === 'true';
      input.type = isShow ? 'password' : 'text';
      toggle.textContent = isShow ? '👁' : '🙈';
      toggle.dataset.show = !isShow;
    });
  });

  const newPwdInput = container.querySelector('input[name="new_password"]');
  newPwdInput.addEventListener('input', (e) => {
    const pwd = e.target.value;
    const checks = [
      { test: pwd.length >= 8, label: '8+ characters' },
      { test: /[A-Z]/.test(pwd), label: 'Uppercase' },
      { test: /[a-z]/.test(pwd), label: 'Lowercase' },
      { test: /[0-9]/.test(pwd), label: 'Number' },
      { test: /[^A-Za-z0-9]/.test(pwd), label: 'Special char' },
    ];
    strengthEl.innerHTML = checks.map(c => 
      `<span class="pwd-check ${c.test ? 'ok' : ''}">${c.test ? '✓' : '○'} ${c.label}</span>`
    ).join('');
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const newPassword = formData.get('new_password');
    const confirmPassword = formData.get('confirm_password');

    if (newPassword !== confirmPassword) {
      errorEl.textContent = 'Passwords do not match';
      errorEl.style.display = 'block';
      return;
    }

    const btnText = form.querySelector('.btn-text');
    const btnLoading = form.querySelector('.btn-loading');
    const submitBtn = form.querySelector('button[type="submit"]');

    btnText.style.display = 'none';
    btnLoading.style.display = 'inline';
    submitBtn.disabled = true;
    errorEl.style.display = 'none';

    try {
      const response = await authApi.changePassword(
        challengeSession,
        challengeUsername,
        newPassword
      );

      if (response.data?.access_token) {
        // Set tokens first (this also clears challenge)
        authStore.setTokens(response.data);
        api.setToken(response.data.access_token);
        // Small delay to ensure state is updated before navigation
        setTimeout(() => navigate(''), 100);
      }
    } catch (err) {
      errorEl.textContent = err.message || 'Failed to change password';
      errorEl.style.display = 'block';
    } finally {
      btnText.style.display = 'inline';
      btnLoading.style.display = 'none';
      submitBtn.disabled = false;
    }
  });

  return container;
}
