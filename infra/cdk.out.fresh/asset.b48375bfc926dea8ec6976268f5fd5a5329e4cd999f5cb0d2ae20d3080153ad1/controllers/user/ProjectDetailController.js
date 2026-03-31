import { loadTemplate } from '../../utils/template.js';
import { Button } from '../../components/ui/Button.js';
import { navigate } from '../../router.js';
import { projectsApi } from '../../api/projects.js';
import { sessionsApi } from '../../api/sessions.js';
import { kbDocumentsApi } from '../../api/kbDocuments.js';
import { filesApi } from '../../api/files.js';
import { formatDate } from '../../utils/format.js';
import { sanitize } from '../../utils/sanitize.js';

// Mock data for Q&A (will be replaced later)
const mockQA = [
  { session: 'Integration Planning', date: 'Today, 10:31 AM', question: 'Can we integrate this with our existing Slack workspace?', answer: 'Currently, the system focuses on Google Meet integration. Slack integration is not in the current scope, but the architecture supports future webhook-based integrations.', confidence: 94 },
  { session: 'Q3 Architecture Review', date: 'Mar 15, 09:05 AM', question: 'What kind of encryption do you use for data at rest?', answer: 'We use AES-256 encryption for all data at rest, managed through AWS KMS. All keys are rotated annually.', confidence: 92 },
];

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
  return badges[uiStatus] || `<span class="badge b-gray">${uiStatus}</span>`;
}

function calculateDuration(startTime, endTime = null) {
  if (!startTime) return '—';
  const start = new Date(startTime);
  const end = endTime ? new Date(endTime) : new Date();
  const diffMs = end - start;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins} min`;
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

export default async function ProjectDetailController(params) {
  const el = await loadTemplate('/templates/user/project-detail.html', 'project-detail');
  const projectId = params?.id;

  const pageLoading = el.querySelector('[data-bind="pageLoading"]');
  const pageContent = el.querySelector('[data-bind="pageContent"]');
  const pageError = el.querySelector('[data-bind="pageError"]');

  if (!projectId) {
    pageLoading.style.display = 'none';
    pageError.style.display = 'block';
    pageError.innerHTML = `
      <div class="empty">
        <div class="empty-icon">⚠️</div>
        <div class="empty-title">Project not found</div>
        <div class="empty-desc">No project ID provided</div>
      </div>
    `;
    return el;
  }

  let project = null;
  let sessions = [];
  let kbDocuments = [];
  let sessionPollInterval = null;

  function startSessionPolling() {
    if (sessionPollInterval) return;
    sessionPollInterval = setInterval(async () => {
      try {
        const res = await sessionsApi.listByProject(projectId);
        const updated = res.data?.items || [];
        updated.sort((a, b) => new Date(b.created_at || b.start_time || 0) - new Date(a.created_at || a.start_time || 0));
        const changed = updated.some((u, i) => {
          const old = sessions[i];
          return !old || u.bot_status !== old.bot_status;
        }) || updated.length !== sessions.length;
        if (changed) {
          sessions = updated;
          renderSessionsTab();
          updateLiveBanner();
          el.querySelector('[data-bind="statSessions"]').textContent = sessions.length;
        }
      } catch (err) { /* ignore */ }
    }, 5000);
  }

  el._cleanup = () => {
    if (sessionPollInterval) { clearInterval(sessionPollInterval); sessionPollInterval = null; }
  };

  // Breadcrumb back
  el.querySelector('[data-action="backNav"]').addEventListener('click', (e) => {
    e.preventDefault();
    navigate('');
  });

  async function loadProject() {
    try {
      const res = await projectsApi.get(projectId);
      project = res.data;

      // Hide loading, show content
      pageLoading.style.display = 'none';
      pageContent.style.display = 'block';

      populateProjectData();
      setupEventListeners();
      loadSessions();
    } catch (err) {
      pageLoading.style.display = 'none';
      pageError.style.display = 'block';
      pageError.innerHTML = `
        <div class="empty">
          <div class="empty-icon">⚠️</div>
          <div class="empty-title">Failed to load project</div>
          <div class="empty-desc">${sanitize(err.message)}</div>
        </div>
      `;
    }
  }

  async function loadSessions() {
    const sessionsLoading = el.querySelector('[data-bind="sessionsLoading"]');
    const sessionsContent = el.querySelector('[data-bind="sessionsContent"]');
    const sessionsEmpty = el.querySelector('[data-bind="sessionsEmpty"]');
    const sessionsError = el.querySelector('[data-bind="sessionsError"]');

    try {
      const res = await sessionsApi.listByProject(projectId);
      sessions = res.data?.items || [];
      sessions.sort((a, b) => new Date(b.created_at || b.start_time || 0) - new Date(a.created_at || a.start_time || 0));

      sessionsLoading.style.display = 'none';

      if (sessions.length === 0) {
        sessionsEmpty.style.display = 'block';
      } else {
        sessionsContent.style.display = 'block';
        renderSessionsTab();
        updateLiveBanner();
        startSessionPolling();
      }

      // Update stats
      el.querySelector('[data-bind="statSessions"]').textContent = sessions.length;
    } catch (err) {
      sessionsLoading.style.display = 'none';
      sessionsError.style.display = 'block';
      sessionsError.innerHTML = `
        <div class="empty">
          <div class="empty-icon">⚠️</div>
          <div class="empty-title">Failed to load sessions</div>
          <div class="empty-desc">${sanitize(err.message)}</div>
        </div>
      `;
    }
  }

  function updateLiveBanner() {
    const liveBanner = el.querySelector('[data-bind="liveBanner"]');
    const liveSession = sessions.find(s => getUIStatus(s.bot_status) === 'live');
    
    if (liveSession && liveBanner) {
      liveBanner.style.display = 'block';
      liveBanner.innerHTML = `
        <div class="card-body" style="padding:14px 20px">
          <div class="flex items-c gap-3">
            <span class="badge b-live" style="font-size:12px;padding:4px 10px"><span class="dot"></span> Live Session</span>
            <div>
              <div class="text-sm fw-sb text-p">${sanitize(liveSession.name || 'Untitled Session')}</div>
              <div class="text-xs text-t">Started ${liveSession.start_time ? calculateDuration(liveSession.start_time) + ' ago' : 'recently'}</div>
            </div>
            <button class="btn btn-live btn-sm" style="margin-left:auto" data-action="openLive" data-session-id="${liveSession.session_id}">Open Live View →</button>
          </div>
        </div>
      `;
    } else if (liveBanner) {
      liveBanner.style.display = 'none';
    }
  }

  async function populateProjectData() {
    // Header
    el.querySelector('[data-bind="projectName"]').textContent = project.name || 'Untitled';
    el.querySelector('[data-bind="title"]').textContent = project.name || 'Untitled';
    el.querySelector('[data-bind="description"]').textContent = project.description || 'No description';

    // Stats
    el.querySelector('[data-bind="statSessions"]').textContent = project.total_sessions ?? 0;
    el.querySelector('[data-bind="statQA"]').textContent = '—';

    el.querySelector('[data-bind="statAgent"]').textContent = project.agent_name || '—';
    el.querySelector('[data-bind="qaTotalVal"]').textContent = '—';

    // KB
    loadKBDocuments();

    // Hide live banner initially (will be shown if there's a live session)
    const liveBanner = el.querySelector('[data-bind="liveBanner"]');
    if (liveBanner) liveBanner.style.display = 'none';

    // Render Q&A tab (still mock)
    renderQATab();

    // Actions - pass projectId to session create
    el.querySelector('[data-bind="actions"]').appendChild(
      Button({ text: '+ New Session', variant: 'p', onClick: () => navigate(`session/create?projectId=${projectId}`) })
    );
  }

  function renderSessionsTab() {
    const tbody = el.querySelector('[data-bind="sessionsBody"]');
    tbody.innerHTML = sessions.map(s => {
      const uiStatus = getUIStatus(s.bot_status);
      let duration = '—';
      if (uiStatus === 'live') {
        duration = calculateDuration(s.start_time) + ' (ongoing)';
      } else if ((uiStatus === 'finished' || uiStatus === 'failed' || uiStatus === 'stopping') && s.start_time) {
        duration = calculateDuration(s.start_time, s.end_time);
      }
      const startTimeDisplay = s.start_time ? formatDate(s.start_time, { hour: '2-digit', minute: '2-digit' }) : '—';
      const meetLinkHtml = s.meeting_link 
        ? `<a href="${sanitize(s.meeting_link)}" target="_blank" class="text-pri">${sanitize(s.meeting_link.replace('https://', ''))}</a>`
        : '—';

      let actionHtml = '';
      if (uiStatus === 'live') {
        actionHtml = `<button class="btn btn-live btn-sm" data-action="live" data-session-id="${s.session_id}">Live →</button>`;
      } else if (uiStatus === 'finished') {
        actionHtml = `<button class="btn btn-review btn-sm" data-action="review" data-session-id="${s.session_id}">Review</button>`;
      }

      return `
        <tr>
          <td>
            <strong class="text-p">${sanitize(s.name || 'Untitled')}</strong>
            <div class="text-xs text-t">${startTimeDisplay}</div>
          </td>
          <td>${getStatusBadge(uiStatus)}</td>
          <td class="mono text-xs">${meetLinkHtml}</td>
          <td>—</td>
          <td class="mono text-xs">${duration}</td>
          <td>
            <div class="session-action-btns">${actionHtml}</div>
          </td>
        </tr>
      `;
    }).join('');

    el.querySelector('[data-bind="sessionsFoot"]').innerHTML = `<span>${sessions.length} session${sessions.length !== 1 ? 's' : ''}</span>`;
  }

  function getConfidenceBadge(conf) {
    if (conf >= 90) return `<span class="badge b-ok">${conf}%</span>`;
    if (conf >= 80) return `<span class="badge b-warn">${conf}%</span>`;
    return `<span class="badge b-err">${conf}%</span>`;
  }

  function renderQATab() {
    el.querySelector('[data-bind="qaCards"]').innerHTML = mockQA.map(qa => `
      <div class="qa">
        <div class="flex jc-b items-s mb-4">
          <div class="text-xs text-t"><strong>${sanitize(qa.session)}</strong> · ${qa.date}</div>
          ${getConfidenceBadge(qa.confidence)}
        </div>
        <div class="qa-q"><div class="qi">Q</div><div class="qa-txt q">${sanitize(qa.question)}</div></div>
        <div class="qa-a"><div class="ai">A</div><div class="qa-txt">${sanitize(qa.answer)}</div></div>
      </div>
    `).join('');
  }

  function renderKBTab() {
    const tbody = el.querySelector('[data-bind="kbDocsBody"]');
    const kbContent = el.querySelector('[data-bind="kbContent"]');
    const kbEmpty = el.querySelector('[data-bind="kbEmpty"]');
    const kbDocCount = el.querySelector('[data-bind="kbDocCount"]');

    if (kbDocuments.length === 0) {
      if (kbContent) kbContent.style.display = 'none';
      if (kbEmpty) kbEmpty.style.display = 'block';
      if (kbDocCount) kbDocCount.textContent = '';
      return;
    }

    if (kbContent) kbContent.style.display = 'block';
    if (kbEmpty) kbEmpty.style.display = 'none';
    if (kbDocCount) kbDocCount.textContent = kbDocuments.length + ' document' + (kbDocuments.length !== 1 ? 's' : '');

    const getIcon = (name) => {
      if (name?.endsWith('.pdf')) return '📕';
      if (name?.endsWith('.md')) return '📘';
      return '📄';
    };

    const getStatusBadgeKB = (status) => {
      const map = { indexed: 'b-ok', pending: 'b-warn', failed: 'b-err', processing: 'b-pri' };
      return '<span class="badge ' + (map[status] || 'b-gray') + '"><span class="dot"></span> ' + (status || 'unknown') + '</span>';
    };

    tbody.innerHTML = kbDocuments.map(doc => {
      const uploaded = doc.created_at ? formatDate(doc.created_at) : '—';
      return '<tr>'
        + '<td><div class="flex items-c gap-3">' + getIcon(doc.file_name) + ' <a href="#" class="text-sm fw-m text-pri" style="text-decoration:none" data-action="kbDownload" data-s3-key="' + (doc.s3_key || '') + '">' + sanitize(doc.file_name || '—') + '</a></div></td>'
        + '<td class="text-xs text-t">' + sanitize(doc.description || '—') + '</td>'
        + '<td>' + getStatusBadgeKB(doc.status) + '</td>'
        + '<td class="text-xs text-t">' + uploaded + '</td>'
        + '</tr>';
    }).join('');
  }

  async function loadKBDocuments() {
    const kbLoading = el.querySelector('[data-bind="kbLoading"]');
    try {
      const res = await kbDocumentsApi.list(projectId);
      const d = res.data;
      kbDocuments = Array.isArray(d) ? d : (d?.items || d?.documents || (Array.isArray(d?.data) ? d.data : []));
      if (kbLoading) kbLoading.style.display = 'none';
      renderKBTab();
    } catch (err) {
      console.warn('Failed to load KB documents:', err);
      kbDocuments = [];
      if (kbLoading) kbLoading.style.display = 'none';
      renderKBTab();
    }
  }

  function setupEventListeners() {
    // Tab switching
    el.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        el.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        el.querySelectorAll('.tab-c').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        el.querySelector(`#tab-${tab.dataset.tab}`).classList.add('active');
      });
    });

    // Handle action buttons (delegated)
    el.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;

      const action = btn.dataset.action;
      const sessionId = btn.dataset.sessionId;

      if (action === 'live' || action === 'openLive') {
        navigate(`live?sessionId=${sessionId}`);
      } else if (action === 'review') {
        navigate(`session/${sessionId}`);
      }
    });

    // KB download (delegated)
    el.addEventListener('click', async (e) => {
      const downloadLink = e.target.closest('[data-action="kbDownload"]');
      if (downloadLink) {
        e.preventDefault();
        const s3Key = downloadLink.dataset.s3Key;
        if (!s3Key) return;
        try {
          const res = await filesApi.getDownloadUrl(s3Key);
          const url = res.data?.download_url;
          if (url) window.open(url, '_blank');
        } catch (err) { alert('Failed to get download link: ' + err.message); }
      }
    });
  }

  loadProject();
  return el;
}
