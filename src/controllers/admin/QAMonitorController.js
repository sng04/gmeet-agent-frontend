import { loadTemplate } from '../../utils/template.js';
import { qaPairsApi } from '../../api/qaPairs.js';
import { projectsApi } from '../../api/projects.js';
import { sessionsApi } from '../../api/sessions.js';
import { sanitize } from '../../utils/sanitize.js';
import { formatDate } from '../../utils/format.js';

const PAGE_SIZE = 20;

function getConfidenceBadge(conf) {
  if (conf == null) return '';
  if (conf >= 90) return `<span class="badge b-ok">${conf}% confidence</span>`;
  if (conf >= 70) return `<span class="badge b-warn">${conf}% confidence</span>`;
  return `<span class="badge b-err">${conf}% confidence</span>`;
}

export default async function QAMonitorController(params) {
  const el = await loadTemplate('/templates/admin/qa-monitor.html', 'qa-monitor');

  const pageLoading = el.querySelector('[data-bind="pageLoading"]');
  const pageContent = el.querySelector('[data-bind="pageContent"]');
  const pageError = el.querySelector('[data-bind="pageError"]');
  const emptyState = el.querySelector('[data-bind="emptyState"]');
  const qaList = el.querySelector('[data-bind="qaList"]');
  const searchInput = el.querySelector('[data-bind="searchInput"]');
  const projectFilter = el.querySelector('[data-bind="projectFilter"]');

  let entries = [];
  let projectMap = {};
  let sessionMap = {};
  let searchTerm = '';
  let projectFilterValue = '';
  let lastKey = null;
  let hasMore = false;
  let pageStack = []; // stack of lastKey values for back navigation

  // Load reference data (projects + sessions) once upfront
  async function loadReferenceData() {
    const [projectsRes, sessionsRes] = await Promise.all([
      projectsApi.list(),
      sessionsApi.list({ limit: 200 }),
    ]);

    const projects = projectsRes.data?.items || [];
    const sessions = sessionsRes.data?.items || [];

    projectMap = {};
    projects.forEach(p => { projectMap[p.project_id] = p.name || 'Untitled'; });

    sessionMap = {};
    sessions.forEach(s => { sessionMap[s.session_id] = s.name || 'Untitled'; });

    // Populate project filter dropdown
    projects.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.project_id;
      opt.textContent = p.name || 'Untitled';
      projectFilter.appendChild(opt);
    });
  }

  function resetPagination() {
    lastKey = null;
    pageStack = [];
  }

  async function loadPage() {
    qaList.innerHTML = '<div class="loading"><div class="loading-spinner"></div><div class="loading-text">Loading Q&A pairs...</div></div>';
    emptyState.style.display = 'none';
    try {
      const apiParams = { limit: PAGE_SIZE };
      if (projectFilterValue) apiParams.project_id = projectFilterValue;
      if (lastKey) apiParams.lastKey = lastKey;

      const res = await qaPairsApi.list(apiParams);
      const data = res.data || {};
      entries = data.items || [];
      hasMore = !!data.lastKey;
      // Store next cursor on the entries array for navigation
      if (hasMore) entries._nextKey = data.lastKey;

      renderList();
    } catch (err) {
      qaList.innerHTML = '<div class="empty"><div class="empty-icon">⚠️</div><div class="empty-title">Failed to load Q&A pairs</div><div class="empty-desc">' + sanitize(err.message) + '</div></div>';
    }
  }

  function renderList() {
    // Client-side search within the current server page
    const filtered = entries.filter(qa => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (qa.question || '').toLowerCase().includes(term)
        || (qa.host_answer || qa.answer || '').toLowerCase().includes(term)
        || (qa.ai_answer || qa.suggested_answer || '').toLowerCase().includes(term)
        || (sessionMap[qa.session_id] || '').toLowerCase().includes(term);
    });

    if (filtered.length === 0) {
      qaList.innerHTML = '';
      emptyState.style.display = 'block';
      return;
    }
    emptyState.style.display = 'none';

    let html = filtered.map(qa => {
      const project = sanitize(projectMap[qa.project_id] || '—');
      const session = sanitize(sessionMap[qa.session_id] || '—');
      const time = qa.detected_at ? formatDate(qa.detected_at, { hour: '2-digit', minute: '2-digit' }) : '';
      const answer = qa.host_answer || qa.answer || '';
      const aiAnswer = qa.ai_answer || qa.suggested_answer || '';
      return `<div class="qa">
        <div class="flex jc-b items-s mb-4">
          <div class="text-xs text-t"><strong>${project}</strong> · ${session}${time ? ' · <span class="mono">' + time + '</span>' : ''}</div>
          ${getConfidenceBadge(qa.confidence)}
        </div>
        <div class="qa-q"><div class="qi">Q</div><div class="qa-txt q">${sanitize(qa.question || '')}</div></div>
        ${answer ? `<div class="qa-a"><div class="ai">A</div><div class="qa-txt">${sanitize(answer)}</div></div>` : ''}
        ${aiAnswer ? `<div class="qa-a" style="border-left:3px solid var(--pri-300);margin-left:12px;padding-left:10px"><div class="ai" style="background:var(--pri-100);color:var(--pri-700)">AI</div><div class="qa-txt">${sanitize(aiAnswer)}</div></div>` : ''}
      </div>`;
    }).join('');

    // Pagination footer
    html += `<div class="tbl-foot" style="display:flex;justify-content:space-between;align-items:center;padding:12px 20px">
      <span class="text-xs text-t">${filtered.length} pair${filtered.length !== 1 ? 's' : ''}${pageStack.length > 0 ? ' · Page ' + (pageStack.length + 1) : ''}</span>
      <div style="display:flex;gap:8px">
        <button class="btn btn-s btn-sm" data-action="prevPage"${pageStack.length === 0 ? ' disabled' : ''}>← Back</button>
        <button class="btn btn-s btn-sm" data-action="nextPage"${!hasMore ? ' disabled' : ''}>Next →</button>
      </div>
    </div>`;

    qaList.innerHTML = html;
  }

  // Search — filters within current page
  searchInput.addEventListener('input', (e) => {
    searchTerm = e.target.value;
    renderList();
  });

  // Project filter — resets pagination and re-fetches from server
  projectFilter.addEventListener('change', (e) => {
    projectFilterValue = e.target.value;
    resetPagination();
    loadPage();
  });

  // Pagination
  el.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action="prevPage"], [data-action="nextPage"]');
    if (!btn || btn.disabled) return;
    if (btn.dataset.action === 'nextPage' && hasMore) {
      pageStack.push(lastKey);
      lastKey = entries._nextKey;
      loadPage();
    } else if (btn.dataset.action === 'prevPage' && pageStack.length > 0) {
      lastKey = pageStack.pop();
      loadPage();
    }
  });

  // Initial load
  try {
    await loadReferenceData();
    pageLoading.style.display = 'none';
    pageContent.style.display = 'block';
    loadPage();
  } catch (err) {
    pageLoading.style.display = 'none';
    pageError.style.display = 'block';
    pageError.innerHTML = '<div class="empty"><div class="empty-icon">⚠️</div><div class="empty-title">Failed to load Q&A pairs</div><div class="empty-desc">' + sanitize(err.message) + '</div></div>';
  }

  return el;
}
