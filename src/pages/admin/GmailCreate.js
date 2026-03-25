import { navigate } from '../../router.js';
import { botCredentialApi } from '../../api/botCredential.js';
import { botPoolApi } from '../../api/botPool.js';

export default function GmailCreatePage() {
  const container = document.createElement('div');
  container.className = 'page';
  container.id = 'p-gmail-create';

  container.innerHTML = `
    <div class="bc">
      <a href="#" class="nav-back" data-to="gmail">Gmail Credentials</a>
      <span class="sep">›</span>
      <span class="cur">Add Credential</span>
    </div>
    <div class="pg-hdr">
      <div>
        <h1>Add Gmail Credential</h1>
        <div class="pg-sub">Gmail account for project authentication</div>
      </div>
    </div>
    <div class="card" style="max-width:560px">
      <div class="card-body">
        <div id="error-msg" class="mb-4" style="display:none;padding:12px;background:var(--err-50);border-radius:8px;color:var(--err-700);font-size:14px"></div>
        
        <div class="form-g">
          <label class="form-l">Gmail Address <span class="req">*</span></label>
          <input class="form-i" type="email" id="email" placeholder="bot-name@company-agents.com">
        </div>
        <div class="form-g">
          <label class="form-l">Password <span class="req">*</span></label>
          <div class="form-pwd-wrap">
            <input class="form-i" type="password" id="password" placeholder="••••••••">
            <button class="pwd-toggle" id="pwd-toggle" type="button">👁</button>
          </div>
          <div class="form-h">🔒 Stored encrypted via AWS KMS. Never displayed after saving.</div>
        </div>
        <div class="form-g">
          <label class="form-l">Warm Pool Size</label>
          <input class="form-i" type="number" id="warm-pool-size" value="1" min="0" max="10" style="width:120px">
          <div class="form-h">Number of pre-started containers for faster meeting joins. Set to 0 to disable warm pool.</div>
        </div>
        <div class="flex gap-3 jc-end mt-6">
          <button class="btn btn-s btn-lg" id="cancel-btn">Cancel</button>
          <button class="btn btn-p btn-lg" id="save-btn">Save & Verify</button>
        </div>
      </div>
    </div>
  `;

  // Navigation
  container.querySelectorAll('.nav-back').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      navigate(link.dataset.to);
    });
  });

  container.querySelector('#cancel-btn').addEventListener('click', () => navigate('gmail'));

  // Password toggle
  container.querySelector('#pwd-toggle').addEventListener('click', () => {
    const input = container.querySelector('#password');
    const btn = container.querySelector('#pwd-toggle');
    if (input.type === 'password') {
      input.type = 'text';
      btn.textContent = '🙈';
    } else {
      input.type = 'password';
      btn.textContent = '👁';
    }
  });


  // Save handler
  container.querySelector('#save-btn').addEventListener('click', async () => {
    const email = container.querySelector('#email').value.trim();
    const password = container.querySelector('#password').value;
    const warmPoolSize = parseInt(container.querySelector('#warm-pool-size').value) || 0;
    const errorMsg = container.querySelector('#error-msg');
    const saveBtn = container.querySelector('#save-btn');

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

    try {
      // Create credential
      const response = await botCredentialApi.create({
        email,
        password,
        warm_pool_size: warmPoolSize,
      });

      const credentialId = response.data?.credential_id;

      // Auto start warm pool if size > 0
      if (warmPoolSize > 0 && credentialId) {
        try {
          await botPoolApi.start({
            credential_ids: [credentialId],
          });
        } catch (poolErr) {
          console.warn('Failed to start warm pool:', poolErr);
        }
      }

      navigate('gmail');
    } catch (err) {
      errorMsg.textContent = err.message || 'Failed to create credential';
      errorMsg.style.display = 'block';
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save & Verify';
    }
  });

  return container;
}
