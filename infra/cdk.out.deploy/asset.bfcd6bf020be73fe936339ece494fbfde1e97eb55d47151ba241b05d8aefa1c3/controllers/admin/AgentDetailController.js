import { loadTemplate } from '../../utils/template.js';
import { Button } from '../../components/ui/Button.js';
import { navigate } from '../../router.js';

const mockAgent = {
  id: '1',
  name: 'TechSales Bot',
  status: 'enabled',
  projects: 2,
  lastActive: '1 hour ago',
  lastUpdated: 'Mar 15, 2026 at 16:20',
  updatedBy: 'Richie Tan',
  personality: 'Professional, concise, confident',
  tone: 'Professional and neutral',
  role: `You are TechSales Bot, a professional AI meeting assistant. Your objective is to answer technical questions accurately using the provided knowledge base. Always respond concisely and professionally. Reference specific documentation when possible. Do not speculate beyond provided context.`,
};

const mockRoleHistory = [
  { version: 'v2', date: 'Mar 10, 2026 · 11:05', author: 'Richie Tan', role: 'You are TechSales Bot. Answer questions accurately and professionally based on provided documents. Do not guess.' },
  { version: 'v1', date: 'Mar 5, 2026 · 09:30', author: 'Richie Tan', role: 'You are a helpful meeting assistant. Answer questions based on the knowledge base.' },
];

const mockProjects = [
  { name: 'Acme Corp Sales', sessions: 12, users: 4, status: 'active' },
  { name: 'Global Logistics Demo', sessions: 5, users: 2, status: 'active' },
];

export default async function AgentDetailController(params) {
  const el = await loadTemplate('/templates/admin/agent-detail.html', 'agent-detail');

  // Breadcrumb nav-back
  el.querySelectorAll('[data-action="navBack"]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      navigate(link.dataset.to);
    });
  });

  // Populate data-bind fields
  el.querySelector('[data-bind="agentName"]').textContent = mockAgent.name;
  el.querySelector('[data-bind="agentTitle"]').textContent = mockAgent.name;

  const statusBadge = el.querySelector('[data-bind="statusBadge"]');
  statusBadge.className = `badge ${mockAgent.status === 'enabled' ? 'b-ok' : 'b-gray'}`;
  statusBadge.innerHTML = `<span class="dot"></span> ${mockAgent.status === 'enabled' ? 'Enabled' : 'Disabled'}`;

  el.querySelector('[data-bind="agentMeta"]').textContent = `Used by ${mockAgent.projects} projects · Last active: ${mockAgent.lastActive}`;
  el.querySelector('[data-bind="agentUpdated"]').innerHTML = `Last updated: <strong>${mockAgent.lastUpdated}</strong> by ${mockAgent.updatedBy}`;

  el.querySelector('[data-bind="roleDate"]').textContent = `${mockAgent.lastUpdated.split(' at ')[0]} · ${mockAgent.lastUpdated.split(' at ')[1] || '16:20'}`;
  el.querySelector('[data-bind="roleText"]').textContent = mockAgent.role;

  // Config values
  el.querySelector('[data-bind="configName"]').textContent = mockAgent.name;
  el.querySelector('[data-bind="configPersonality"]').textContent = mockAgent.personality;
  el.querySelector('[data-bind="configTone"]').textContent = mockAgent.tone;

  // Role history
  const roleHistory = el.querySelector('[data-bind="roleHistory"]');
  roleHistory.innerHTML = mockRoleHistory.map(h => `
    <div style="border-bottom:1px solid var(--gray-100);padding:14px 20px">
      <div class="flex jc-b items-c mb-2">
        <span class="text-xs fw-sb text-p">${h.version} — ${h.date} by ${h.author}</span>
        <button class="btn btn-g btn-sm">Restore</button>
      </div>
      <p style="font-size:12px;line-height:1.6;color:var(--gray-500);font-family:var(--mono);white-space:pre-wrap">${h.role}</p>
    </div>
  `).join('');

  // Assigned projects
  const projectsList = el.querySelector('[data-bind="projectsList"]');
  projectsList.innerHTML = mockProjects.map(p => `
    <div style="display:flex;align-items:center;gap:12px;padding:12px;background:var(--gray-25);border:1px solid var(--gray-200);border-radius:8px">
      <span style="font-size:18px">📁</span>
      <div style="flex:1">
        <div class="text-sm fw-sb">${p.name}</div>
        <div class="text-xs text-t mt-1">${p.sessions} sessions · ${p.users} users</div>
      </div>
      <span class="badge b-ok"><span class="dot"></span> ${p.status}</span>
    </div>
  `).join('');

  // Actions — Edit Agent button
  el.querySelector('[data-bind="actions"]').appendChild(
    Button({ text: 'Edit Agent', variant: 's', onClick: () => navigate('agent-edit') })
  );

  return el;
}
