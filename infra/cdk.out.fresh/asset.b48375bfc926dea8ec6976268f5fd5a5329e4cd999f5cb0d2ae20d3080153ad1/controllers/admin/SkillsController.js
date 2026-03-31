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
import { sanitize } from '../../utils/sanitize.js';

export default async function SkillsController() {
  const el = await loadTemplate('/templates/admin/skills.html', 'skills');

  el.querySelector('[data-bind="actions"]').appendChild(
    Button({ text: '+ New Skill', variant: 'p', onClick: () => navigate('skill-create') })
  );

  const loadingEl = el.querySelector('[data-bind="loading"]');
  const errorEl = el.querySelector('[data-bind="error"]');
  const listEl = el.querySelector('[data-bind="skillsList"]');
  let allSkills = [];
  let currentPage = 1;
  const PAGE_SIZE = 20;
  let hasMore = false;

  const filters = el.querySelector('[data-bind="filters"]');
  const searchBox = SearchBox({ placeholder: 'Search skills...' });
  filters.appendChild(searchBox);

  async function load() {
    loadingEl.style.display = '';
    errorEl.style.display = 'none';
    listEl.innerHTML = '';
    removePagination();
    try {
      const res = await skillsApi.list({ page: currentPage, limit: PAGE_SIZE });
      allSkills = extractList(res);
      const meta = res?.data;
      if (meta && typeof meta === 'object' && !Array.isArray(meta)) {
        hasMore = meta.total_pages ? currentPage < meta.total_pages
          : meta.total ? currentPage * PAGE_SIZE < meta.total
          : allSkills.length === PAGE_SIZE;
      } else {
        hasMore = allSkills.length === PAGE_SIZE;
      }
      loadingEl.style.display = 'none';
      render(allSkills);
      renderPagination();
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
            '<div class="text-md fw-sb">' + sanitize(s.skill_name) + '</div>' +
            '<div class="mono text-xs" style="margin-top:4px"><a href="#" class="text-pri" style="text-decoration:none" data-action="downloadSkill" data-s3-key="' + (s.s3_key || '') + '">📄 ' + sanitize(fname) + '</a></div>' +
            (s.description ? '<div class="text-xs text-t mt-1">' + sanitize(s.description) + '</div>' : '') +
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

  function removePagination() {
    const existing = el.querySelector('[data-bind="pagination"]');
    if (existing) existing.remove();
  }

  function renderPagination() {
    removePagination();
    const div = document.createElement('div');
    div.setAttribute('data-bind', 'pagination');
    div.className = 'tbl-foot';
    div.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:12px 20px';
    div.innerHTML =
      '<span class="text-xs text-t">Page ' + currentPage + '</span>' +
      '<div style="display:flex;gap:8px">' +
        '<button class="btn btn-s btn-sm" data-action="prevPage"' + (currentPage <= 1 ? ' disabled' : '') + '>← Back</button>' +
        '<button class="btn btn-s btn-sm" data-action="nextPage"' + (!hasMore ? ' disabled' : '') + '>Next →</button>' +
      '</div>';
    listEl.after(div);
  }

  searchBox.querySelector('input').addEventListener('input', function() {
    var q = searchBox.querySelector('input').value.toLowerCase();
    if (q) {
      // Client-side filter on current page results
      render(allSkills.filter(function(s) {
        return (s.skill_name || '').toLowerCase().includes(q) || getFileName(s).toLowerCase().includes(q);
      }));
    } else {
      currentPage = 1;
      load();
    }
  });

  el.addEventListener('click', async function(e) {
    // Pagination
    const pageBtn = e.target.closest('[data-action="prevPage"], [data-action="nextPage"]');
    if (pageBtn && !pageBtn.disabled) {
      if (pageBtn.dataset.action === 'prevPage' && currentPage > 1) {
        currentPage--;
        load();
      } else if (pageBtn.dataset.action === 'nextPage' && hasMore) {
        currentPage++;
        load();
      }
      return;
    }

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
        '<input class="form-i" name="skill_name" value="' + sanitize(skill.skill_name || '') + '" required></div>' +
        '<div class="form-g"><label class="form-l">Description</label>' +
        '<textarea class="form-ta" name="description" rows="3">' + sanitize(skill.description || '') + '</textarea></div>' +
        '<div class="form-g"><label class="form-l">Replace Document <span style="font-weight:400;color:var(--gray-400)">(optional)</span></label>' +
        '<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--gray-50);border:1px solid var(--gray-200);border-radius:8px;margin-bottom:8px">' +
          '<span style="font-size:16px">📄</span>' +
          '<div style="flex:1"><div class="text-sm fw-m">' + sanitize(getFileName(skill)) + '</div><div class="text-xs text-t">Current document</div></div>' +
        '</div>' +
        '<input type="file" id="edit-skill-file" accept=".pdf,.md,.markdown,.txt,.docx" class="form-i">' +
        '<div class="form-h">Select a new file to replace the current document.</div></div>' +
        '<div id="edit-skill-error" style="display:none;color:var(--err-600);font-size:13px;margin-top:8px"></div>' +
      '</form>';
    var footer = document.createElement('div');
    footer.style.cssText = 'display:flex;gap:12px;justify-content:flex-end';
    var modal;
    var cancelBtn = Button({ text: 'Cancel', variant: 's', onClick: function() { modal.close(); } });
    var saveBtn = Button({ text: 'Save', variant: 'p', onClick: async function() {
      var fd = new FormData(body.querySelector('#edit-skill-form'));
      var name = (fd.get('skill_name') || '').trim();
      var errEl = body.querySelector('#edit-skill-error');
      var newFile = body.querySelector('#edit-skill-file').files[0];
      if (!name) { errEl.textContent = 'Name is required.'; errEl.style.display = ''; return; }
      saveBtn.disabled = true; saveBtn.textContent = 'Saving...'; errEl.style.display = 'none';
      try {
        await skillsApi.update(skill.skill_id, { skill_name: name, description: fd.get('description') || '' });
        if (newFile) {
          saveBtn.textContent = 'Replacing document...';
          var replaceRes = await skillsApi.replaceDocument(skill.skill_id);
          var uploadUrl = replaceRes.data?.upload_url;
          var replaceContentType = replaceRes.data?.content_type;
          if (uploadUrl) {
            saveBtn.textContent = 'Uploading...';
            await skillsApi.upload(uploadUrl, newFile, replaceContentType);
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
