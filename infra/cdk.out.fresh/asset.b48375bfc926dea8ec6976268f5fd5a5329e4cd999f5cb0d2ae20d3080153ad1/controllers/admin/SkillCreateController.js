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
    if (e.dataTransfer.files.length) {
      selectedFile = e.dataTransfer.files[0];
      var zoneText = el.querySelector('[data-bind="uploadZoneText"]');
      if (zoneText) zoneText.textContent = '📄 ' + selectedFile.name;
      fileNameEl.style.display = 'block';
      fileNameEl.innerHTML = '<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--ok-50);border:1px solid var(--ok-200);border-radius:8px;margin-top:8px"><span>✅</span><div style="flex:1"><div class="text-sm fw-m">' + selectedFile.name + '</div><div class="text-xs text-t">' + (selectedFile.size / 1024).toFixed(0) + ' KB</div></div></div>';
    }
  });
  fileInput.addEventListener('change', () => {
    if (fileInput.files.length) {
      selectedFile = fileInput.files[0];
      var zoneText = el.querySelector('[data-bind="uploadZoneText"]');
      if (zoneText) zoneText.textContent = '📄 ' + selectedFile.name;
      fileNameEl.style.display = 'block';
      fileNameEl.innerHTML = '<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--ok-50);border:1px solid var(--ok-200);border-radius:8px;margin-top:8px"><span>✅</span><div style="flex:1"><div class="text-sm fw-m">' + selectedFile.name + '</div><div class="text-xs text-t">' + (selectedFile.size / 1024).toFixed(0) + ' KB</div></div></div>';
    }
  });

  el.querySelector('[data-action="cancel"]').addEventListener('click', () => navigate('skills'));

  el.querySelector('[data-action="create"]').addEventListener('click', async () => {
    const form = el.querySelector('#skill-form');
    const data = Object.fromEntries(new FormData(form));
    data.skill_name = (data.skill_name || '').trim();
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
      const resData = extractItem(res) || res.data || {};
      const uploadUrl = resData.upload_url;
      const contentType = resData.content_type;
      if (uploadUrl) {
        btn.textContent = 'Uploading file...';
        var uploadRes = await skillsApi.upload(uploadUrl, selectedFile, contentType);
        if (!uploadRes.ok) throw new Error('Upload failed: ' + uploadRes.status);
      }
      navigate('skills');
    } catch (err) {
      errorContainer.style.display = '';
      errorContainer.innerHTML = '';
      errorContainer.appendChild(Alert({ message: err.message, variant: 'error', icon: '⚠️' }));
    } finally { btn.disabled = false; btn.textContent = 'Create Skill'; }
  });

  return el;
}
