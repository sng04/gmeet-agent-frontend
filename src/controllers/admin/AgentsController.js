import { loadTemplate } from '../../utils/template.js';
import { Button } from '../../components/ui/Button.js';
import { SearchBox } from '../../components/ui/Form.js';
import { navigate } from '../../router.js';
import { agentsApi } from '../../api/agents.js';
import { formatDate } from '../../utils/format.js';
import { extractList } from '../../utils/api-helpers.js';

export default async function AgentsController(params) {
  const el = await loadTemplate('/templates/admin/agents.html', 'agents');

  el.querySelector('[data-bind="actions"]').appendChild(
    Button({ text: '+ New Agent', variant: 'p', onClick: () => navigate('agent-create') })
  );

  const loadingEl = el.querySelector('[data-bind="loading"]');
  const errorEl = el.querySelector('[data-bind="error"]');
  const listEl = el.querySelector('[data-bind="agentsList"]');

  let searchTerm = '';
  let allAgents = [];
  let currentPage = 1;
  const PAGE_SIZE = 20;
  let hasMore = false;

  const filters = el.querySelector('[data-bind="filters"]');
  if (filters) {
    filters.appendChild(SearchBox({
      placeholder: 'Search agents...',
      onInput: (val) => {
        searchTerm = val.toLowerCase();
        currentPage = 1;
        renderFiltered();
      }
    }));
  }

  async function loadAgents() {
    loadingEl.style.display = '';
    errorEl.style.display = 'none';
    listEl.innerHTML = '';
    removePagination();

    try {
      const response = await agentsApi.list({ page: 1, limit: 200 });
      allAgents = extractList(response);
      loadingEl.style.display = 'none';
      renderFiltered();
    } catch (err) {
      loadingEl.style.display = 'none';
      errorEl.style.display = '';
      errorEl.innerHTML = `<div class="empty"><div class="empty-icon">⚠️</div><div class="empty-title">Failed to load agents</div><div class="empty-desc">${err.message}</div></div>`;
    }
  }

  function renderFiltered() {
    const filtered = allAgents.filter(a =>
      !searchTerm ||
      (a.agent_name || '').toLowerCase().includes(searchTerm)
    );
    const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
    if (currentPage > totalPages) currentPage = totalPages;
    const start = (currentPage - 1) * PAGE_SIZE;
    const pageItems = filtered.slice(start, start + PAGE_SIZE);
    hasMore = currentPage < totalPages;
    renderAgents(pageItems);
    renderPagination();
  }

  function renderAgents(agents) {
    listEl.innerHTML = '';
    if (!agents.length) {
      listEl.innerHTML = `<div class="empty"><div class="empty-icon">🤖</div><div class="empty-title">No agents yet</div><div class="empty-desc">Create your first agent to get started</div></div>`;
      return;
    }

    agents.forEach(agent => {
      const card = document.createElement('div');
      card.className = 'agent-list-card';
      const updated = agent.updated_at ? formatDate(agent.updated_at) : '';
      card.innerHTML = `
        <div class="agent-list-row">
          <div style="width:44px;height:44px;background:var(--ok-50);border-radius:10px;display:grid;place-items:center;font-size:22px;flex-shrink:0">🤖</div>
          <div style="flex:1">
            <div class="flex items-c gap-3">
              <strong class="text-md">${agent.agent_name}</strong>
            </div>
            <div class="text-xs text-t mt-1">${updated ? `Updated: ${updated}` : ''}</div>
          </div>
          <div class="flex gap-2">
            <button class="btn btn-s btn-sm" data-action="view" data-id="${agent.agent_id}">View</button>
            <button class="btn btn-d btn-sm" data-action="delete" data-id="${agent.agent_id}">Delete</button>
          </div>
        </div>
      `;
      card.addEventListener('click', (e) => {
        if (!e.target.closest('button')) navigate(`agents/${agent.agent_id}`);
      });
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
    e.stopPropagation();
    const id = btn.dataset.id;
    if (btn.dataset.action === 'view') navigate(`agents/${id}`);
    if (btn.dataset.action === 'delete') {
      if (!confirm('Delete this agent? This cannot be undone.')) return;
      try {
        await agentsApi.delete(id);
        loadAgents();
      } catch (err) {
        alert(err.message);
      }
    }
  });

  loadAgents();
  return el;
}
