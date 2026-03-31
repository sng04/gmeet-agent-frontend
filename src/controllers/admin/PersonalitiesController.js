import { loadTemplate } from '../../utils/template.js';
import { Button } from '../../components/ui/Button.js';
import { Modal } from '../../components/ui/Modal.js';
import { SearchBox } from '../../components/ui/Form.js';
import { personalitiesApi } from '../../api/personalities.js';
import { extractList, extractItem } from '../../utils/api-helpers.js';
import { sanitize } from '../../utils/sanitize.js';

export default async function PersonalitiesController(params) {
  const el = await loadTemplate('/templates/admin/personalities.html', 'personalities');

  el.querySelector('[data-bind="actions"]').appendChild(
    Button({ text: '+ New Personality', variant: 'p', onClick: () => showModal() })
  );

  const loadingEl = el.querySelector('[data-bind="loading"]');
  const errorEl = el.querySelector('[data-bind="error"]');
  const listEl = el.querySelector('[data-bind="list"]');

  let searchTerm = '';
  let allItems = [];
  let currentPage = 1;
  const PAGE_SIZE = 20;
  let hasMore = false;

  const filters = el.querySelector('[data-bind="filters"]');
  if (filters) {
    filters.appendChild(SearchBox({
      placeholder: 'Search personalities...',
      onInput: (val) => {
        searchTerm = val.toLowerCase();
        currentPage = 1;
        renderFiltered();
      }
    }));
  }

  async function load() {
    loadingEl.style.display = '';
    errorEl.style.display = 'none';
    listEl.innerHTML = '';
    removePagination();
    try {
      const res = await personalitiesApi.list({ page: 1, limit: 200 });
      allItems = extractList(res);
      loadingEl.style.display = 'none';
      renderFiltered();
    } catch (err) {
      loadingEl.style.display = 'none';
      errorEl.style.display = '';
      errorEl.innerHTML = `<div class="empty"><div class="empty-icon">⚠️</div><div class="empty-title">Failed to load</div><div class="empty-desc">${sanitize(err.message)}</div></div>`;
    }
  }

  function renderFiltered() {
    const filtered = allItems.filter(p =>
      !searchTerm ||
      (p.personality_name || '').toLowerCase().includes(searchTerm) ||
      (p.personality_prompt || '').toLowerCase().includes(searchTerm)
    );
    const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
    if (currentPage > totalPages) currentPage = totalPages;
    const start = (currentPage - 1) * PAGE_SIZE;
    const pageItems = filtered.slice(start, start + PAGE_SIZE);
    hasMore = currentPage < totalPages;
    render(pageItems);
    renderPagination();
  }

  function render(items) {
    if (!items.length) {
      listEl.innerHTML = '<div class="empty"><div class="empty-icon">🎭</div><div class="empty-title">No personalities yet</div><div class="empty-desc">Create one to assign to agents</div></div>';
      return;
    }
    listEl.innerHTML = '';
    items.forEach(p => {
      const card = document.createElement('div');
      card.className = 'card mb-4';
      card.innerHTML = `
        <div class="card-hdr">
          <div class="text-md fw-sb">${sanitize(p.personality_name)}</div>
          <div class="flex gap-2">
            <button class="btn btn-g btn-sm" data-action="edit" data-id="${p.personality_id}">Edit</button>
            <button class="btn btn-d btn-sm" data-action="delete" data-id="${p.personality_id}">Delete</button>
          </div>
        </div>
        <div class="card-body">
          <p style="font-size:13px;line-height:1.7;color:var(--gray-600);white-space:pre-wrap">${sanitize(p.personality_prompt)}</p>
        </div>
      `;
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

  el.addEventListener('click', async (e) => {
    // Pagination
    const pageBtn = e.target.closest('[data-action="prevPage"], [data-action="nextPage"]');
    if (pageBtn && !pageBtn.disabled) {
      if (pageBtn.dataset.action === 'prevPage' && currentPage > 1) {
        currentPage--;
        renderFiltered();
      } else if (pageBtn.dataset.action === 'nextPage' && hasMore) {
        currentPage++;
        renderFiltered();
      }
      return;
    }

    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const id = btn.dataset.id;
    if (btn.dataset.action === 'edit') {
      try {
        const res = await personalitiesApi.get(id);
        const p = extractItem(res);
        showModal(p);
      } catch (err) { alert(err.message); }
    }
    if (btn.dataset.action === 'delete') {
      if (!confirm('Delete this personality? Fails if agents reference it.')) return;
      try { await personalitiesApi.delete(id); load(); }
      catch (err) { alert(err.message); }
    }
  });

  function showModal(existing) {
    const isEdit = !!existing;
    const body = document.createElement('div');
    body.innerHTML = `
      <form id="pers-form">
        <div class="form-g">
          <label class="form-l">Name <span class="req">*</span></label>
          <input class="form-i" name="personality_name" value="${sanitize(existing?.personality_name || '')}" placeholder="e.g. Friendly Coach" required>
        </div>
        <div class="form-g">
          <label class="form-l">Prompt <span class="req">*</span></label>
          <textarea class="form-ta" name="personality_prompt" rows="6" placeholder="Describe the communication style...">${sanitize(existing?.personality_prompt || '')}</textarea>
        </div>
        <div id="pers-error" style="display:none;color:var(--err-600);font-size:13px;margin-top:8px"></div>
      </form>
    `;
    const footer = document.createElement('div');
    footer.style.cssText = 'display:flex;gap:12px;justify-content:flex-end';
    let modal;
    const cancelBtn = Button({ text: 'Cancel', variant: 's', onClick: () => modal.close() });
    const saveBtn = Button({
      text: isEdit ? 'Save Changes' : 'Create', variant: 'p', onClick: async () => {
        const fd = new FormData(body.querySelector('#pers-form'));
        const name = (fd.get('personality_name') || '').trim();
        const prompt = (fd.get('personality_prompt') || '').trim();
        const errEl = body.querySelector('#pers-error');
        if (!name || !prompt) { errEl.textContent = 'Both fields are required.'; errEl.style.display = ''; return; }
        saveBtn.disabled = true; saveBtn.textContent = 'Saving...'; errEl.style.display = 'none';
        try {
          if (isEdit) await personalitiesApi.update(existing.personality_id, { personality_name: name, personality_prompt: prompt });
          else await personalitiesApi.create({ personality_name: name, personality_prompt: prompt });
          modal.close(); load();
        } catch (err) { errEl.textContent = err.message; errEl.style.display = ''; }
        finally { saveBtn.disabled = false; saveBtn.textContent = isEdit ? 'Save Changes' : 'Create'; }
      }
    });
    footer.appendChild(cancelBtn);
    footer.appendChild(saveBtn);
    modal = Modal({ title: isEdit ? 'Edit Personality' : 'New Personality', body, footer });
  }

  load();
  return el;
}
