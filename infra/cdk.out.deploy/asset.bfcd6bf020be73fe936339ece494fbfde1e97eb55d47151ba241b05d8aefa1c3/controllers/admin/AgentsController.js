import { loadTemplate } from '../../utils/template.js';
import { Button } from '../../components/ui/Button.js';
import { navigate } from '../../router.js';
import { agentsApi } from '../../api/agents.js';
import { formatDate } from '../../utils/format.js';

export default async function AgentsController(params) {
  const el = await loadTemplate('/templates/admin/agents.html', 'agents');

  el.querySelector('[data-bind="actions"]').appendChild(
    Button({ text: '+ New Agent', variant: 'p', onClick: () => navigate('agent-create') })
  );

  const loadingEl = el.querySelector('[data-bind="loading"]');
  const errorEl = el.querySelector('[data-bind="error"]');
  const listEl = el.querySelector('[data-bind="agentsList"]');

  async function loadAgents() {
    loadingEl.style.display = '';
    errorEl.style.display = 'none';
    listEl.innerHTML = '';

    try {
      const response = await agentsApi.list();
      const agents = response.data?.agents || response.data || [];
      loadingEl.style.display = 'none';
      renderAgents(agents);
    } catch (err) {
      loadingEl.style.display = 'none';
      errorEl.style.display = '';
      errorEl.innerHTML = `<div class="empty"><div class="empty-icon">⚠️</div><div class="empty-title">Failed to load agents</div><div class="empty-desc">${err.message}</div></div>`;
    }
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
            <button class="btn btn-g btn-sm" data-action="edit" data-id="${agent.agent_id}">Edit</button>
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

  el.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    e.stopPropagation();
    const id = btn.dataset.id;
    if (btn.dataset.action === 'view') navigate(`agents/${id}`);
    if (btn.dataset.action === 'edit') navigate(`agent-edit?id=${id}`);
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
