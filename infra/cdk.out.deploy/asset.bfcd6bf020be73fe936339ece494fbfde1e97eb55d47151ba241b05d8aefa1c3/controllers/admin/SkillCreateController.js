import { loadTemplate } from '../../utils/template.js';
import { navigate } from '../../router.js';
import { skillsApi } from '../../api/skills.js';
import { agentsApi } from '../../api/agents.js';
import { Alert } from '../../components/ui/Alert.js';

export default async function SkillCreateController(params) {
  const el = await loadTemplate('/templates/admin/skill-create.html', 'skill-create');

  el.querySelectorAll('[data-action="navBack"]').forEach(link => {
    link.addEventListener('click', (e) => { e.preventDefault(); navigate(link.dataset.to); });
  });

  const errorContainer = el.querySelector('[data-bind="formError"]');
  let selectedFile = null;

  // Load agents into dropdown
  const agentSelect = el.querySelector('[data-bind="agentSelect"]');
  try {
    const res = await agentsApi.list();
    const agents = res.data?.agents || res.data || [];
    agentSelect.innerHTML = '<option value="">Select agent...</option>';
    agents.forEach(a => {
      agentSelect.innerHTML += `<option value="${a.agent_id}">${a.agent_name}</option>`;
    });
  } catch {
    agentSelect.innerHTML = '<option value="">Failed to load agents</option>';
  }

  // File upload zone
  const uploadZone = el.querySelector('[data-bind="uploadZone"]');
  const fileInput = el.querySelector('[data-bind="fileInput"]');
  const fileNameEl = el.querySelector('[data-bind="fileName"]');

  uploadZone.addEventListener('click', () => fileInput.click());
  uploadZone.addEventListener('dragover', (e) => { e.preventDefault(); uploadZone.style.borderColor = 'var(--pri-500)'; });
  uploadZone.addEventListener('dragleave', () => { uploadZone.style.borderColor = ''; });
  uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.style.borderColor = '';
    if (e.dataTransfer.files.length) {
      selectedFile = e.dataTransfer.files[0];
      fileNameEl.textContent = `Selected: ${selectedFile.name}`;
    }
  });
  fileInput.addEventListener('change', () => {
    if (fileInput.files.length) {
      selectedFile = fileInput.files[0];
      fileNameEl.textContent = `Selected: ${selectedFile.name}`;
    }
  });

  // Cancel
  el.querySelector('[data-action="cancel"]').addEventListener('click', () => navigate('skills'));

  // Create
  el.querySelector('[data-action="create"]').addEventListener('click', async () => {
    const form = el.querySelector('#skill-form');
    const data = Object.fromEntries(new FormData(form));

    if (!data.agent_id || !data.skill_name || !selectedFile) {
      errorContainer.style.display = '';
      errorContainer.innerHTML = '';
      errorContainer.appendChild(Alert({ message: 'Agent, skill name, and file are required.', variant: 'error', icon: '⚠️' }));
      return;
    }

    const btn = el.querySelector('[data-action="create"]');
    btn.disabled = true;
    btn.textContent = 'Creating...';
    errorContainer.style.display = 'none';

    try {
      const res = await skillsApi.create({
        agent_id: data.agent_id,
        skill_name: data.skill_name,
        file_name: selectedFile.name,
        description: data.description || undefined,
      });

      const uploadUrl = res.data?.upload_url;
      if (uploadUrl) {
        btn.textContent = 'Uploading file...';
        await skillsApi.upload(uploadUrl, selectedFile);
      }

      navigate('skills');
    } catch (err) {
      errorContainer.style.display = '';
      errorContainer.innerHTML = '';
      errorContainer.appendChild(Alert({ message: err.message, variant: 'error', icon: '⚠️' }));
    } finally {
      btn.disabled = false;
      btn.textContent = 'Create Skill';
    }
  });

  return el;
}
