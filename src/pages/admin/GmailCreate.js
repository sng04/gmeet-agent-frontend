import { navigate } from '../../router.js';

export default function GmailCreatePage() {
  const el = document.createElement('div');
  el.className = 'page';

  el.innerHTML = `
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
        <div class="form-g">
          <label class="form-l">Gmail Address <span class="req">*</span></label>
          <input class="form-i" type="email" placeholder="bot-name@company-agents.com">
        </div>
        <div class="form-g">
          <label class="form-l">Password <span class="req">*</span></label>
          <div class="form-pwd-wrap">
            <input class="form-i" type="password" id="gmail-pwd" placeholder="••••••••">
            <button class="pwd-toggle" id="pwd-toggle" type="button">👁</button>
          </div>
          <div class="form-h">🔒 Stored encrypted via AWS KMS. Never displayed after saving.</div>
        </div>
        <div class="form-g">
          <label class="form-l">Confirm Password <span class="req">*</span></label>
          <div class="form-pwd-wrap">
            <input class="form-i" type="password" id="gmail-pwd2" placeholder="••••••••">
            <button class="pwd-toggle" id="pwd-toggle2" type="button">👁</button>
          </div>
        </div>
        <div class="flex gap-3 jc-end mt-6">
          <button class="btn btn-s btn-lg" id="cancel-btn">Cancel</button>
          <button class="btn btn-p btn-lg" id="save-btn">Save & Verify</button>
        </div>
      </div>
    </div>
  `;

  el.querySelectorAll('.nav-back').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      navigate(link.dataset.to);
    });
  });

  el.querySelector('#cancel-btn').addEventListener('click', () => navigate('gmail'));
  el.querySelector('#save-btn').addEventListener('click', () => navigate('gmail'));

  // Password toggle
  el.querySelector('#pwd-toggle').addEventListener('click', () => {
    const input = el.querySelector('#gmail-pwd');
    const btn = el.querySelector('#pwd-toggle');
    if (input.type === 'password') {
      input.type = 'text';
      btn.textContent = '🙈';
    } else {
      input.type = 'password';
      btn.textContent = '👁';
    }
  });

  el.querySelector('#pwd-toggle2').addEventListener('click', () => {
    const input = el.querySelector('#gmail-pwd2');
    const btn = el.querySelector('#pwd-toggle2');
    if (input.type === 'password') {
      input.type = 'text';
      btn.textContent = '🙈';
    } else {
      input.type = 'password';
      btn.textContent = '👁';
    }
  });

  return el;
}
