import { loadTemplate } from '../../utils/template.js';
import { StatCard } from '../../components/ui/Card.js';
import { Table } from '../../components/ui/Table.js';
import { Button } from '../../components/ui/Button.js';
import { navigate } from '../../router.js';
import { projectsApi } from '../../api/projects.js';
import { sessionsApi } from '../../api/sessions.js';
import { usersApi } from '../../api/users.js';
import { formatDate } from '../../utils/format.js';

// Bot status to UI status mapping
function getUIStatus(botStatus) {
  const statusMap = {
    'none': 'none',
    'pending': 'starting',
    'queued': 'starting',
    'starting': 'starting',
    'joining': 'starting',
    'in_meeting': 'live',
    'running': 'live',
    'stopping': 'stopping',
    'stopped': 'stopping',
    'completed': 'finished',
    'failed': 'failed',
  };
  return statusMap[botStatus] || botStatus;
}

function calculateDuration(startTime, endTime = null) {
  if (!startTime) return '—';
  const start = new Date(startTime);
  const end = endTime ? new Date(endTime) : new Date();
  const diffMs = end - start;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return diffMins + ' min';
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  return mins > 0 ? hours + 'h ' + mins + 'm' : hours + 'h';
}

const mockQA = [
  { question: 'What kind of encryption do you use for data at rest?', answer: 'We use AES-256 encryption for all data at rest, managed through AWS KMS...', session: 'Q3 Architecture Review', time: '09:05:32', conf: 92 },
  { question: 'How does the system handle concurrent users?', answer: 'Our system uses auto-scaling through ECS Fargate, dynamically adjusting...', session: 'Q3 Architecture Review', time: '09:12:18', conf: 88 },
  { question: 'Can we integrate this with our existing Slack workspace?', answer: 'Currently, the system focuses on Google Meet integration. Slack...', session: 'Integration Planning', time: '10:35:41', conf: 85 },
];

export default async function DashboardController(params) {
  const el = await loadTemplate('/templates/admin/dashboard.html', 'dashboard');

  const pageLoading = el.querySelector('[data-bind="pageLoading"]');
  const pageContent = el.querySelector('[data-bind="pageContent"]');
  const pageError = el.querySelector('[data-bind="pageError"]');
  const statsGrid = el.querySelector('[data-bind="statsGrid"]');

  let projects = [];
  let sessions = [];
  let users = [];
  let projectMap = {};

  async function loadData() {
    try {
      // Load all data in parallel
      const [projectsRes, sessionsRes, usersRes] = await Promise.all([
        projectsApi.list(),
        sessionsApi.list({ limit: 50 }),
        usersApi.list()
      ]);

      projects = projectsRes.data?.items || [];
      sessions = sessionsRes.data?.items || [];
      users = usersRes.data?.items || usersRes.data?.users || [];
      if (!Array.isArray(users)) users = [];

      // Build project lookup map
      projectMap = {};
      projects.forEach(p => {
        projectMap[p.project_id] = p.name || 'Untitled';
      });

      // Calculate stats
      const activeSessions = sessions.filter(s => getUIStatus(s.bot_status) === 'live').length;
      const totalSessions = sessions.length;
      const totalProjects = projects.length;
      const totalUsers = users.length;

      // Hide loading, show content
      pageLoading.style.display = 'none';
      pageContent.style.display = 'block';

      renderStats(activeSessions, totalSessions, totalProjects, totalUsers);
      renderSessionsTable();
      renderQATable();
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      pageLoading.style.display = 'none';
      pageError.style.display = 'block';
      pageError.innerHTML = '<div class="empty"><div class="empty-icon">⚠️</div><div class="empty-title">Failed to load dashboard</div><div class="empty-desc">' + err.message + '</div></div>';
    }
  }

  function renderStats(activeSessions, totalSessions, totalProjects, totalUsers) {
    const stats = [
      { icon: '📊', iconColor: 'red', label: 'Active Sessions', value: String(activeSessions), meta: totalSessions + ' total sessions · Click to view →', link: 'sessions', live: activeSessions > 0 },
      { icon: '🤖', iconColor: 'green', label: 'Active Agents', value: '—', meta: 'Coming soon', link: 'agents' },
      { icon: '📁', iconColor: 'amber', label: 'Projects', value: String(totalProjects), meta: totalUsers + ' total users', link: 'projects' },
      { icon: '💬', iconColor: 'cyan', label: 'Q&A Pairs', value: '—', meta: 'Coming soon', link: 'sessions' },
    ];

    statsGrid.innerHTML = '';
    stats.forEach(s => statsGrid.appendChild(StatCard(s)));
  }

  function renderSessionsTable() {
    const stateMap = { live: 'b-live', starting: 'b-pri', stopping: 'b-warn', finished: 'b-summary', failed: 'b-err', none: 'b-gray' };
    const stateLabel = { live: 'Live', starting: 'Starting', stopping: 'Stopping', finished: 'Finished', failed: 'Failed', none: 'No Bot' };

    const sessionsTable = Table({
      title: 'Recent Sessions',
      actions: '<button class="btn btn-g btn-sm" data-action="viewAllSessions">View All →</button>',
      columns: [
        { label: 'Session', render: r => {
          const startTimeDisplay = r.start_time ? formatDate(r.start_time, { hour: '2-digit', minute: '2-digit' }) : '—';
          return '<strong>' + (r.name || 'Untitled') + '</strong><div class="text-xs text-t">' + startTimeDisplay + '</div>';
        }},
        { label: 'Project', render: r => projectMap[r.project_id] || '—' },
        { label: 'Status', render: r => {
          const uiStatus = getUIStatus(r.bot_status);
          return '<span class="badge ' + (stateMap[uiStatus] || 'b-gray') + '"><span class="dot"></span> ' + (stateLabel[uiStatus] || uiStatus) + '</span>';
        }},
        { label: 'Q&A', render: () => '—' },
        { label: 'Duration', render: r => {
          const uiStatus = getUIStatus(r.bot_status);
          if (uiStatus === 'live') return calculateDuration(r.start_time) + ' (ongoing)';
          if ((uiStatus === 'finished' || uiStatus === 'failed' || uiStatus === 'stopping') && r.start_time) {
            return calculateDuration(r.start_time, r.end_time);
          }
          return '—';
        }, className: 'mono text-xs' },
      ],
      data: [...sessions].sort((a, b) => new Date(b.created_at || b.start_time || 0) - new Date(a.created_at || a.start_time || 0)).slice(0, 5),
    });
    el.querySelector('[data-bind="sessionsTable"]').innerHTML = '';
    el.querySelector('[data-bind="sessionsTable"]').appendChild(sessionsTable);
  }

  function renderQATable() {
    const qaTable = Table({
      title: 'Recent Q&A Pairs',
      actions: '<button class="btn btn-g btn-sm" data-action="viewAllQA">View All →</button>',
      columns: [
        { label: 'Question', render: r => '<strong style="max-width:220px" class="truncate">' + r.question + '</strong>', width: '25%' },
        { label: 'Answer', render: r => '<span style="max-width:280px" class="truncate">' + r.answer + '</span>', width: '30%' },
        { label: 'Session', key: 'session' },
        { label: 'Time', key: 'time', className: 'mono text-xs' },
        { label: 'Conf.', render: r => '<span class="badge ' + (r.conf >= 90 ? 'b-ok' : 'b-warn') + '">' + r.conf + '%</span>' },
      ],
      data: mockQA,
    });
    el.querySelector('[data-bind="qaTable"]').innerHTML = '';
    el.querySelector('[data-bind="qaTable"]').appendChild(qaTable);
  }

  loadData();

  // Handle action clicks
  el.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    if (action === 'viewAllSessions') navigate('sessions');
    if (action === 'viewAllQA') navigate('qa');
  });

  return el;
}
