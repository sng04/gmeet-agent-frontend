import { loadTemplate } from '../../utils/template.js';
import { navigate } from '../../router.js';
import { botCredentialApi } from '../../api/botCredential.js';
import { botPoolApi } from '../../api/botPool.js';
import { showLoading, hideLoading } from '../../components/ui/Loading.js';

export default async function GmailCreateController(params) {
  const el = await loadTemplate('/templates/admin/gmail-create.html', 'gmail-create');

  // Breadcrumb nav-back
  el.querySelectorAll('[data-action="navBack"]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      navigate(link.dataset.to);
    });
  });

  // Cancel
  el.querySelector('[data-action="cancel"]').addEventListener('click', () => navigate('gmail'));

  // Password toggle
  el.querySelector('[data-action="pwdToggle"]').addEventListener('click', () => {
    const input = el.querySelector('[data-bind="password"]');
    const btn = el.querySelector('[data-action="pwdToggle"]');
    if (input.type === 'password') {
      input.type = 'text';
      btn.textContent = '🙈';
    } else {
      input.type = 'password';
      btn.textContent = '👁';
    }
  });

  // Save handler
  el.querySelector('[data-action="save"]').addEventListener('click', async () => {
    const email = el.querySelector('[data-bind="email"]').value.trim();
    const password = el.querySelector('[data-bind="password"]').value;
    const warmPoolSize = parseInt(el.querySelector('[data-bind="warmPoolSize"]').value) || 0;
    const errorMsg = el.querySelector('[data-bind="errorMsg"]');
    const saveBtn = el.querySelector('[data-action="save"]');

    // Validation
    if (!email) {
      errorMsg.textContent = 'Email is required';
      errorMsg.style.display = 'block';
      return;
    }
    if (!password) {
      errorMsg.textContent = 'Password is required';
      errorMsg.style.display = 'block';
      return;
    }

    errorMsg.style.display = 'none';
    saveBtn.disabled = true;
    saveBtn.textContent = 'Creating...';
    showLoading('Creating credential...');

    try {
      const response = await botCredentialApi.create({
        email,
        password,
        warm_pool_size: warmPoolSize,
      });

      // Langsung trigger start warm pool
      const credentialId = response.data?.credential_id;
      if (credentialId && warmPoolSize > 0) {
        try {
          await botPoolApi.start({ credential_ids: [credentialId] });
        } catch (poolErr) {
          console.warn('Failed to start warm pool:', poolErr);
        }
      }

      hideLoading();
      navigate('gmail');
    } catch (err) {
      hideLoading();
      errorMsg.textContent = err.message || 'Failed to create credential';
      errorMsg.style.display = 'block';
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save & Verify';
    }
  });

  return el;
}
