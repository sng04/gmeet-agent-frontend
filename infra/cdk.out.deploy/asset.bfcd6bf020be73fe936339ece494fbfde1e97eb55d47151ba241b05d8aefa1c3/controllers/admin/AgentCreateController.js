import { loadTemplate } from '../../utils/template.js';
import { navigate } from '../../router.js';
import { agentsApi } from '../../api/agents.js';
import { personalitiesApi } from '../../api/personalities.js';
import { Alert } from '../../components/ui/Alert.js';

export default async function AgentCreateController(params) {
  const el = await loadTemplate('/templates/admin/agent-create.html', 'agent-create');

  // Breadcrumb
  el.querySelectorAll('[data-action="navBack"]').forEach(link => {
    link.addEventListener('click', (e) => { e.preventDefault(); navigate(link.dataset.to); });
  });

  // Load personalities into dropdown
  const personalitySelect = el.querySelector('[data-bind="personalitySelect"]');
  try {
    const res = await personalitiesApi.list();
    const personalities = res.data?.personalities || res.data || [];
    personalitySelect.innerHTML = '<option value="">Select personality...</option>';
    personalities.forEach(p => {
      personalitySelect.innerHTML += `<option value="${p.personality_id}">${p.personality_name}</option>`;
    });
  } catch {
    personalitySelect.innerHTML = '<option value="">Failed to load</option>';
  }

  // Live preview of role prompt
  const roleInput = el.querySelector('textarea[name="role_prompt"]');
  const preview = el.querySelector('[data-bind="rolePreview"]');
  roleInput.addEventListener('input', () => {
    preview.textContent = roleInput.value || 'Enter a role prompt to preview...';
  });

  const errorContainer = el.querySelector('[data-bind="formError"]');

  function showError(msg) {
    errorContainer.style.display = '';
    errorContainer.innerHTML = '';
    errorContainer.appendChild(Alert({ message: msg, variant: 'error', icon: '⚠️' }));
  }

  // Cancel
  el.querySelector('[data-action="cancel"]').addEventListener('click', () => navigate('agents'));

  // Create
  el.querySelector('[data-action="create"]').addEventListener('click', async () => {
    const form = el.querySelector('#agent-form');
    const data = Object.fromEntries(new FormData(form));

    if (!data.agent_name || !data.role_prompt || !data.behavior_guidelines || !data.personality_id) {
      showError('Please fill in all required fields.');
      return;
    }

    // Hardcode backend-managed fields
    data.use_case = 'general';
    data.model_id = 'amazon.nova-pro-v1:0';

    const btn = el.querySelector('[data-action="create"]');
    btn.disabled = true;
    btn.textContent = 'Creating...';
    errorContainer.style.display = 'none';

    try {
      const res = await agentsApi.create(data);
      const agentId = res.data?.agent_id;
      navigate(agentId ? `agents/${agentId}` : 'agents');
    } catch (err) {
      showError(err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Create Agent →';
    }
  });

  return el;
}
