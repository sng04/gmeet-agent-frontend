import { Button } from '../../components/ui/Button.js';
import { navigate } from '../../router.js';

export default function ProjectCreatePage() {
  const el = document.createElement('div');
  el.className = 'page';

  el.innerHTML = `
    <div class="bc">
      <a href="#" id="back-link">Projects</a>
      <span class="sep">›</span>
      <span class="cur">New Project</span>
    </div>
    <div class="pg-hdr">
      <div>
        <h1>Create New Project</h1>
        <div class="pg-sub">Set up a new project with agent and knowledge base configuration</div>
      </div>
    </div>
    <div class="card" style="max-width:680px">
      <div class="card-body">
        <div class="form-g">
          <label class="form-l">Project Name <span class="req">*</span></label>
          <input class="form-i" name="name" placeholder="e.g. Acme Corp Sales">
        </div>
        <div class="form-g">
          <label class="form-l">Description</label>
          <textarea class="form-ta" name="description" placeholder="Brief description of the project scope and purpose..."></textarea>
        </div>
        <div class="form-g">
          <label class="form-l">Default Agent <span class="req">*</span></label>
          <select class="form-sel" name="agent">
            <option value="">Select agent...</option>
            <option value="1">TechSales Bot</option>
            <option value="2">Demo Agent</option>
            <option value="3">Support Agent</option>
          </select>
          <div class="form-h">The agent that will be used by default for sessions in this project.</div>
        </div>
        <div class="form-g">
          <label class="form-l">Gmail Credential</label>
          <select class="form-sel" name="gmail">
            <option value="">Select credential...</option>
            <option value="1">techsales-bot@agents.company.com</option>
            <option value="2">demo-bot@agents.company.com</option>
            <option value="3">support-bot@agents.company.com</option>
          </select>
          <div class="form-h">The Gmail account this project uses to join Google Meet sessions.</div>
        </div>
        <div class="divider"></div>
        <div class="form-g">
          <label class="form-l">Assign Initial Users</label>
          <input class="form-i" name="users" placeholder="user@company.com, another@company.com">
          <div class="form-h">Comma-separated emails. Users will receive an invite if they don't have an account.</div>
        </div>
        <div class="flex gap-3 mt-6 jc-end" id="form-actions"></div>
      </div>
    </div>
  `;

  el.querySelector('#back-link').addEventListener('click', (e) => {
    e.preventDefault();
    navigate('projects');
  });

  const actions = el.querySelector('#form-actions');
  actions.appendChild(Button({ text: 'Cancel', variant: 's', size: 'lg', onClick: () => navigate('projects') }));
  actions.appendChild(Button({ text: 'Create Project →', variant: 'p', size: 'lg', onClick: () => {
    navigate('project-detail');
  }}));

  return el;
}
