import { loadTemplate } from '../../utils/template.js';
import { Table } from '../../components/ui/Table.js';
import { navigate } from '../../router.js';
import { projectsApi } from '../../api/projects.js';
import { sessionsApi } from '../../api/sessions.js';
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

  let projects = [];
  let sessions = [];
  let projectMap = {}; // { project_id: project_name }

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

      // Hide loading, show content
      pageLoading.style.display = 'none';
      pageContent.style.display = 'block';

      renderProjects();
      renderSessions();
      updateLiveWidget();
    } catch (err) {
      pageLoading.style.display = 'none';
      pageError.style.display = 'block';
      pageError.innerHTML = '<div class="empty"><div class="empty-icon">⚠️</div><div class="empty-title">Failed to load data</div><div class="empty-desc">' + err.message + '</div></div>';
    }
  }

  function updateLiveWidget() {
    // Find the most recent live session
    const liveSession = sessions.find(s => getUIStatus(s.bot_status) === 'live');
    
    if (liveSession) {
      liveWidget.style.display = 'block';
      const projectName = projectMap[liveSession.project_id] || 'Unknown Project';
      const duration = calculateDuration(liveSession.start_time);
      
      el.querySelector('[data-bind="liveTitle"]').textContent = liveSession.name || 'Live Session';
      el.querySelector('[data-bind="liveSubtitle"]').innerHTML = projectName + ' · Duration: <strong>' + duration + '</strong>';
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
      const card = document.createElement('div');
      card.className = 'proj-card';
      card.innerHTML = '<div class="proj-card-name">' + (p.name || 'Untitled') + '</div><div class="proj-card-desc">' + (p.description || 'No description') + '</div><div class="proj-card-meta"><span>🤖 ' + (p.agent_id ? 'Agent assigned' : '—') + '</span><span>📋 ' + (p.total_sessions ?? 0) + ' sessions</span><span>👥 ' + (p.total_users ?? 0) + ' users</span></div>';
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
            return '<strong class="text-p">' + (r.name || 'Untitled') + '</strong><div class="text-xs text-t">' + startTimeDisplay + '</div>';
          }
        },
        { 
          label: 'Status', 
          render: r => getStatusBadge(getUIStatus(r.bot_status))
        },
        { 
          label: 'Project', 
          render: r => '<span class="text-sm">' + (projectMap[r.project_id] || '—') + '</span>'
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
      data: sessions,
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
