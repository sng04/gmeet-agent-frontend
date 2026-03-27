import { loadTemplate } from '../../utils/template.js';
import { Button } from '../../components/ui/Button.js';
import { navigate } from '../../router.js';
import { projectsApi } from '../../api/projects.js';
import { sessionsApi } from '../../api/sessions.js';
import { formatDate } from '../../utils/format.js';

// Mock data for Q&A and docs (will be replaced later)
const mockQA = [
  { session: 'Integration Planning', date: 'Today, 10:31 AM', question: 'Can we integrate this with our existing Slack workspace?', answer: 'Currently, the system focuses on Google Meet integration. Slack integration is not in the current scope, but the architecture supports future webhook-based integrations.', confidence: 94 },
  { session: 'Q3 Architecture Review', date: 'Mar 15, 09:05 AM', question: 'What kind of encryption do you use for data at rest?', answer: 'We use AES-256 encryption for all data at rest, managed through AWS KMS. All keys are rotated annually.', confidence: 92 },
];

const mockDocs = [
  { name: 'Platform Architecture Overview.pdf', type: 'pdf', size: '2.4 MB', status: 'indexed', uploaded: 'Mar 10, 2026' },
  { name: 'API Reference Guide.docx', type: 'docx', size: '1.1 MB', status: 'indexed', uploaded: 'Mar 10, 2026' },
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
          <div class="empty-desc">${err.message}</div>
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

      sessionsLoading.style.display = 'none';

      if (sessions.length === 0) {
        sessionsEmpty.style.display = 'block';
      } else {
        sessionsContent.style.display = 'block';
        renderSessionsTab();
        updateLiveBanner();
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
          <div class="empty-desc">${err.message}</div>
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
              <div class="text-sm fw-sb text-p">${liveSession.name || 'Untitled Session'}</div>
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

  function populateProjectData() {
    // Header
    el.querySelector('[data-bind="projectName"]').textContent = project.name || 'Untitled';
    el.querySelector('[data-bind="title"]').textContent = project.name || 'Untitled';
    el.querySelector('[data-bind="description"]').textContent = project.description || 'No description';

    // Stats
    el.querySelector('[data-bind="statAgent"]').textContent = project.agent_id ? 'Agent assigned' : '—';
    el.querySelector('[data-bind="statSessions"]').textContent = project.total_sessions ?? 0;
    el.querySelector('[data-bind="statQA"]').textContent = '—';
    el.querySelector('[data-bind="qaTotalVal"]').textContent = '—';

    // KB
    el.querySelector('[data-bind="kbFolderName"]').textContent = project.name || 'Project';
    el.querySelector('[data-bind="kbFolderMeta"]').textContent = `${mockDocs.length} documents · Last updated Mar 12, 2026`;
    el.querySelector('[data-bind="kbFolderTag"]').textContent = `prefix: ${project.name?.toLowerCase().replace(/\s+/g, '-') || 'project'}`;

    // Hide live banner initially (will be shown if there's a live session)
    const liveBanner = el.querySelector('[data-bind="liveBanner"]');
    if (liveBanner) liveBanner.style.display = 'none';

    // Render Q&A and KB tabs (still mock)
    renderQATab();
    renderKBTab();

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
        ? `<a href="${s.meeting_link}" target="_blank" class="text-pri">${s.meeting_link.replace('https://', '')}</a>`
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
            <strong class="text-p">${s.name || 'Untitled'}</strong>
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
          <div class="text-xs text-t"><strong>${qa.session}</strong> · ${qa.date}</div>
          ${getConfidenceBadge(qa.confidence)}
        </div>
        <div class="qa-q"><div class="qi">Q</div><div class="qa-txt q">${qa.question}</div></div>
        <div class="qa-a"><div class="ai">A</div><div class="qa-txt">${qa.answer}</div></div>
      </div>
    `).join('');
  }

  function renderKBTab() {
    el.querySelector('[data-bind="kbDocsBody"]').innerHTML = mockDocs.map((doc, i) => `
      <tr>
        <td style="padding:12px 20px;${i < mockDocs.length - 1 ? 'border-bottom:1px solid var(--gray-100)' : ''}">
          <div class="flex items-c gap-3">
            <div class="doc-icon ${doc.type}">${doc.type === 'pdf' ? '📕' : '📘'}</div>
            <div class="text-sm fw-m text-p">${doc.name}</div>
          </div>
        </td>
        <td style="padding:12px 20px;font-family:var(--mono);font-size:13px;${i < mockDocs.length - 1 ? 'border-bottom:1px solid var(--gray-100)' : ''}">${doc.size}</td>
        <td style="padding:12px 20px;${i < mockDocs.length - 1 ? 'border-bottom:1px solid var(--gray-100)' : ''}"><span class="badge b-indexed"><span class="dot"></span> ${doc.status}</span></td>
        <td style="padding:12px 20px;font-size:12px;color:var(--gray-500);${i < mockDocs.length - 1 ? 'border-bottom:1px solid var(--gray-100)' : ''}">${doc.uploaded}</td>
      </tr>
    `).join('');
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
  }

  loadProject();
  return el;
}
