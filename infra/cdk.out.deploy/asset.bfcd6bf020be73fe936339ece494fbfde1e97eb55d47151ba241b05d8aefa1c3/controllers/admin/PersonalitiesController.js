import { loadTemplate } from '../../utils/template.js';
import { Button } from '../../components/ui/Button.js';
import { Modal } from '../../components/ui/Modal.js';
import { personalitiesApi } from '../../api/personalities.js';

export default async function PersonalitiesController(params) {
  const el = await loadTemplate('/templates/admin/personalities.html', 'personalities');

  el.querySelector('[data-bind="actions"]').appendChild(
    Button({ text: '+ New Personality', variant: 'p', onClick: () => showModal() })
  );

  const loadingEl = el.querySelector('[data-bind="loading"]');
  const errorEl = el.querySelector('[data-bind="error"]');
  const listEl = el.querySelector('[data-bind="list"]');

  async function load() {
    loadingEl.style.display = '';
    errorEl.style.display = 'none';
    listEl.innerHTML = '';
    try {
      const res = await personalitiesApi.list();
      const items = res.data?.personalities || res.data || [];
      loadingEl.style.display = 'none';
      render(items);
    } catch (err) {
      loadingEl.style.display = 'none';
      errorEl.style.display = '';
      errorEl.innerHTML = `<div class="empty"><div class="empty-icon">⚠️</div><div class="empty-title">Failed to load</div><div class="empty-desc">${err.message}</div></div>`;
    }
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
          <div class="text-md fw-sb">${p.personality_name}</div>
          <div class="flex gap-2">
            <button class="btn btn-g btn-sm" data-action="edit" data-id="${p.personality_id}">Edit</button>
            <button class="btn btn-d btn-sm" data-action="delete" data-id="${p.personality_id}">Delete</button>
          </div>
        </div>
        <div class="card-body">
          <p style="font-size:13px;line-height:1.7;color:var(--gray-600);white-space:pre-wrap">${p.personality_prompt}</p>
        </div>
      `;
      listEl.appendChild(card);
    });
  }

  el.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const id = btn.dataset.id;
    if (btn.dataset.action === 'edit') {
      try {
        const res = await personalitiesApi.get(id);
        const p = res.data?.personality || res.data;
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
          <input class="form-i" name="personality_name" value="${existing?.personality_name || ''}" placeholder="e.g. Friendly Coach" required>
        </div>
        <div class="form-g">
          <label class="form-l">Prompt <span class="req">*</span></label>
          <textarea class="form-ta" name="personality_prompt" rows="6" placeholder="Describe the communication style...">${existing?.personality_prompt || ''}</textarea>
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
        const name = fd.get('personality_name');
        const prompt = fd.get('personality_prompt');
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
