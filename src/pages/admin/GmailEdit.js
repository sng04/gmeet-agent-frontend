import { navigate } from '../../router.js';

export default function GmailEditPage() {
  const el = document.createElement('div');
  el.className = 'page';

  el.innerHTML = `
    <div class="bc">
      <a href="#" class="nav-back" data-to="gmail">Gmail Credentials</a>
      <span class="sep">›</span>
      <span class="cur">Edit Credential</span>
    </div>
    <div class="pg-hdr">
      <div>
        <h1>Edit Gmail Credential</h1>
        <div class="pg-sub">techsales-bot@agents.company.com</div>
      </div>
    </div>
    <div class="card" style="max-width:560px">
      <div class="card-body">
        <div class="form-g">
          <label class="form-l">Gmail Address</label>
          <input class="form-i" value="techsales-bot@agents.company.com">
          <div class="form-h">Changing the address will require re-verification.</div>
        </div>
        <div class="form-g">
          <label class="form-l">New Password</label>
          <div class="form-pwd-wrap">
            <input class="form-i" type="password" id="gmail-pwd" placeholder="Leave blank to keep current password">
            <button class="pwd-toggle" id="pwd-toggle" type="button">👁</button>
          </div>
          <div class="form-h">🔒 Only fill if updating password. Stored encrypted, never shown.</div>
        </div>
        <div class="flex gap-3 jc-b mt-6">
          <button class="btn btn-d" id="remove-btn">Remove Credential</button>
          <div class="flex gap-3">
            <button class="btn btn-s btn-lg" id="cancel-btn">Cancel</button>
            <button class="btn btn-p btn-lg" id="save-btn">Save Changes</button>
          </div>
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

  return el;
}
