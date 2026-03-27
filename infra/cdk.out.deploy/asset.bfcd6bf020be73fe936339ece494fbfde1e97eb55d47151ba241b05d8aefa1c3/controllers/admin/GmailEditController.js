import { loadTemplate } from '../../utils/template.js';
import { navigate } from '../../router.js';
import { botCredentialApi } from '../../api/botCredential.js';
import { botPoolApi } from '../../api/botPool.js';
import { Toggle, setToggleValue } from '../../components/ui/Toggle.js';

export default async function GmailEditController(params) {
  // Get credential ID from URL
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

  // Breadcrumb nav-back
  el.querySelectorAll('[data-action="navBack"]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      navigate(link.dataset.to);
    });
  });

  // Cancel
  el.querySelector('[data-action="cancel"]').addEventListener('click', () => navigate('gmail'));

  // Add status toggle
  const statusToggle = Toggle({
    id: 'available-status',
    checked: false,
    label: 'Inactive',
    onChange: (checked, labelEl) => {
      if (labelEl) labelEl.textContent = checked ? 'Active' : 'Inactive';
    }
  });
  el.querySelector('[data-bind="statusToggle"]').appendChild(statusToggle);

  // Load credential data
  async function loadCredential() {
    try {
      const response = await botCredentialApi.get(credentialId);
      credential = response.data;

      el.querySelector('[data-bind="emailDisplay"]').textContent = credential.email;
      el.querySelector('[data-bind="email"]').value = credential.email;
      el.querySelector('[data-bind="warmPoolSize"]').value = credential.warm_pool_size || 0;

      // Set status toggle
      const isActive = credential.available_status === 'active';
      setToggleValue(el, 'available-status', isActive, isActive ? 'Active' : 'Inactive');

      // Get pool status
      const poolStatus = credential.warm_pool_status;
      if (poolStatus) {
        el.querySelector('[data-bind="poolStatus"]').innerHTML = `
          <span style="color:var(--ok-500)">${poolStatus.idle || 0} idle</span> / 
          <span style="color:var(--warn-500)">${poolStatus.busy || 0} busy</span> / 
          <span>${poolStatus.total || 0} total</span>
        `;
      } else {
        el.querySelector('[data-bind="poolStatus"]').textContent = 'No pool data available';
      }
    } catch (err) {
      el.querySelector('[data-bind="errorMsg"]').textContent = `Failed to load credential: ${err.message}`;
      el.querySelector('[data-bind="errorMsg"]').style.display = 'block';
    }
  }

  // Save handler
  el.querySelector('[data-action="save"]').addEventListener('click', async () => {
    const newWarmPoolSize = parseInt(el.querySelector('[data-bind="warmPoolSize"]').value) || 0;
    const newAvailableStatus = el.querySelector('#available-status').checked ? 'active' : 'inactive';
    const errorMsg = el.querySelector('[data-bind="errorMsg"]');
    const successMsg = el.querySelector('[data-bind="successMsg"]');
    const saveBtn = el.querySelector('[data-action="save"]');

    errorMsg.style.display = 'none';
    successMsg.style.display = 'none';

    // Validate: cannot reduce pool size below busy count
    const poolStatus = credential.warm_pool_status || {};
    const busyCount = poolStatus.busy || 0;

    if (newWarmPoolSize < busyCount) {
      errorMsg.textContent = `Cannot reduce pool size to ${newWarmPoolSize}. There are ${busyCount} container(s) currently busy. Wait until they finish or set pool size to at least ${busyCount}.`;
      errorMsg.style.display = 'block';
      return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    try {
      // Update credential
      await botCredentialApi.update(credentialId, {
        warm_pool_size: newWarmPoolSize,
        available_status: newAvailableStatus,
      });

      // Adjust pool based on size change
      const oldWarmPoolSize = credential.warm_pool_size || 0;

      if (newWarmPoolSize > oldWarmPoolSize) {
        // Need to start more containers
        try {
          await botPoolApi.start({
            credential_ids: [credentialId],
          });
          successMsg.textContent = `Credential updated. Starting warm pool containers...`;
        } catch (poolErr) {
          successMsg.textContent = `Credential updated, but failed to start pool: ${poolErr.message}`;
        }
      } else if (newWarmPoolSize < oldWarmPoolSize && newWarmPoolSize >= 0) {
        // Need to stop some containers
        try {
          await botPoolApi.stop({
            credential_id: credentialId,
            target_count: newWarmPoolSize,
          });
          successMsg.textContent = `Credential updated. Scaling down pool to ${newWarmPoolSize} container(s)...`;
        } catch (poolErr) {
          successMsg.textContent = `Credential updated, but failed to stop pool: ${poolErr.message}`;
        }
      } else {
        successMsg.textContent = 'Credential updated successfully.';
      }

      successMsg.style.display = 'block';

      // Reload to show updated status
      setTimeout(() => {
        loadCredential();
      }, 2000);

    } catch (err) {
      errorMsg.textContent = err.message || 'Failed to update credential';
      errorMsg.style.display = 'block';
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Changes';
    }
  });

  await loadCredential();

  return el;
}
