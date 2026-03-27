import { loadTemplate } from '../../utils/template.js';
import { navigate } from '../../router.js';
import { agentsApi } from '../../api/agents.js';
import { personalitiesApi } from '../../api/personalities.js';
import { Alert } from '../../components/ui/Alert.js';

export default async function AgentEditController(params) {
  const el = await loadTemplate('/templates/admin/agent-edit.html', 'agent-edit');

  const urlParams = new URLSearchParams(window.location.search);
  const agentId = params?.id || urlParams.get('id');
  const loadingEl = el.querySelector('[data-bind="loading"]');
  const contentEl = el.querySelector('[data-bind="content"]');
  const errorContainer = el.querySelector('[data-bind="formError"]');

  el.querySelectorAll('[data-action="navBack"]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const to = link.dataset.to;
      if (to === 'agent-detail' && agentId) navigate(`agents/${agentId}`);
      else navigate(to);
    });
  });

  if (!agentId) {
    loadingEl.style.display = 'none';
    errorContainer.style.display = '';
    errorContainer.appendChild(Alert({ message: 'No agent ID provided.', variant: 'error', icon: '⚠️' }));
    return el;
  }

  loadingEl.style.display = '';

  try {
    const [agentRes, persRes] = await Promise.all([
      agentsApi.get(agentId),
      personalitiesApi.list(),
    ]);
    const agent = agentRes.data?.agent || agentRes.data;
    const personalities = persRes.data?.personalities || persRes.data || [];

    loadingEl.style.display = 'none';
    contentEl.style.display = '';

    // Breadcrumb + subtitle
    const bcLink = el.querySelector('[data-bind="bcAgentLink"]');
    bcLink.textContent = agent.agent_name;
    el.querySelector('[data-bind="editSubtitle"]').textContent = agent.agent_name;

    // Populate personality dropdown
    const pSelect = el.querySelector('[data-bind="personalitySelect"]');
    pSelect.innerHTML = '<option value="">Select personality...</option>';
    personalities.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.personality_id;
      opt.textContent = p.personality_name;
      if (p.personality_id === agent.personality_id) opt.selected = true;
      pSelect.appendChild(opt);
    });

    // Populate form fields
    const form = el.querySelector('#agent-form');
    form.querySelector('[name="agent_name"]').value = agent.agent_name || '';
    form.querySelector('[name="role_prompt"]').value = agent.role_prompt || '';
    form.querySelector('[name="behavior_guidelines"]').value = agent.behavior_guidelines || agent.task_prompt || '';

    // Live preview
    const roleInput = form.querySelector('[name="role_prompt"]');
    const preview = el.querySelector('[data-bind="rolePreview"]');
    preview.textContent = roleInput.value || '';
    roleInput.addEventListener('input', () => { preview.textContent = roleInput.value; });

    // Cancel
    el.querySelector('[data-action="cancel"]').addEventListener('click', () => navigate(`agents/${agentId}`));

    // Save
    el.querySelector('[data-action="save"]').addEventListener('click', async () => {
      const data = Object.fromEntries(new FormData(form));
      if (!data.agent_name || !data.role_prompt || !data.behavior_guidelines || !data.personality_id) {
        errorContainer.style.display = '';
        errorContainer.innerHTML = '';
        errorContainer.appendChild(Alert({ message: 'Please fill in all required fields.', variant: 'error', icon: '⚠️' }));
        return;
      }
      // Hardcode backend-managed fields
      data.use_case = 'general';
      data.model_id = 'amazon.nova-pro-v1:0';
      const btn = el.querySelector('[data-action="save"]');
      btn.disabled = true; btn.textContent = 'Saving...';
      errorContainer.style.display = 'none';
      try {
        await agentsApi.update(agentId, data);
        navigate(`agents/${agentId}`);
      } catch (err) {
        errorContainer.style.display = '';
        errorContainer.innerHTML = '';
        errorContainer.appendChild(Alert({ message: err.message, variant: 'error', icon: '⚠️' }));
      } finally { btn.disabled = false; btn.textContent = 'Save Changes'; }
    });

  } catch (err) {
    loadingEl.style.display = 'none';
    errorContainer.style.display = '';
    errorContainer.appendChild(Alert({ message: `Failed to load agent: ${err.message}`, variant: 'error', icon: '⚠️' }));
  }

  return el;
}
