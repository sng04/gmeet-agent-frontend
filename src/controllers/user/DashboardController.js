import { loadTemplate } from '../../utils/template.js';
import { Table } from '../../components/ui/Table.js';
import { navigate } from '../../router.js';
import { projectsApi } from '../../api/projects.js';

// Mock sessions data
const mockSessions = [
  { id: '1', purpose: 'Integration Planning', status: 'live', agent: 'TechSales Bot', qa: 3, duration: '12 min (ongoing)', date: 'Started today 10:30 AM' },
  { id: '2', purpose: 'Q3 Architecture Review', status: 'summary', agent: 'TechSales Bot', qa: 8, duration: '47 min', date: 'Mar 15, 2026' },
  { id: '3', purpose: 'Security Compliance Review', status: 'ended', agent: 'TechSales Bot', qa: 0, duration: '—', date: 'Mar 12, 2026' },
];

export default async function DashboardController() {
  const el = await loadTemplate('/templates/user/dashboard.html', 'dashboard');

  const pageLoading = el.querySelector('[data-bind="pageLoading"]');
  const pageContent = el.querySelector('[data-bind="pageContent"]');
  const pageError = el.querySelector('[data-bind="pageError"]');
  const liveWidget = el.querySelector('[data-bind="liveWidget"]');

  let projects = [];

  // Live widget handlers
  el.querySelector('[data-action="openLive"]')?.addEventListener('click', () => navigate('live-session'));

  async function loadProjects() {
    try {
      const res = await projectsApi.list();
      projects = res.data?.items || [];

      // Hide loading, show content
      pageLoading.style.display = 'none';
      pageContent.style.display = 'block';

      renderProjects();
      renderSessions();
      
      // Show live widget if there's a live session (mock for now)
      const hasLiveSession = mockSessions.some(s => s.status === 'live');
      if (hasLiveSession) {
        liveWidget.style.display = 'block';
        el.querySelector('[data-bind="liveTitle"]').textContent = 'Integration Planning Session';
        el.querySelector('[data-bind="liveSubtitle"]').innerHTML = 'TechSales Bot is active · Duration: <strong>12 min</strong> · Acme Corp Sales';
        el.querySelector('[data-bind="liveLatency"]').textContent = '~42ms · Good';
        el.querySelector('[data-bind="liveQaCount"]').textContent = '3';
      }
    } catch (err) {
      pageLoading.style.display = 'none';
      pageError.style.display = 'block';
      pageError.innerHTML = `
        <div class="empty">
          <div class="empty-icon">⚠️</div>
          <div class="empty-title">Failed to load projects</div>
          <div class="empty-desc">${err.message}</div>
        </div>
      `;
    }
  }

  function renderProjects() {
    const projectsGrid = el.querySelector('[data-bind="projectsGrid"]');
    projectsGrid.innerHTML = '';

    if (projects.length === 0) {
      projectsGrid.innerHTML = `
        <div class="empty" style="grid-column:1/-1">
          <div class="empty-icon">📁</div>
          <div class="empty-title">No projects assigned</div>
          <div class="empty-desc">Contact your admin to get assigned to a project</div>
        </div>
      `;
      return;
    }

    projects.forEach(p => {
      const card = document.createElement('div');
      card.className = 'proj-card';
      card.innerHTML = `
        <div class="proj-card-name">${p.name || 'Untitled'}</div>
        <div class="proj-card-desc">${p.description || 'No description'}</div>
        <div class="proj-card-meta">
          <span>🤖 ${p.agent_id ? 'Agent assigned' : '—'}</span>
          <span>📋 ${p.total_sessions ?? 0} sessions</span>
          <span>👥 ${p.total_users ?? 0} users</span>
        </div>
      `;
      card.addEventListener('click', () => navigate(`project/${p.project_id}`));
      projectsGrid.appendChild(card);
    });
  }

  function renderSessions() {
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
  }

  // Handle action buttons
  el.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (btn) {
      if (btn.dataset.action === 'live') navigate('live-session');
      if (btn.dataset.action === 'review') navigate('retro-session');
    }
    if (e.target.id === 'view-all-btn') navigate('session-history');
  });

  loadProjects();
  return el;
}
