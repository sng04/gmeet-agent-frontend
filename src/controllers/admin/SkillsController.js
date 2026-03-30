import { loadTemplate } from '../../utils/template.js';
import { Button } from '../../components/ui/Button.js';
import { Modal } from '../../components/ui/Modal.js';
import { SearchBox } from '../../components/ui/Form.js';
import { navigate } from '../../router.js';
import { skillsApi } from '../../api/skills.js';
import { filesApi } from '../../api/files.js';
import { SKILLS_BUCKET } from '../../config.js';
import { formatDate } from '../../utils/format.js';
import { extractList } from '../../utils/api-helpers.js';

export default async function SkillsController() {
  const el = await loadTemplate('/templates/admin/skills.html', 'skills');

  el.querySelector('[data-bind="actions"]').appendChild(
    Button({ text: '+ New Skill', variant: 'p', onClick: () => navigate('skill-create') })
  );

  const loadingEl = el.querySelector('[data-bind="loading"]');
  const errorEl = el.querySelector('[data-bind="error"]');
  const listEl = el.querySelector('[data-bind="skillsList"]');
  let allSkills = [];

  const filters = el.querySelector('[data-bind="filters"]');
  const searchBox = SearchBox({ placeholder: 'Search skills...' });
  filters.appendChild(searchBox);

  async function load() {
    loadingEl.style.display = '';
    errorEl.style.display = 'none';
    listEl.innerHTML = '';
    try {
      const res = await skillsApi.list();
      allSkills = extractList(res);
      loadingEl.style.display = 'none';
      render(allSkills);
    } catch (err) {
      loadingEl.style.display = 'none';
      errorEl.style.display = '';
      errorEl.innerHTML = '<div class="empty"><div class="empty-icon">⚠️</div><div class="empty-title">Failed to load</div><div class="empty-desc">' + err.message + '</div></div>';
    }
  }

  function getFileName(s) {
    return s.file_name || s.fileName || s.document_name || s.filename || s.s3_key?.split('/').pop() || '—';
  }

  function render(skills) {
    listEl.innerHTML = '';
    if (!skills.length) {
      listEl.innerHTML = '<div class="empty"><div class="empty-icon">📄</div><div class="empty-title">No skills yet</div><div class="empty-desc">Upload a knowledge document to get started</div></div>';
      return;
    }
    skills.forEach(function(s) {
      var fname = getFileName(s);
      var card = document.createElement('div');
      card.className = 'card mb-4';
      card.innerHTML =
        '<div class="card-hdr">' +
          '<div>' +
            '<div class="text-md fw-sb">' + s.skill_name + '</div>' +
            '<div class="mono text-xs" style="margin-top:4px"><a href="#" class="text-pri" style="text-decoration:none" data-action="downloadSkill" data-s3-key="' + (s.s3_key || '') + '">📄 ' + fname + '</a></div>' +
            (s.description ? '<div class="text-xs text-t mt-1">' + s.description + '</div>' : '') +
          '</div>' +
          '<div class="flex gap-2">' +
            '<button class="btn btn-g btn-sm" data-edit-skill="' + s.skill_id + '">Edit</button>' +
            '<button class="btn btn-d btn-sm" data-delete-skill="' + s.skill_id + '">Delete</button>' +
          '</div>' +
        '</div>' +
        '<div class="card-body" style="padding:10px 20px;font-size:12px;color:var(--gray-500)">' +
          (s.created_at ? 'Created ' + formatDate(s.created_at) : '') +
        '</div>';
      listEl.appendChild(card);
    });
  }

  searchBox.querySelector('input').addEventListener('input', function() {
    var q = searchBox.querySelector('input').value.toLowerCase();
    render(allSkills.filter(function(s) {
      return (s.skill_name || '').toLowerCase().includes(q) || getFileName(s).toLowerCase().includes(q);
    }));
  });

  el.addEventListener('click', async function(e) {
    var downloadLink = e.target.closest('[data-action="downloadSkill"]');
    if (downloadLink) {
      e.preventDefault();
      var s3Key = downloadLink.dataset.s3Key;
      if (!s3Key) return;
      try {
        var res = await filesApi.getDownloadUrl(s3Key, SKILLS_BUCKET);
        var url = res.data?.download_url;
        if (url) window.open(url, '_blank');
      } catch (err) { alert('Failed to get download link: ' + err.message); }
      return;
    }
    var delBtn = e.target.closest('[data-delete-skill]');
    if (delBtn) {
      if (!confirm('Delete this skill?')) return;
      try { await skillsApi.delete(delBtn.dataset.deleteSkill); load(); }
      catch (err) { alert(err.message); }
      return;
    }
    var editBtn = e.target.closest('[data-edit-skill]');
    if (editBtn) {
      var skill = allSkills.find(function(s) { return s.skill_id === editBtn.dataset.editSkill; });
      if (skill) showEditModal(skill);
    }
  });

  function showEditModal(skill) {
    var body = document.createElement('div');
    body.innerHTML =
      '<form id="edit-skill-form">' +
        '<div class="form-g"><label class="form-l">Skill Name <span class="req">*</span></label>' +
        '<input class="form-i" name="skill_name" value="' + (skill.skill_name || '') + '" required></div>' +
        '<div class="form-g"><label class="form-l">Description</label>' +
        '<textarea class="form-ta" name="description" rows="3">' + (skill.description || '') + '</textarea></div>' +
        '<div class="form-g"><label class="form-l">Replace Document <span style="font-weight:400;color:var(--gray-400)">(optional)</span></label>' +
        '<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--gray-50);border:1px solid var(--gray-200);border-radius:8px;margin-bottom:8px">' +
          '<span style="font-size:16px">📄</span>' +
          '<div style="flex:1"><div class="text-sm fw-m">' + getFileName(skill) + '</div><div class="text-xs text-t">Current document</div></div>' +
        '</div>' +
        '<input type="file" id="edit-skill-file" accept=".pdf,.md,.markdown,.txt" class="form-i">' +
        '<div class="form-h">Select a new file to replace the current document.</div></div>' +
        '<div id="edit-skill-error" style="display:none;color:var(--err-600);font-size:13px;margin-top:8px"></div>' +
      '</form>';
    var footer = document.createElement('div');
    footer.style.cssText = 'display:flex;gap:12px;justify-content:flex-end';
    var modal;
    var cancelBtn = Button({ text: 'Cancel', variant: 's', onClick: function() { modal.close(); } });
    var saveBtn = Button({ text: 'Save', variant: 'p', onClick: async function() {
      var fd = new FormData(body.querySelector('#edit-skill-form'));
      var name = fd.get('skill_name');
      var errEl = body.querySelector('#edit-skill-error');
      var newFile = body.querySelector('#edit-skill-file').files[0];
      if (!name) { errEl.textContent = 'Name is required.'; errEl.style.display = ''; return; }
      saveBtn.disabled = true; saveBtn.textContent = 'Saving...'; errEl.style.display = 'none';
      try {
        // Update metadata
        await skillsApi.update(skill.skill_id, { skill_name: name, description: fd.get('description') || '' });
        // Replace document if a new file was selected
        if (newFile) {
          saveBtn.textContent = 'Replacing document...';
          var replaceRes = await skillsApi.replaceDocument(skill.skill_id);
          var uploadUrl = replaceRes.data?.upload_url;
          if (uploadUrl) {
            saveBtn.textContent = 'Uploading...';
            await skillsApi.upload(uploadUrl, newFile);
          }
        }
        modal.close(); load();
      } catch (err) { errEl.textContent = err.message; errEl.style.display = ''; }
      finally { saveBtn.disabled = false; saveBtn.textContent = 'Save'; }
    }});
    footer.appendChild(cancelBtn);
    footer.appendChild(saveBtn);
    modal = Modal({ title: 'Edit Skill', body: body, footer: footer });
  }

  load();
  return el;
}
