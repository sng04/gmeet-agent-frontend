import { LiveWidget } from '../../components/shared/LiveWidget.js';
import { ProjectCard } from '../../components/shared/ProjectCard.js';
import { Table } from '../../components/ui/Table.js';
import { Button } from '../../components/ui/Button.js';
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

export default function UserDashboardPage() {
  const el = document.createElement('div');
  el.className = 'page';

  el.innerHTML = `
    <div class="pg-hdr">
      <div>
        <h1>My Projects</h1>
        <div class="pg-sub">Select a project to view sessions and details</div>
      </div>
    </div>
    <div id="live-widget" class="mb-6"></div>
    <div class="g g2 mb-6" id="projects-grid"></div>
    <div id="sessions-table"></div>
  `;

  el.querySelector('#live-widget').appendChild(LiveWidget({
    title: 'Integration Planning Session',
    subtitle: 'TechSales Bot is active · Duration: <strong>12 min</strong> · Acme Corp Sales',
    duration: '12 min',
    qaCount: 3,
    latency: 42,
    link: 'live-session',
  }));

  const projectsGrid = el.querySelector('#projects-grid');
  mockProjects.forEach(p => projectsGrid.appendChild(ProjectCard(p)));

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

  el.querySelector('#sessions-table').appendChild(sessionsTable);

  // Handle action buttons
  el.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (btn) {
      if (btn.dataset.action === 'live') navigate('live-session');
      if (btn.dataset.action === 'review') navigate('retro-session');
    }
    if (e.target.id === 'view-all-btn') {
      navigate('session-history');
    }
  });

  return el;
}
