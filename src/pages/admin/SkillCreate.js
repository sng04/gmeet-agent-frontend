import { navigate } from '../../router.js';

export default function SkillCreatePage() {
  const el = document.createElement('div');
  el.className = 'page';

  el.innerHTML = `
    <div class="bc">
      <a href="#" class="nav-back" data-to="skills">Skills</a>
      <span class="sep">›</span>
      <span class="cur">New Skill Bucket</span>
    </div>
    <div class="pg-hdr">
      <div>
        <h1>Create Skill Bucket</h1>
        <div class="pg-sub">Define a new skill bucket with a prefix — then upload skill instruction files into it</div>
      </div>
    </div>
    <div class="card" style="max-width:680px">
      <div class="card-body">
        <div class="form-g">
          <label class="form-l">Bucket Name <span class="req">*</span></label>
          <input class="form-i" placeholder="e.g. Sales Skills">
        </div>
        <div class="form-g">
          <label class="form-l">Skill Type <span class="req">*</span></label>
          <select class="form-sel">
            <option value="">Select type...</option>
            <option>real-time</option>
            <option>post-session</option>
          </select>
          <div class="form-h">Real-time buckets are injected during the session. Post-session buckets trigger after the session ends.</div>
        </div>
        <div class="form-g">
          <label class="form-l">Description</label>
          <textarea class="form-ta" rows="3" placeholder="Briefly describe what kind of skills will go in this bucket..."></textarea>
        </div>
        <div class="flex gap-3 jc-end mt-6">
          <button class="btn btn-s btn-lg" id="cancel-btn">Cancel</button>
          <button class="btn btn-p btn-lg" id="create-btn">Create Bucket</button>
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

  el.querySelector('#cancel-btn').addEventListener('click', () => navigate('skills'));
  el.querySelector('#create-btn').addEventListener('click', () => navigate('skills'));

  return el;
}
