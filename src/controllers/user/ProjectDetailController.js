import { loadTemplate } from '../../utils/template.js';
import { Button } from '../../components/ui/Button.js';
import { navigate } from '../../router.js';
import { projectsApi } from '../../api/projects.js';

// Mock data for sessions, Q&A, and docs
const mockSessions = [
  { id: '1', purpose: 'Integration Planning', status: 'live', agent: 'TechSales Bot', qa: 3, duration: '12 min (ongoing)', date: 'Started today 10:30 AM' },
  { id: '2', purpose: 'Q3 Architecture Review', status: 'finished', agent: 'TechSales Bot', qa: 8, duration: '47 min', date: 'Mar 15, 2026' },
  { id: '3', purpose: 'Security Compliance Review', status: 'ended', agent: 'TechSales Bot', qa: 0, duration: '—', date: 'Mar 12, 2026' },
];

const mockQA = [
  { session: 'Integration Planning', date: 'Today, 10:31 AM', question: 'Can we integrate this with our existing Slack workspace?', answer: 'Currently, the system focuses on Google Meet integration. Slack integration is not in the current scope, but the architecture supports future webhook-based integrations.', confidence: 94 },
  { session: 'Q3 Architecture Review', date: 'Mar 15, 09:05 AM', question: 'What kind of encryption do you use for data at rest?', answer: 'We use AES-256 encryption for all data at rest, managed through AWS KMS. All keys are rotated annually.', confidence: 92 },
  { session: 'Q3 Architecture Review', date: 'Mar 15, 09:12 AM', question: 'How does the system handle concurrent users?', answer: 'Our system uses auto-scaling through ECS Fargate, supporting up to 500 concurrent sessions with sub-3-second latency.', confidence: 88 },
];

const mockDocs = [
  { name: 'Platform Architecture Overview.pdf', type: 'pdf', size: '2.4 MB', status: 'indexed', uploaded: 'Mar 10, 2026' },
  { name: 'API Reference Guide.docx', type: 'docx', size: '1.1 MB', status: 'indexed', uploaded: 'Mar 10, 2026' },
  { name: 'Security Compliance Checklist.pdf', type: 'pdf', size: '890 KB', status: 'indexed', uploaded: 'Mar 12, 2026' },
];

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

  function populateProjectData() {
    // Header
    el.querySelector('[data-bind="projectName"]').textContent = project.name || 'Untitled';
    el.querySelector('[data-bind="title"]').textContent = project.name || 'Untitled';
    el.querySelector('[data-bind="description"]').textContent = project.description || 'No description';

    // Stats
    el.querySelector('[data-bind="statAgent"]').textContent = project.agent_id ? 'Agent assigned' : '—';
    el.querySelector('[data-bind="statSessions"]').textContent = project.total_sessions ?? 0;
    
    // Calculate total Q&A from mock (will be replaced with real data later)
    const totalQA = mockSessions.reduce((sum, s) => sum + s.qa, 0);
    el.querySelector('[data-bind="statQA"]').textContent = totalQA;
    el.querySelector('[data-bind="qaTotalVal"]').textContent = totalQA;

    // KB
    el.querySelector('[data-bind="kbFolderName"]').textContent = project.name || 'Project';
    el.querySelector('[data-bind="kbFolderMeta"]').textContent = `${mockDocs.length} documents · Last updated Mar 12, 2026`;
    el.querySelector('[data-bind="kbFolderTag"]').textContent = `prefix: ${project.name?.toLowerCase().replace(/\s+/g, '-') || 'project'}`;

    // Live banner (show only if there's a live session - mock for now)
    const hasLiveSession = mockSessions.some(s => s.status === 'live');
    const liveBanner = el.querySelector('[data-bind="liveBanner"]');
    if (liveBanner) {
      liveBanner.style.display = hasLiveSession ? 'block' : 'none';
    }

    // Render tabs content
    renderSessionsTab();
    renderQATab();
    renderKBTab();

    // Actions
    el.querySelector('[data-bind="actions"]').appendChild(
      Button({ text: '+ New Session', variant: 'p', onClick: () => navigate('session-create') })
    );
  }

  function getStatusBadge(status) {
    const badges = {
      live: '<span class="badge b-live"><span class="dot"></span> Live</span>',
      finished: '<span class="badge b-summary"><span class="dot"></span> Finished</span>',
      ended: '<span class="badge b-ended"><span class="dot"></span> Ended</span>',
    };
    return badges[status] || '';
  }

  function getConfidenceBadge(conf) {
    if (conf >= 90) return `<span class="badge b-ok">${conf}%</span>`;
    if (conf >= 80) return `<span class="badge b-warn">${conf}%</span>`;
    return `<span class="badge b-err">${conf}%</span>`;
  }

  function renderSessionsTab() {
    el.querySelector('[data-bind="sessionsBody"]').innerHTML = mockSessions.map(s => `
      <tr>
        <td><strong class="text-p">${s.purpose}</strong><div class="text-xs text-t">${s.date}</div></td>
        <td>${getStatusBadge(s.status)}</td>
        <td>${s.agent}</td>
        <td>${s.qa}</td>
        <td class="mono text-xs">${s.duration}</td>
        <td>
          <div class="session-action-btns">
            ${s.status === 'live' ? '<button class="btn btn-live btn-sm" data-action="live">Live →</button>' : ''}
            ${s.status === 'finished' ? '<button class="btn btn-review btn-sm" data-action="review">Review</button>' : ''}
          </div>
        </td>
      </tr>
    `).join('');
    el.querySelector('[data-bind="sessionsFoot"]').innerHTML = `<span>${mockSessions.length} sessions</span>`;
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
    // Live banner button
    el.querySelector('[data-action="openLive"]')?.addEventListener('click', () => navigate('live-session'));

    // Tab switching
    el.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        el.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        el.querySelectorAll('.tab-c').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        el.querySelector(`#tab-${tab.dataset.tab}`).classList.add('active');
      });
    });

    // Handle action buttons
    el.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (btn) {
        if (btn.dataset.action === 'live') navigate('live-session');
        if (btn.dataset.action === 'review') navigate('retro-session');
      }
    });
  }

  loadProject();
  return el;
}
