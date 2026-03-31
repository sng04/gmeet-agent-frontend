import { loadTemplate } from '../../utils/template.js';
import { Table } from '../../components/ui/Table.js';
import { StatCard } from '../../components/ui/Card.js';
import { navigate } from '../../router.js';
import { projectsApi } from '../../api/projects.js';
import { sessionsApi } from '../../api/sessions.js';
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
    'stopped': 'stopping',
    'completed': 'finished',
    'failed': 'failed',
  };
  return statusMap[botStatus] || botStatus;
}

function getStatusBadge(uiStatus) {
  const badges = {
    starting: '<span class="badge b-pri"><span class="dot"></span> Starting</span>',
    live: '<span class="badge b-live"><span class="dot"></span> Live</span>',
    stopping: '<span class="badge b-warn"><span class="dot"></span> Stopping</span>',
    finished: '<span class="badge b-summary"><span class="dot"></span> Finished</span>',
    failed: '<span class="badge b-err"><span class="dot"></span> Failed</span>',
    none: '<span class="badge b-gray"><span class="dot"></span> No Bot</span>',
  };
  return badges[uiStatus] || '<span class="badge b-gray">' + uiStatus + '</span>';
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

export default async function DashboardController() {
  const el = await loadTemplate('/templates/user/dashboard.html', 'dashboard');

  const pageLoading = el.querySelector('[data-bind="pageLoading"]');
  const pageContent = el.querySelector('[data-bind="pageContent"]');
  const pageError = el.querySelector('[data-bind="pageError"]');
  const liveWidget = el.querySelector('[data-bind="liveWidget"]');
  const statsGrid = el.querySelector('[data-bind="statsGrid"]');

  let projects = [];
  let sessions = [];
  let projectMap = {};
  let sessionPollInterval = null;

  el._cleanup = () => {
    if (sessionPollInterval) { clearInterval(sessionPollInterval); sessionPollInterval = null; }
  };

  async function loadData() {
    try {
      // Load projects first
      const projectsRes = await projectsApi.list();
      projects = projectsRes.data?.items || [];
      
      // Build project lookup map
      projectMap = {};
      projects.forEach(p => {
        projectMap[p.project_id] = p.name || 'Untitled';
      });

      // Load all sessions
      const sessionsRes = await sessionsApi.list({ limit: 50 });
      sessions = sessionsRes.data?.items || [];
      sessions.sort((a, b) => new Date(b.created_at || b.start_time || 0) - new Date(a.created_at || a.start_time || 0));

      // Hide loading, show content
      pageLoading.style.display = 'none';
      pageContent.style.display = 'block';

      // Calculate and render stats
      const activeSessions = sessions.filter(s => getUIStatus(s.bot_status) === 'live').length;
      const totalSessions = sessions.length;
      const totalProjects = projects.length;

      renderStats(activeSessions, totalSessions, totalProjects);
      renderProjects();
      renderSessions();
      updateLiveWidget();

      // Fetch session counts per project (async, update cards when ready)
      Promise.all(projects.map(async (p) => {
        try {
          const sessRes = await sessionsApi.listByProject(p.project_id);
          p._sessionCount = sessRes.data?.items?.length ?? 0;
        } catch { p._sessionCount = 0; }
      })).then(() => renderProjects());

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
            renderSessions();
            updateLiveWidget();
            const active = sessions.filter(s => getUIStatus(s.bot_status) === 'live').length;
            renderStats(active, sessions.length, projects.length);
          }
        } catch (err) { /* ignore */ }
      }, 5000);
    } catch (err) {
      pageLoading.style.display = 'none';
      pageError.style.display = 'block';
      pageError.innerHTML = '<div class="empty"><div class="empty-icon">⚠️</div><div class="empty-title">Failed to load data</div><div class="empty-desc">' + sanitize(err.message) + '</div></div>';
    }
  }

  function renderStats(activeSessions, totalSessions, totalProjects) {
    const stats = [
      { icon: '📊', iconColor: 'red', label: 'Active Sessions', value: String(activeSessions), meta: totalSessions + ' total sessions', live: activeSessions > 0 },
      { icon: '🤖', iconColor: 'green', label: 'Active Agents', value: '—', meta: 'Coming soon' },
      { icon: '📁', iconColor: 'amber', label: 'Projects', value: String(totalProjects), meta: 'Assigned to you' },
      { icon: '💬', iconColor: 'cyan', label: 'Q&A Pairs', value: '—', meta: 'Coming soon' },
    ];

    statsGrid.innerHTML = '';
    stats.forEach(s => statsGrid.appendChild(StatCard(s)));
  }

  function updateLiveWidget() {
    // Find the most recent live session
    const liveSession = sessions.find(s => getUIStatus(s.bot_status) === 'live');
    
    if (liveSession) {
      liveWidget.style.display = 'block';
      const projectName = projectMap[liveSession.project_id] || 'Unknown Project';
      const duration = calculateDuration(liveSession.start_time);
      el.querySelector('[data-bind="liveTitle"]').textContent = liveSession.name || 'Live Session';
      el.querySelector('[data-bind="liveSubtitle"]').innerHTML = sanitize(projectName) + ' · Duration: <strong>' + duration + '</strong>';
      el.querySelector('[data-bind="liveLatency"]').textContent = '';
      el.querySelector('[data-bind="liveQaCount"]').textContent = '—';
      
      // Update live button with session id
      const liveBtn = el.querySelector('[data-action="openLive"]');
      if (liveBtn) {
        liveBtn.dataset.sessionId = liveSession.session_id;
      }
    } else {
      liveWidget.style.display = 'none';
    }
  }

  function renderProjects() {
    const projectsGrid = el.querySelector('[data-bind="projectsGrid"]');
    projectsGrid.innerHTML = '';

    if (projects.length === 0) {
      projectsGrid.innerHTML = '<div class="empty" style="grid-column:1/-1"><div class="empty-icon">📁</div><div class="empty-title">No projects assigned</div><div class="empty-desc">Contact your admin to get assigned to a project</div></div>';
      return;
    }

    projects.forEach(p => {
      const sessionCount = p._sessionCount ?? sessions.filter(s => s.project_id === p.project_id).length;
      const card = document.createElement('div');
      card.className = 'proj-card';
      const agentName = p.agent_name || '—';
      card.innerHTML = '<div class="proj-card-name">' + sanitize(p.name || 'Untitled') + '</div><div class="proj-card-desc">' + sanitize(p.description || 'No description') + '</div><div class="proj-card-meta"><span>🤖 ' + sanitize(agentName) + '</span><span>📋 ' + sessionCount + ' sessions</span></div>';
      card.addEventListener('click', () => navigate('project/' + p.project_id));
      projectsGrid.appendChild(card);
    });
  }

  function renderSessions() {
    const container = el.querySelector('[data-bind="sessionsTable"]');
    container.innerHTML = '';

    if (sessions.length === 0) {
      container.innerHTML = '<div class="empty"><div class="empty-icon">📋</div><div class="empty-title">No sessions yet</div><div class="empty-desc">Create a session from one of your projects</div></div>';
      return;
    }

    const sessionsTable = Table({
      title: 'Recent Sessions',
      columns: [
        { 
          label: 'Session', 
          render: r => {
            const startTimeDisplay = r.start_time ? formatDate(r.start_time, { hour: '2-digit', minute: '2-digit' }) : '—';
            return '<strong class="text-p">' + sanitize(r.name || 'Untitled') + '</strong><div class="text-xs text-t">' + startTimeDisplay + '</div>';
          }
        },
        { 
          label: 'Status', 
          render: r => getStatusBadge(getUIStatus(r.bot_status))
        },
        { 
          label: 'Project', 
          render: r => '<span class="text-sm">' + sanitize(projectMap[r.project_id] || '—') + '</span>'
        },
        { label: 'Q&A', render: () => '—' },
        { 
          label: 'Duration', 
          render: r => {
            const uiStatus = getUIStatus(r.bot_status);
            if (uiStatus === 'live') return calculateDuration(r.start_time) + ' (ongoing)';
            if ((uiStatus === 'finished' || uiStatus === 'failed' || uiStatus === 'stopping') && r.start_time) {
              return calculateDuration(r.start_time, r.end_time);
            }
            return '—';
          },
          className: 'mono text-xs' 
        },
        { 
          label: '', 
          render: r => {
            const uiStatus = getUIStatus(r.bot_status);
            if (uiStatus === 'live') {
              return '<button class="btn btn-live btn-sm" data-action="live" data-session-id="' + r.session_id + '">Live →</button>';
            }
            if (uiStatus === 'finished') {
              return '<button class="btn btn-review btn-sm" data-action="review" data-session-id="' + r.session_id + '">Review</button>';
            }
            return '';
          }, 
          className: 'text-right' 
        },
      ],
      data: [...sessions].sort((a, b) => new Date(b.created_at || b.start_time || 0) - new Date(a.created_at || a.start_time || 0)).slice(0, 5),
    });
    container.appendChild(sessionsTable);
  }

  // Handle action buttons
  el.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    
    const action = btn.dataset.action;
    const sessionId = btn.dataset.sessionId;
    
    if (action === 'live' || action === 'openLive') {
      navigate('live?sessionId=' + sessionId);
    } else if (action === 'review') {
      navigate('session/' + sessionId);
    }
  });

  loadData();
  return el;
}
