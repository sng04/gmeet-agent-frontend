import { loadTemplate } from '../../utils/template.js';
import { Button } from '../../components/ui/Button.js';
import { navigate } from '../../router.js';

const mockAgents = [
  { id: '1', name: 'TechSales Bot', status: 'enabled', description: 'Professional and concise', projects: 2, lastActive: '1h ago', lastUpdated: 'Mar 15, 2026' },
  { id: '2', name: 'Demo Agent', status: 'enabled', description: 'Enthusiastic and detailed', projects: 1, lastActive: '1d ago', lastUpdated: 'Mar 10, 2026' },
  { id: '3', name: 'Support Agent', status: 'disabled', description: 'Patient and thorough', projects: 0, lastActive: 'Never active', lastUpdated: 'Mar 5, 2026' },
];

export default async function AgentsController(params) {
  const el = await loadTemplate('/templates/admin/agents.html', 'agents');

  // Actions — New Agent button
  el.querySelector('[data-bind="actions"]').appendChild(
    Button({ text: '+ New Agent', variant: 'p', onClick: () => navigate('agent-create') })
  );

  // Build agent cards
  const agentsList = el.querySelector('[data-bind="agentsList"]');

  mockAgents.forEach(agent => {
    const card = document.createElement('div');
    card.className = 'agent-list-card';
    card.innerHTML = `
      <div class="agent-list-row">
        <div style="width:44px;height:44px;background:${agent.status === 'enabled' ? 'var(--ok-50)' : 'var(--gray-100)'};border-radius:10px;display:grid;place-items:center;font-size:22px;flex-shrink:0">🤖</div>
        <div style="flex:1">
          <div class="flex items-c gap-3">
            <strong class="text-md">${agent.name}</strong>
            <span class="badge ${agent.status === 'enabled' ? 'b-ok' : 'b-gray'}"><span class="dot"></span> ${agent.status === 'enabled' ? 'Enabled' : 'Disabled'}</span>
          </div>
          <div class="text-xs text-t mt-1">${agent.description} · Used by ${agent.projects} projects · Last active: ${agent.lastActive}</div>
          <div class="text-xs text-t" style="margin-top:2px">Last updated: ${agent.lastUpdated}</div>
        </div>
        <div class="flex gap-2">
          <button class="btn btn-s btn-sm" data-action="view" data-id="${agent.id}">View</button>
          <button class="btn btn-g btn-sm" data-action="edit" data-id="${agent.id}">Edit</button>
        </div>
      </div>
    `;
    card.addEventListener('click', (e) => {
      if (!e.target.closest('button')) {
        navigate('agent-detail');
      }
    });
    agentsList.appendChild(card);
  });

  // Delegated click handlers for view/edit buttons
  el.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (btn) {
      e.stopPropagation();
      if (btn.dataset.action === 'view') navigate('agent-detail');
      if (btn.dataset.action === 'edit') navigate('agent-edit');
    }
  });

  return el;
}
