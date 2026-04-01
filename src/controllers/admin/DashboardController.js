import { loadTemplate } from '../../utils/template.js';
import { StatCard } from '../../components/ui/Card.js';
import { Table } from '../../components/ui/Table.js';
import { Button } from '../../components/ui/Button.js';
import { navigate } from '../../router.js';
import { projectsApi } from '../../api/projects.js';
import { sessionsApi } from '../../api/sessions.js';
import { usersApi } from '../../api/users.js';
import { qaPairsApi } from '../../api/qaPairs.js';
import { formatDate } from '../../utils/format.js';
import { sanitize } from '../../utils/sanitize.js';

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
    'stopped': 'finished',
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

export default async function DashboardController(params) {
  const el = await loadTemplate('/templates/admin/dashboard.html', 'dashboard');

  const pageLoading = el.querySelector('[data-bind="pageLoading"]');
  const pageContent = el.querySelector('[data-bind="pageContent"]');
  const pageError = el.querySelector('[data-bind="pageError"]');
  const statsGrid = el.querySelector('[data-bind="statsGrid"]');

  let projects = [];
  let sessions = [];
  let users = [];
  let qaPairs = [];
  let projectMap = {};
  let sessionMap = {};
  let sessionPollInterval = null;

  el._cleanup = () => {
    if (sessionPollInterval) { clearInterval(sessionPollInterval); sessionPollInterval = null; }
  };

  async function loadData() {
    try {
      // Load all data in parallel
      const [projectsRes, sessionsRes, usersRes, qaRes] = await Promise.all([
        projectsApi.list(),
        sessionsApi.list({ limit: 50 }),
        usersApi.list(),
        qaPairsApi.list({ limit: 10 }),
      ]);

      projects = projectsRes.data?.items || [];
      sessions = sessionsRes.data?.items || [];
      sessions.sort((a, b) => new Date(b.created_at || b.start_time || 0) - new Date(a.created_at || a.start_time || 0));
      users = usersRes.data?.items || usersRes.data?.users || [];
      if (!Array.isArray(users)) users = [];
      qaPairs = qaRes.data?.items || [];

      // Build project lookup map
      projectMap = {};
      projects.forEach(p => {
        projectMap[p.project_id] = p.name || 'Untitled';
      });

      // Build session lookup map
      sessionMap = {};
      sessions.forEach(s => {
        sessionMap[s.session_id] = s.name || 'Untitled';
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

      // Poll sessions for status changes
      sessionPollInterval = setInterval(async () => {
        try {
          const res = await sessionsApi.list({ limit: 50 });
          const updated = res.data?.items || [];
          updated.sort((a, b) => new Date(b.created_at || b.start_time || 0) - new Date(a.created_at || a.start_time || 0));
          const changed = updated.some((u, i) => {
            const old = sessions[i];
            return !old || u.bot_status !== old.bot_status;
          }) || updated.length !== sessions.length;
          if (changed) {
            sessions = updated;
            renderSessionsTable();
            const active = sessions.filter(s => getUIStatus(s.bot_status) === 'live').length;
            renderStats(active, sessions.length, projects.length, users.length);
          }
        } catch (err) { /* ignore */ }
      }, 5000);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      pageLoading.style.display = 'none';
      pageError.style.display = 'block';
      pageError.innerHTML = '<div class="empty"><div class="empty-icon">⚠️</div><div class="empty-title">Failed to load dashboard</div><div class="empty-desc">' + sanitize(err.message) + '</div></div>';
    }
  }

  function renderStats(activeSessions, totalSessions, totalProjects, totalUsers) {
    const stats = [
      { icon: '📊', iconColor: 'red', label: 'Active Sessions', value: String(activeSessions), meta: totalSessions + ' total sessions · Click to view →', link: 'sessions', live: activeSessions > 0 },
      { icon: '🤖', iconColor: 'green', label: 'Active Agents', value: '—', meta: 'Coming soon', link: 'agents' },
      { icon: '📁', iconColor: 'amber', label: 'Projects', value: String(totalProjects), meta: totalUsers + ' total users', link: 'projects' },
      { icon: '💬', iconColor: 'cyan', label: 'Q&A Pairs', value: String(qaPairs.length), meta: 'Detected across sessions', link: 'qa' },
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
          return '<strong>' + sanitize(r.name || 'Untitled') + '</strong><div class="text-xs text-t">' + startTimeDisplay + '</div>';
        }},
        { label: 'Project', render: r => sanitize(projectMap[r.project_id] || '—') },
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
    const container = el.querySelector('[data-bind="qaTable"]');

    if (qaPairs.length === 0) {
      container.innerHTML = '<div class="card"><div class="card-hdr"><div class="text-md fw-sb">Recent Q&A Pairs</div></div><div class="card-body"><div class="empty"><div class="empty-icon">💬</div><div class="empty-title">No Q&A pairs yet</div><div class="empty-desc">Questions will appear here as they are detected in sessions</div></div></div></div>';
      return;
    }

    const qaTable = Table({
      title: 'Recent Q&A Pairs',
      actions: '<button class="btn btn-g btn-sm" data-action="viewAllQA">View All →</button>',
      columns: [
        { label: 'Question', render: r => '<div style="max-width:200px;white-space:normal;word-break:break-word;line-height:1.4"><strong>' + sanitize(r.question || '') + '</strong></div>', width: '30%' },
        { label: 'Answer', render: r => {
          const answer = r.host_answer || r.answer || '';
          const aiAnswer = r.ai_answer || r.suggested_answer || '';
          if (answer) return '<div style="max-width:240px;white-space:normal;word-break:break-word;line-height:1.4">' + sanitize(answer) + '</div>';
          if (aiAnswer) return '<div style="max-width:240px;white-space:normal;word-break:break-word;line-height:1.4;color:var(--pri-500)">💡 ' + sanitize(aiAnswer) + '</div>';
          return '<span class="text-t">—</span>';
        }, width: '35%' },
        { label: 'Session', render: r => '<span class="text-xs">' + sanitize(sessionMap[r.session_id] || '—') + '</span>', width: '15%' },
        { label: 'Time', render: r => {
          const t = r.detected_at || r.timestamp || r.created_at;
          return t ? '<span class="mono text-xs">' + formatDate(t, { hour: '2-digit', minute: '2-digit' }) + '</span>' : '—';
        }, width: '10%' },
      ],
      data: qaPairs.slice(0, 5),
    });
    container.innerHTML = '';
    container.appendChild(qaTable);
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
