import { loadTemplate } from '../../utils/template.js';
import { navigate } from '../../router.js';
import { skillsApi } from '../../api/skills.js';
import { Alert } from '../../components/ui/Alert.js';
import { extractItem } from '../../utils/api-helpers.js';

export default async function SkillCreateController() {
  const el = await loadTemplate('/templates/admin/skill-create.html', 'skill-create');

  el.querySelectorAll('[data-action="navBack"]').forEach(link => {
    link.addEventListener('click', (e) => { e.preventDefault(); navigate(link.dataset.to); });
  });

  const errorContainer = el.querySelector('[data-bind="formError"]');
  let selectedFile = null;

  const uploadZone = el.querySelector('[data-bind="uploadZone"]');
  const fileInput = el.querySelector('[data-bind="fileInput"]');
  const fileNameEl = el.querySelector('[data-bind="fileName"]');

  uploadZone.addEventListener('click', () => fileInput.click());
  uploadZone.addEventListener('dragover', (e) => { e.preventDefault(); uploadZone.style.borderColor = 'var(--pri-500)'; });
  uploadZone.addEventListener('dragleave', () => { uploadZone.style.borderColor = ''; });
  uploadZone.addEventListener('drop', (e) => {
    e.preventDefault(); uploadZone.style.borderColor = '';
    if (e.dataTransfer.files.length) { selectedFile = e.dataTransfer.files[0]; fileNameEl.textContent = 'Selected: ' + selectedFile.name; }
  });
  fileInput.addEventListener('change', () => {
    if (fileInput.files.length) { selectedFile = fileInput.files[0]; fileNameEl.textContent = 'Selected: ' + selectedFile.name; }
  });

  el.querySelector('[data-action="cancel"]').addEventListener('click', () => navigate('skills'));

  el.querySelector('[data-action="create"]').addEventListener('click', async () => {
    const form = el.querySelector('#skill-form');
    const data = Object.fromEntries(new FormData(form));
    if (!data.skill_name || !selectedFile) {
      errorContainer.style.display = '';
      errorContainer.innerHTML = '';
      errorContainer.appendChild(Alert({ message: 'Skill name and file are required.', variant: 'error', icon: '⚠️' }));
      return;
    }
    const btn = el.querySelector('[data-action="create"]');
    btn.disabled = true; btn.textContent = 'Creating...'; errorContainer.style.display = 'none';
    try {
      const payload = { skill_name: data.skill_name, file_name: selectedFile.name };
      if (data.description) payload.description = data.description;
      const res = await skillsApi.create(payload);
      const uploadUrl = extractItem(res)?.upload_url || res.data?.upload_url;
      if (uploadUrl) { btn.textContent = 'Uploading file...'; await skillsApi.upload(uploadUrl, selectedFile); }
      navigate('skills');
    } catch (err) {
      errorContainer.style.display = '';
      errorContainer.innerHTML = '';
      errorContainer.appendChild(Alert({ message: err.message, variant: 'error', icon: '⚠️' }));
    } finally { btn.disabled = false; btn.textContent = 'Create Skill'; }
  });

  return el;
}
