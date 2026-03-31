import { loadTemplate } from '../../utils/template.js';
import { authApi } from '../../api/auth.js';
import { authStore } from '../../stores/auth.js';
import { navigate } from '../../router.js';
import { api } from '../../api/client.js';
import { decodeJwt } from '../../utils/format.js';

/**
 * Loads the user login template, attaches form submission handler with
 * API call, JWT decode, role verification (block admin), challenge flow,
 * password toggle, and error display. Returns the login page DOM element.
 *
 * @returns {Promise<HTMLElement>} - The login-page container element
 */
export default async function UserLoginController() {
  const container = await loadTemplate('/templates/user/login.html', 'user-login');

  const form = container.querySelector('#login-form');
  const errorEl = container.querySelector('[data-bind="loginError"]');
  const pwdToggle = container.querySelector('[data-action="pwdToggle"]');
  const pwdInput = container.querySelector('input[name="password"]');
  const footerLink = container.querySelector('[data-action="adminPortalLink"]');

  // Password toggle
  pwdToggle.addEventListener('click', () => {
    const isShow = pwdToggle.dataset.show === 'true';
    pwdInput.type = isShow ? 'password' : 'text';
    pwdToggle.textContent = isShow ? '👁' : '🙈';
    pwdToggle.dataset.show = !isShow;
  });

  // Footer link
  footerLink.addEventListener('click', (e) => {
    e.preventDefault();
    navigate('login/admin');
  });

  // Form submit
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const username = (formData.get('username') || '').trim();
    const password = formData.get('password');

    const btnText = form.querySelector('[data-bind="btnText"]');
    const btnLoading = form.querySelector('[data-bind="btnLoading"]');
    const submitBtn = form.querySelector('button[type="submit"]');

    btnText.style.display = 'none';
    btnLoading.style.display = 'inline';
    submitBtn.disabled = true;
    errorEl.style.display = 'none';

    try {
      const response = await authApi.userLogin(username, password);

      if (response.data?.challenge === 'NEW_PASSWORD_REQUIRED') {
        authStore.setUser({ role: 'user', username, name: username });
        authStore.setChallenge(
          response.data.challenge,
          response.data.session,
          response.data.username || username
        );
        navigate('login/user/change-password');
      } else if (response.data?.access_token) {
        const payload = decodeJwt(response.data.access_token);
        console.log('JWT payload:', payload);

        const role = payload?.role || payload?.['custom:role'] || payload?.['cognito:groups']?.[0];
        console.log('Detected role:', role);

        if (role === 'admin') {
          throw new Error('Please use Admin Portal to login.');
        }

        const user = {
          role: 'user',
          username,
          name: payload?.name || username,
          email: payload?.email,
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
