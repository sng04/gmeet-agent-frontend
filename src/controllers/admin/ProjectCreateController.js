import { loadTemplate } from '../../utils/template.js';
import { navigate } from '../../router.js';
import { Button } from '../../components/ui/Button.js';
import { Alert } from '../../components/ui/Alert.js';
import { showLoading, hideLoading } from '../../components/ui/Loading.js';
import { projectsApi } from '../../api/projects.js';
import { botCredentialApi } from '../../api/botCredential.js';

export default async function ProjectCreateController() {
  const el = await loadTemplate('/templates/admin/project-create.html', 'project-create');

  const alertContainer = el.querySelector('[data-bind="alertContainer"]');

  // Populate agent select with mock data (to be replaced later)
  const agentSelect = el.querySelector('[data-bind="agentSelect"]');
  const mockAgents = [
    { value: 'agent-1', label: 'TechSales Bot' },
    { value: 'agent-2', label: 'Demo Agent' },
    { value: 'agent-3', label: 'Support Agent' },
  ];
  mockAgents.forEach(a => {
    const opt = document.createElement('option');
    opt.value = a.value;
    opt.textContent = a.label;
    agentSelect.appendChild(opt);
  });

  // Load active gmail credentials
  const gmailSelect = el.querySelector('[data-bind="gmailSelect"]');
  try {
    const res = await botCredentialApi.list();
    const credentials = res.data?.items || [];
    // Filter only verified & active credentials
    const activeCredentials = credentials.filter(c => 
      c.verification_status === 'verified' && c.available_status === 'active'
    );
    activeCredentials.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.credential_id;
      opt.textContent = c.email;
      gmailSelect.appendChild(opt);
    });
  } catch (err) {
    console.error('Failed to load credentials:', err);
  }

  // Back link
  el.querySelector('[data-action="backLink"]').addEventListener('click', (e) => {
    e.preventDefault();
    navigate('projects');
  });

  // Form action buttons
  const actions = el.querySelector('[data-bind="formActions"]');
  
  const cancelBtn = Button({ text: 'Cancel', variant: 's', onClick: () => navigate('projects') });
  const submitBtn = Button({ text: 'Create Project', variant: 'p', onClick: handleSubmit });
  
  actions.appendChild(cancelBtn);
  actions.appendChild(submitBtn);

  async function handleSubmit() {
    // Clear previous alerts
    alertContainer.innerHTML = '';

    const name = el.querySelector('[name="name"]').value.trim();
    const description = el.querySelector('[name="description"]').value.trim();
    const agent_id = el.querySelector('[name="agent_id"]').value;
    const bot_credential_id = el.querySelector('[name="bot_credential_id"]').value;

    // Validation
    if (!name) {
      alertContainer.appendChild(Alert({ message: 'Project name is required', variant: 'err' }));
      return;
    }
    if (!bot_credential_id) {
      alertContainer.appendChild(Alert({ message: 'Gmail Credential is required', variant: 'err' }));
      return;
    }

    // Build payload (bot_credential_id not supported in create, will update after)
    // Email is required by API, using mock value
    const payload = { name, email: 'project@company.com' };
    if (description) payload.description = description;
    if (agent_id) payload.agent_id = agent_id;

    showLoading('Creating project...');

    try {
      const res = await projectsApi.create(payload);
      const projectId = res.data?.project_id;
      
      if (!projectId) {
        throw new Error('Project created but no ID returned');
      }

      // If bot_credential_id selected, assign it via update
      if (bot_credential_id) {
        try {
          await projectsApi.update(projectId, { bot_credential_id });
        } catch (updateErr) {
          console.warn('Failed to assign gmail credential:', updateErr);
        }
      }

      hideLoading();
      navigate('projects');
    } catch (err) {
      hideLoading();
      alertContainer.appendChild(Alert({ message: err.message || 'Failed to create project', variant: 'err' }));
    }
  }

  return el;
}
