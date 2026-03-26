import { loadTemplate } from '../../utils/template.js';
import { navigate } from '../../router.js';
import { botCredentialApi } from '../../api/botCredential.js';
import { botPoolApi } from '../../api/botPool.js';
import { getVerificationBadge } from '../../components/ui/Badge.js';

export default async function GmailEditController() {
  const urlParams = new URLSearchParams(window.location.search);
  const credentialId = urlParams.get('id');

  if (!credentialId) {
    const container = document.createElement('div');
    container.className = 'page';
    container.innerHTML = `
      <div class="card">
        <div class="card-body text-center text-t">
          No credential ID provided. <a href="#" onclick="navigate('gmail')">Go back</a>
        </div>
      </div>
    `;
    return container;
  }

  const el = await loadTemplate('/templates/admin/gmail-edit.html', 'gmail-edit');

  let credential = null;
  const saveBtn = el.querySelector('[data-action="save"]');
  
  // Disable save button while loading
  saveBtn.disabled = true;

  // Breadcrumb nav-back
  el.querySelectorAll('[data-action="navBack"]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      navigate(link.dataset.to);
    });
  });

  // Cancel
  el.querySelector('[data-action="cancel"]').addEventListener('click', () => navigate('gmail'));

  // Password toggle (for retry form)
  const pwdToggle = el.querySelector('[data-action="pwdToggle"]');
  if (pwdToggle) {
    pwdToggle.addEventListener('click', () => {
      const input = el.querySelector('[data-bind="password"]');
      if (input.type === 'password') {
        input.type = 'text';
        pwdToggle.textContent = '🙈';
      } else {
        input.type = 'password';
        pwdToggle.textContent = '👁';
      }
    });
  }



  // Render form based on verification status
  function renderForm() {
    const formContainer = el.querySelector('[data-bind="formFields"]');
    const isVerified = credential.verification_status === 'verified';
    
    // Enable save button after loading
    saveBtn.disabled = false;

    if (isVerified) {
      // Verified: only warm_pool_size editable
      formContainer.innerHTML = `
        <div class="form-g">
          <label class="form-l">Gmail Address</label>
          <input class="form-i" type="email" value="${credential.email}" disabled style="background:var(--gray-50)">
          <div class="form-h">Email cannot be changed for verified credentials.</div>
        </div>
        <div class="form-g">
          <label class="form-l">Verification Status</label>
          <div>${getVerificationBadge(credential.verification_status)} <span class="text-ok text-sm ml-2">Active</span></div>
        </div>
        <div class="form-g">
          <label class="form-l">Warm Pool Size</label>
          <input class="form-i" type="number" data-bind="warmPoolSize" value="${credential.warm_pool_size || 0}" min="0" max="10" style="width:120px">
          <div class="form-h">Number of pre-started containers. Changing this will automatically adjust the pool.</div>
        </div>
        <div class="form-g">
          <label class="form-l">Current Pool Status</label>
          <div data-bind="poolStatus" class="text-sm text-t">Loading...</div>
        </div>
      `;
      saveBtn.textContent = 'Save Changes';
      updatePoolStatus();
    } else {
      // Failed or validating: email + password editable for retry
      const errorMsg = credential.verification_error || 'Invalid email or password';
      formContainer.innerHTML = `
        <div class="verify-status verify-failed mb-4">
          <span class="verify-icon">✗</span>
          <div>
            <div class="verify-title">Verification Failed</div>
            <div class="verify-desc">${errorMsg}</div>
          </div>
        </div>
        <div class="form-g">
          <label class="form-l">Gmail Address <span class="req">*</span></label>
          <input class="form-i" type="email" data-bind="email" value="${credential.email}">
          <div class="form-h">Update email if needed.</div>
        </div>
        <div class="form-g">
          <label class="form-l">Password <span class="req">*</span></label>
          <div class="form-pwd-wrap">
            <input class="form-i" type="password" data-bind="password" placeholder="Enter new password">
            <button class="pwd-toggle" data-action="pwdToggle" type="button">👁</button>
          </div>
          <div class="form-h">🔒 Enter the correct password to retry verification.</div>
        </div>
        <div class="form-g">
          <label class="form-l">Warm Pool Size</label>
          <input class="form-i" type="number" data-bind="warmPoolSize" value="${credential.warm_pool_size || 0}" min="0" max="10" style="width:120px">
          <div class="form-h">Pool will start after successful verification.</div>
        </div>
      `;
      saveBtn.textContent = 'Retry Verification';

      // Re-attach password toggle
      const newPwdToggle = formContainer.querySelector('[data-action="pwdToggle"]');
      if (newPwdToggle) {
        newPwdToggle.addEventListener('click', () => {
          const input = formContainer.querySelector('[data-bind="password"]');
          if (input.type === 'password') {
            input.type = 'text';
            newPwdToggle.textContent = '🙈';
          } else {
            input.type = 'password';
            newPwdToggle.textContent = '👁';
          }
        });
      }
    }
  }

  function updatePoolStatus() {
    const poolStatus = credential.warm_pool_status;
    const poolStatusEl = el.querySelector('[data-bind="poolStatus"]');
    if (poolStatusEl && poolStatus) {
      poolStatusEl.innerHTML = `
        <span style="color:var(--ok-500)">${poolStatus.idle || 0} idle</span> / 
        <span style="color:var(--warn-500)">${poolStatus.busy || 0} busy</span> / 
        <span>${poolStatus.total || 0} total</span>
      `;
    } else if (poolStatusEl) {
      poolStatusEl.textContent = 'No pool data available';
    }
  }

  async function loadCredential() {
    const cardLoading = el.querySelector('[data-bind="cardLoading"]');
    const cardContent = el.querySelector('[data-bind="cardContent"]');
    
    try {
      const response = await botCredentialApi.get(credentialId);
      credential = response.data;

      el.querySelector('[data-bind="emailDisplay"]').textContent = credential.email;
      renderForm();
      
      // Hide loading, show content
      cardLoading.style.display = 'none';
      cardContent.style.display = 'block';
    } catch (err) {
      cardLoading.querySelector('.card-body').innerHTML = `
        <div class="empty">
          <div class="empty-icon">⚠️</div>
          <div class="empty-title">Failed to load credential</div>
          <div class="empty-desc">${err.message}</div>
        </div>
      `;
    }
  }

  // Save handler
  el.querySelector('[data-action="save"]').addEventListener('click', async () => {
    const errorMsg = el.querySelector('[data-bind="errorMsg"]');
    const successMsg = el.querySelector('[data-bind="successMsg"]');

    errorMsg.style.display = 'none';
    successMsg.style.display = 'none';

    const isVerified = credential.verification_status === 'verified';
    const newWarmPoolSize = parseInt(el.querySelector('[data-bind="warmPoolSize"]').value) || 0;

    saveBtn.disabled = true;

    if (isVerified) {
      // Only update warm_pool_size
      saveBtn.textContent = 'Saving...';

      // Validate: cannot reduce below busy count
      const poolStatus = credential.warm_pool_status || {};
      const busyCount = poolStatus.busy || 0;
      if (newWarmPoolSize < busyCount) {
        errorMsg.textContent = `Cannot reduce pool size to ${newWarmPoolSize}. There are ${busyCount} container(s) currently busy.`;
        errorMsg.style.display = 'block';
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Changes';
        return;
      }

      try {
        await botCredentialApi.update(credentialId, { warm_pool_size: newWarmPoolSize });

        const oldWarmPoolSize = credential.warm_pool_size || 0;
        if (newWarmPoolSize > oldWarmPoolSize) {
          await botPoolApi.start({ credential_ids: [credentialId] });
          successMsg.textContent = 'Pool size updated. Starting additional containers...';
        } else if (newWarmPoolSize < oldWarmPoolSize) {
          await botPoolApi.stop({ credential_id: credentialId, target_count: newWarmPoolSize });
          successMsg.textContent = `Pool size updated. Scaling down to ${newWarmPoolSize} container(s)...`;
        } else {
          successMsg.textContent = 'Settings saved successfully.';
        }

        successMsg.style.display = 'block';
        setTimeout(() => loadCredential(), 2000);
      } catch (err) {
        errorMsg.textContent = err.message || 'Failed to update';
        errorMsg.style.display = 'block';
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Changes';
      }
    } else {
      // Retry verification: update email/password
      const emailInput = el.querySelector('[data-bind="email"]');
      const passwordInput = el.querySelector('[data-bind="password"]');
      const newEmail = emailInput?.value.trim();
      const newPassword = passwordInput?.value;

      if (!newEmail) {
        errorMsg.textContent = 'Email is required';
        errorMsg.style.display = 'block';
        saveBtn.disabled = false;
        return;
      }
      if (!newPassword) {
        errorMsg.textContent = 'Password is required for retry';
        errorMsg.style.display = 'block';
        saveBtn.disabled = false;
        return;
      }

      saveBtn.textContent = 'Verifying...';

      try {
        await botCredentialApi.update(credentialId, {
          email: newEmail,
          password: newPassword,
          warm_pool_size: newWarmPoolSize,
        });

        // Langsung ke list, polling akan dilakukan di sana
        navigate('gmail');
      } catch (err) {
        errorMsg.textContent = err.message || 'Failed to update';
        errorMsg.style.display = 'block';
        saveBtn.disabled = false;
        saveBtn.textContent = 'Retry Verification';
      }
    }
  });

  // Load data after render (non-blocking)
  loadCredential();

  return el;
}
