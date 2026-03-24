import { Button } from '../../components/ui/Button.js';
import { navigate } from '../../router.js';

export default function ProjectEditPage() {
  const el = document.createElement('div');
  el.className = 'page';

  el.innerHTML = `
    <div class="bc">
      <a href="#" class="nav-back" data-to="projects">Projects</a>
      <span class="sep">›</span>
      <a href="#" class="nav-back" data-to="project-detail">Acme Corp Sales</a>
      <span class="sep">›</span>
      <span class="cur">Edit</span>
    </div>
    <div class="pg-hdr">
      <div>
        <h1>Edit Project</h1>
        <div class="pg-sub">Acme Corp Sales</div>
      </div>
    </div>
    <div class="card" style="max-width:680px">
      <div class="card-body">
        <div class="form-g">
          <label class="form-l">Project Name <span class="req">*</span></label>
          <input class="form-i" value="Acme Corp Sales">
        </div>
        <div class="form-g">
          <label class="form-l">Description</label>
          <textarea class="form-ta">Enterprise sales meetings with Acme Corp technical team</textarea>
        </div>
        <div class="form-g">
          <label class="form-l">Default Agent</label>
          <select class="form-sel">
            <option selected>TechSales Bot</option>
            <option>Demo Agent</option>
            <option>Support Agent</option>
          </select>
        </div>
        <div class="form-g">
          <label class="form-l">Gmail Credential</label>
          <select class="form-sel">
            <option selected>techsales-bot@agents.company.com</option>
            <option>demo-bot@agents.company.com</option>
            <option>support-bot@agents.company.com</option>
          </select>
          <div class="form-h">The Gmail account this project uses to join Google Meet sessions.</div>
        </div>
        <div class="form-g">
          <label class="form-l">KB Prefix / Tag</label>
          <input class="form-i" value="acme-corp">
          <div class="form-h">Changing this will require re-indexing all documents.</div>
        </div>
        <div class="divider"></div>
        <div class="flex gap-3 jc-b mt-6">
          <button class="btn btn-d" id="archive-btn">Archive Project</button>
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

  el.querySelector('#cancel-btn').addEventListener('click', () => navigate('project-detail'));
  el.querySelector('#save-btn').addEventListener('click', () => navigate('project-detail'));

  return el;
}
