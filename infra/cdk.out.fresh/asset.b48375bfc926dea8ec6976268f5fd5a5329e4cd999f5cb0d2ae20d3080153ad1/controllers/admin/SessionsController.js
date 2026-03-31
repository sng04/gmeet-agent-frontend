import { loadTemplate } from '../../utils/template.js';
import { Table } from '../../components/ui/Table.js';
import { navigate } from '../../router.js';
import { projectsApi } from '../../api/projects.js';
import { sessionsApi } from '../../api/sessions.js';
import { sanitize } from '../../utils/sanitize.js';
import { formatDate } from '../../utils/format.js';

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

export default async function SessionsController(params) {
  const el = await loadTemplate('/templates/admin/sessions.html', 'sessions');

  const pageLoading = el.querySelector('[data-bind="pageLoading"]');
  const pageContent = el.querySelector('[data-bind="pageContent"]');
  const pageError = el.querySelector('[data-bind="pageError"]');
  const emptyState = el.querySelector('[data-bind="emptyState"]');
  const searchInput = el.querySelector('[data-bind="searchInput"]');
  const statusFilter = el.querySelector('[data-bind="statusFilter"]');

  let sessions = [];
  let projectMap = {};
  let searchTerm = '';
  let statusFilterValue = '';
  let currentPage = 1;
  const PAGE_SIZE = 20;

  async function loadData() {
    try {
      const [projectsRes, sessionsRes] = await Promise.all([
        projectsApi.list(),
        sessionsApi.list({ limit: 100 })
      ]);

      const projects = projectsRes.data?.items || [];
      sessions = sessionsRes.data?.items || [];

      projectMap = {};
      projects.forEach(p => {
        projectMap[p.project_id] = p.name || 'Untitled';
      });

      sessions.sort((a, b) => new Date(b.created_at || b.start_time || 0) - new Date(a.created_at || a.start_time || 0));

      pageLoading.style.display = 'none';
      pageContent.style.display = 'block';

      renderTable();
    } catch (err) {
      pageLoading.style.display = 'none';
      pageError.style.display = 'block';
      pageError.innerHTML = '<div class="empty"><div class="empty-icon">⚠️</div><div class="empty-title">Failed to load sessions</div><div class="empty-desc">' + err.message + '</div></div>';
    }
  }

  function getFilteredSessions() {
    return sessions.filter(s => {
      const uiStatus = getUIStatus(s.bot_status);
      const matchesSearch = !searchTerm || 
        (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (projectMap[s.project_id] || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = !statusFilterValue || uiStatus === statusFilterValue;
      return matchesSearch && matchesStatus;
    });
  }

  function renderTable() {
    const container = el.querySelector('[data-bind="sessionsTable"]');
    const filtered = getFilteredSessions();

    if (filtered.length === 0) {
      container.innerHTML = '';
      emptyState.style.display = 'block';
      return;
    }

    emptyState.style.display = 'none';

    // Client-side pagination
    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    if (currentPage > totalPages) currentPage = totalPages;
    const start = (currentPage - 1) * PAGE_SIZE;
    const pageItems = filtered.slice(start, start + PAGE_SIZE);
    const hasMore = currentPage < totalPages;

    const table = Table({
      columns: [
        { label: 'Session', render: r => {
          const startTimeDisplay = r.start_time ? formatDate(r.start_time, { hour: '2-digit', minute: '2-digit' }) : '—';
          return '<strong class="text-p">' + sanitize(r.name || 'Untitled') + '</strong><div class="text-xs text-t">' + startTimeDisplay + '</div>';
        }},
        { label: 'Project', render: r => '<span class="text-sm">' + sanitize(projectMap[r.project_id] || '—') + '</span>' },
        { label: 'Status', render: r => getStatusBadge(getUIStatus(r.bot_status)) },
        { label: 'Meet Link', render: r => r.meeting_link 
          ? '<a href="' + r.meeting_link + '" target="_blank" class="text-pri text-xs">' + r.meeting_link.replace('https://', '') + '</a>' 
          : '—' 
        },
        { label: 'Duration', render: r => {
          const uiStatus = getUIStatus(r.bot_status);
          if (uiStatus === 'live') return calculateDuration(r.start_time) + ' (ongoing)';
          if ((uiStatus === 'finished' || uiStatus === 'failed' || uiStatus === 'stopping') && r.start_time) {
            return calculateDuration(r.start_time, r.end_time);
          }
          return '—';
        }, className: 'mono text-xs' },
        { label: '', render: r => {
          const uiStatus = getUIStatus(r.bot_status);
          if (uiStatus === 'live') {
            return '<button class="btn btn-live btn-sm" data-action="view" data-id="' + r.session_id + '" data-status="live">Live →</button>';
          }
          if (uiStatus === 'finished') {
            return '<button class="btn btn-review btn-sm" data-action="view" data-id="' + r.session_id + '" data-status="finished">Review</button>';
          }
          return '';
        }, className: 'text-right' },
      ],
      data: pageItems,
      footer: `Page ${currentPage} of ${totalPages} · ${filtered.length} session${filtered.length !== 1 ? 's' : ''}`,
    });

    // Inject pagination buttons into the table footer
    const tblFoot = table.querySelector('.tbl-foot');
    if (tblFoot) {
      tblFoot.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:12px 20px';
      const btnWrap = document.createElement('div');
      btnWrap.style.cssText = 'display:flex;gap:8px';
      btnWrap.innerHTML =
        '<button class="btn btn-s btn-sm" data-action="prevPage"' + (currentPage <= 1 ? ' disabled' : '') + '>← Back</button>' +
        '<button class="btn btn-s btn-sm" data-action="nextPage"' + (!hasMore ? ' disabled' : '') + '>Next →</button>';
      tblFoot.appendChild(btnWrap);
    }

    container.innerHTML = '';
    container.appendChild(table);
  }

  // Search handler
  searchInput.addEventListener('input', (e) => {
    searchTerm = e.target.value;
    currentPage = 1;
    renderTable();
  });

  // Status filter handler
  statusFilter.addEventListener('change', (e) => {
    statusFilterValue = e.target.value;
    currentPage = 1;
    renderTable();
  });

  // Action buttons + pagination
  el.addEventListener('click', (e) => {
    const pageBtn = e.target.closest('[data-action="prevPage"], [data-action="nextPage"]');
    if (pageBtn && !pageBtn.disabled) {
      if (pageBtn.dataset.action === 'prevPage' && currentPage > 1) {
        currentPage--;
        renderTable();
      } else if (pageBtn.dataset.action === 'nextPage') {
        currentPage++;
        renderTable();
      }
      return;
    }

    const btn = e.target.closest('[data-action="view"]');
    if (btn) {
      const id = btn.dataset.id;
      const status = btn.dataset.status;
      if (status === 'live') {
        navigate('live?sessionId=' + id);
      } else {
        navigate('session/' + id);
      }
    }
  });

  loadData();
  return el;
}
