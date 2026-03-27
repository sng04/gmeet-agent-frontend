import { loadTemplate } from '../../utils/template.js';
import { Table } from '../../components/ui/Table.js';
import { navigate } from '../../router.js';

const mockProjects = [
  { id: '1', name: 'Acme Corp Sales', description: 'Enterprise sales meetings with Acme Corp technical team', agent: 'TechSales Bot', sessions: 3, users: 4 },
  { id: '2', name: 'Global Logistics Demo', description: 'Product demos for integration team', agent: 'Demo Agent', sessions: 5, users: 2 },
];

const mockSessions = [
  { id: '1', purpose: 'Integration Planning', status: 'live', agent: 'TechSales Bot', qa: 3, duration: '12 min (ongoing)', date: 'Started today 10:30 AM' },
  { id: '2', purpose: 'Q3 Architecture Review', status: 'summary', agent: 'TechSales Bot', qa: 8, duration: '47 min', date: 'Mar 15, 2026' },
  { id: '3', purpose: 'Security Compliance Review', status: 'ended', agent: 'TechSales Bot', qa: 0, duration: '—', date: 'Mar 12, 2026' },
];

export default async function DashboardController(params) {
  const el = await loadTemplate('/templates/user/dashboard.html', 'dashboard');

  // Populate live widget (inlined)
  el.querySelector('[data-bind="liveTitle"]').textContent = 'Integration Planning Session';
  el.querySelector('[data-bind="liveSubtitle"]').innerHTML = 'TechSales Bot is active · Duration: <strong>12 min</strong> · Acme Corp Sales';
  el.querySelector('[data-bind="liveLatency"]').textContent = '~42ms · Good';
  el.querySelector('[data-bind="liveQaCount"]').textContent = '3';
  el.querySelector('[data-action="openLive"]').addEventListener('click', () => navigate('live-session'));

  // Build project cards (inlined)
  const projectsGrid = el.querySelector('[data-bind="projectsGrid"]');
  mockProjects.forEach(p => {
    const card = document.createElement('div');
    card.className = 'proj-card';
    card.innerHTML = `
      <div class="proj-card-name">${p.name}</div>
      <div class="proj-card-desc">${p.description}</div>
      <div class="proj-card-meta">
        <span>🤖 ${p.agent}</span>
        <span>📋 ${p.sessions} sessions</span>
        <span>👥 ${p.users} users</span>
      </div>
    `;
    card.addEventListener('click', () => navigate('project-detail'));
    projectsGrid.appendChild(card);
  });

  // Sessions table
  const stateMap = { live: 'b-live', summary: 'b-summary', ended: 'b-ended' };
  const stateLabel = { live: 'Live', summary: 'Finished', ended: 'Ended' };

  const sessionsTable = Table({
    title: 'Recent Sessions',
    actions: `<button class="btn btn-g btn-sm" id="view-all-btn">View All →</button>`,
    columns: [
      { label: 'Purpose', render: r => `<strong class="text-p">${r.purpose}</strong><div class="text-xs text-t">${r.date}</div>` },
      { label: 'Status', render: r => `<span class="badge ${stateMap[r.status]}"><span class="dot"></span> ${stateLabel[r.status]}</span>` },
      { label: 'Agent', key: 'agent' },
      { label: 'Q&A', key: 'qa' },
      { label: 'Duration', key: 'duration', className: 'mono text-xs' },
      { label: '', render: r => {
        if (r.status === 'live') return '<button class="btn btn-live btn-sm" data-action="live">Live →</button>';
        if (r.status === 'summary') return '<button class="btn btn-review btn-sm" data-action="review">Review</button>';
        return '';
      }, className: 'text-right' },
    ],
    data: mockSessions,
  });
  el.querySelector('[data-bind="sessionsTable"]').appendChild(sessionsTable);

  // Handle action buttons
  el.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (btn) {
      if (btn.dataset.action === 'live') navigate('live-session');
      if (btn.dataset.action === 'review') navigate('retro-session');
    }
    if (e.target.id === 'view-all-btn') navigate('session-history');
  });

  return el;
}
