import { loadTemplate } from '../../utils/template.js';
import { authApi } from '../../api/auth.js';
import { authStore } from '../../stores/auth.js';
import { navigate } from '../../router.js';
import { api } from '../../api/client.js';

/**
 * Loads the user change-password template, validates challenge session,
 * attaches password strength indicator, password toggles, form submission
 * with API call, and error display. Returns the login page DOM element.
 *
 * @returns {Promise<HTMLElement>} - The login-page container element
 */
export default async function UserChangePasswordController() {
  const container = await loadTemplate('/templates/user/change-password.html', 'user-change-password');

  const { challengeSession, challengeUsername, challenge } = authStore.getState();

  // If no challenge, redirect to user login
  if (!challenge || !challengeSession || !challengeUsername) {
    navigate('login/user');
    return container;
  }

  const form = container.querySelector('#change-pwd-form');
  const errorEl = container.querySelector('[data-bind="loginError"]');
  const strengthEl = container.querySelector('[data-bind="pwdStrength"]');
  const pwdToggles = container.querySelectorAll('[data-action="pwdToggle"]');

  // Password toggles
  pwdToggles.forEach(toggle => {
    toggle.addEventListener('click', () => {
      const input = toggle.previousElementSibling;
      const isShow = toggle.dataset.show === 'true';
      input.type = isShow ? 'password' : 'text';
      toggle.textContent = isShow ? '👁' : '🙈';
      toggle.dataset.show = !isShow;
    });
  });

  // Password strength indicator
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

  // Form submit
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

    const btnText = form.querySelector('[data-bind="btnText"]');
    const btnLoading = form.querySelector('[data-bind="btnLoading"]');
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
        authStore.setTokens(response.data);
        api.setToken(response.data.access_token);
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
