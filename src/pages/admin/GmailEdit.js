import { navigate } from '../../router.js';
import { botCredentialApi } from '../../api/botCredential.js';
import { botPoolApi } from '../../api/botPool.js';
import { Toggle, setToggleValue } from '../../components/ui/Toggle.js';

export default async function GmailEditPage() {
  const container = document.createElement('div');
  container.className = 'page';
  container.id = 'p-gmail-edit';

  // Get credential ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  const credentialId = urlParams.get('id');

  if (!credentialId) {
    container.innerHTML = `
      <div class="card">
        <div class="card-body text-center text-t">
          No credential ID provided. <a href="#" onclick="navigate('gmail')">Go back</a>
        </div>
      </div>
    `;
    return container;
  }

  container.innerHTML = `
    <div class="bc">
      <a href="#" class="nav-back" data-to="gmail">Gmail Credentials</a>
      <span class="sep">›</span>
      <span class="cur">Edit Credential</span>
    </div>
    <div class="pg-hdr">
      <div>
        <h1>Edit Gmail Credential</h1>
        <div class="pg-sub" id="email-display">Loading...</div>
      </div>
    </div>
    <div class="card" style="max-width:560px">
      <div class="card-body">
        <div id="error-msg" class="mb-4" style="display:none;padding:12px;background:var(--err-50);border-radius:8px;color:var(--err-700);font-size:14px"></div>
        <div id="success-msg" class="mb-4" style="display:none;padding:12px;background:var(--ok-50);border-radius:8px;color:var(--ok-700);font-size:14px"></div>
        
        <div class="form-g">
          <label class="form-l">Gmail Address</label>
          <input class="form-i" type="email" id="email" disabled style="background:var(--gray-50)">
          <div class="form-h">Email address cannot be changed.</div>
        </div>
        <div class="form-g">
          <label class="form-l">Status</label>
          <div id="status-toggle"></div>
          <div class="form-h">Enable or disable this credential for use in meetings.</div>
        </div>
        <div class="form-g">
          <label class="form-l">Warm Pool Size</label>
          <input class="form-i" type="number" id="warm-pool-size" value="1" min="0" max="10" style="width:120px">
          <div class="form-h">Number of pre-started containers. Changing this will automatically adjust the pool.</div>
        </div>
        <div class="form-g">
          <label class="form-l">Current Pool Status</label>
          <div id="pool-status" class="text-sm text-t">Loading...</div>
        </div>
        <div class="flex gap-3 jc-end mt-6">
          <button class="btn btn-s btn-lg" id="cancel-btn">Cancel</button>
          <button class="btn btn-p btn-lg" id="save-btn">Save Changes</button>
        </div>
      </div>
    </div>
  `;

  let credential = null;

  // Navigation
  container.querySelectorAll('.nav-back').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      navigate(link.dataset.to);
    });
  });

  container.querySelector('#cancel-btn').addEventListener('click', () => navigate('gmail'));

  // Add status toggle
  const statusToggle = Toggle({
    id: 'available-status',
    checked: false,
    label: 'Inactive',
    onChange: (checked, labelEl) => {
      if (labelEl) labelEl.textContent = checked ? 'Active' : 'Inactive';
    }
  });
  container.querySelector('#status-toggle').appendChild(statusToggle);

  // Load credential data
  async function loadCredential() {
    try {
      const response = await botCredentialApi.get(credentialId);
      credential = response.data;
      
      container.querySelector('#email-display').textContent = credential.email;
      container.querySelector('#email').value = credential.email;
      container.querySelector('#warm-pool-size').value = credential.warm_pool_size || 0;
      
      // Set status toggle
      const isActive = credential.available_status === 'active';
      setToggleValue(container, 'available-status', isActive, isActive ? 'Active' : 'Inactive');

      // Get pool status
      const poolStatus = credential.warm_pool_status;
      if (poolStatus) {
        container.querySelector('#pool-status').innerHTML = `
          <span style="color:var(--ok-500)">${poolStatus.idle || 0} idle</span> / 
          <span style="color:var(--warn-500)">${poolStatus.busy || 0} busy</span> / 
          <span>${poolStatus.total || 0} total</span>
        `;
      } else {
        container.querySelector('#pool-status').textContent = 'No pool data available';
      }
    } catch (err) {
      container.querySelector('#error-msg').textContent = `Failed to load credential: ${err.message}`;
      container.querySelector('#error-msg').style.display = 'block';
    }
  }

  // Save handler
  container.querySelector('#save-btn').addEventListener('click', async () => {
    const newWarmPoolSize = parseInt(container.querySelector('#warm-pool-size').value) || 0;
    const newAvailableStatus = container.querySelector('#available-status').checked ? 'active' : 'inactive';
    const errorMsg = container.querySelector('#error-msg');
    const successMsg = container.querySelector('#success-msg');
    const saveBtn = container.querySelector('#save-btn');

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

  return container;
}
