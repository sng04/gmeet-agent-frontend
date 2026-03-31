import { loadTemplate } from '../../utils/template.js';
import { SearchBox, FilterSelect } from '../../components/ui/Form.js';
import { changelogApi } from '../../api/changelog.js';
import { formatDate } from '../../utils/format.js';
import { sanitize } from '../../utils/sanitize.js';

const PAGE_SIZE = 20;

const ACTION_BADGES = {
  create: 'b-ok', update: 'b-pri', delete: 'b-err',
  login_success: 'b-ok', login_failed: 'b-warn', login_locked: 'b-err',
};

const ENTITY_LABELS = {
  user: 'User', project: 'Project', agent: 'Agent', personality: 'Personality',
  skill: 'Skill', bot_credential: 'Credential', login_attempt: 'Login',
  agent_skill_assignment: 'Skill Assignment', project_user_assignment: 'User Assignment',
};

export default async function AuditLogsController() {
  const el = await loadTemplate('/templates/admin/audit-logs.html', 'audit-logs');

  let entries = [];
  let entityFilter = '';
  let searchTerm = '';
  let lastKey = null;
  let lastTimestamp = null;
  let hasMore = false;
  let pageStack = []; // stack of {lastKey, lastTimestamp} for back navigation

  const filters = el.querySelector('[data-bind="filters"]');
  const tableContainer = el.querySelector('[data-bind="table"]');

  const searchBox = SearchBox({ placeholder: 'Search by user, entity, or action...' });
  filters.appendChild(searchBox);
  filters.appendChild(FilterSelect({
    options: [
      { value: '', label: 'All Types' },
      { value: 'agent', label: 'Agents' },
      { value: 'project', label: 'Projects' },
      { value: 'user', label: 'Users' },
      { value: 'skill', label: 'Skills' },
      { value: 'personality', label: 'Personalities' },
      { value: 'bot_credential', label: 'Credentials' },
      { value: 'login_attempt', label: 'Login Attempts' },
      { value: 'agent_skill_assignment', label: 'Skill Assignments' },
      { value: 'project_user_assignment', label: 'User Assignments' },
    ],
    onChange: (val) => {
      entityFilter = val;
      resetPagination();
      load();
    }
  }));

  searchBox.querySelector('input').addEventListener('input', (e) => {
    searchTerm = e.target.value.toLowerCase();
    renderTable();
  });

  function resetPagination() {
    lastKey = null;
    lastTimestamp = null;
    pageStack = [];
  }

  async function load() {
    tableContainer.innerHTML = '<div class="loading"><div class="loading-spinner"></div><div class="loading-text">Loading audit logs...</div></div>';
    try {
      const params = { limit: PAGE_SIZE };
      if (entityFilter) params.entity_type = entityFilter;
      if (lastKey) params.lastKey = lastKey;
      if (lastTimestamp) params.lastTimestamp = lastTimestamp;
      const res = await changelogApi.list(params);
      const data = res.data || {};
      entries = data.entries || [];
      hasMore = !!(data.lastKey);
      if (hasMore) {
        // Store for next page
        entries._nextKey = data.lastKey;
        entries._nextTimestamp = data.lastTimestamp;
      }
      renderTable();
    } catch (err) {
      tableContainer.innerHTML = '<div class="empty"><div class="empty-icon">⚠️</div><div class="empty-title">Failed to load audit logs</div><div class="empty-desc">' + sanitize(err.message) + '</div></div>';
    }
  }

  function renderTable() {
    const filtered = entries.filter(e => {
      if (!searchTerm) return true;
      return (e.admin_username || '').toLowerCase().includes(searchTerm)
        || (e.entity_type || '').toLowerCase().includes(searchTerm)
        || (e.action || '').toLowerCase().includes(searchTerm)
        || (e.entity_id || '').toLowerCase().includes(searchTerm)
        || (e.entity_name || '').toLowerCase().includes(searchTerm);
    });

    if (filtered.length === 0) {
      tableContainer.innerHTML = '<div class="empty"><div class="empty-icon">📋</div><div class="empty-title">No audit logs found</div><div class="empty-desc">Activity will appear here as changes are made</div></div>';
      return;
    }

    let html = '<div class="tbl-wrap"><table><thead><tr>'
      + '<th>Timestamp</th><th>Type</th><th>Action</th><th>Target</th><th>User</th><th>Details</th>'
      + '</tr></thead><tbody>';

    filtered.forEach(e => {
      const time = e.timestamp ? formatDate(e.timestamp, { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—';
      const typeBadge = '<span class="badge b-gray" style="font-size:10px">' + sanitize(ENTITY_LABELS[e.entity_type] || e.entity_type || '—') + '</span>';
      const actionBadge = '<span class="badge ' + (ACTION_BADGES[e.action] || 'b-gray') + '" style="font-size:10px">' + sanitize(e.action || '—') + '</span>';
      const user = sanitize(e.admin_username || '—');

      // Target: entity_name with entity_id fallback
      const targetName = e.entity_name ? sanitize(e.entity_name) : '';
      const targetId = e.entity_id ? '<span class="mono text-xs text-t">' + sanitize(e.entity_id) + '</span>' : '';
      const target = targetName ? targetName + (targetId ? '<br>' + targetId : '') : (targetId || '—');

      let details = '';
      if (e.changed_fields && e.changed_fields.length) {
        details = e.changed_fields.map(f => '<span class="mono text-xs" style="color:var(--pri-600)">' + sanitize(f) + '</span>').join(', ');
      } else if (e.data && typeof e.data === 'object') {
        const keys = Object.keys(e.data).slice(0, 3);
        details = keys.map(k => '<span class="mono text-xs">' + sanitize(k) + '</span>').join(', ');
        if (Object.keys(e.data).length > 3) details += ' …';
      }
      if (e.entity_type === 'login_attempt' && e.data?.reason) {
        details = '<span class="text-xs" style="color:var(--warn-600)">' + sanitize(e.data.reason) + '</span>';
      }

      html += '<tr>'
        + '<td class="mono text-xs">' + time + '</td>'
        + '<td>' + typeBadge + '</td>'
        + '<td>' + actionBadge + '</td>'
        + '<td class="text-sm">' + target + '</td>'
        + '<td class="text-sm">' + user + '</td>'
        + '<td class="text-xs">' + (details || '—') + '</td>'
        + '</tr>';
    });

    html += '</tbody></table>';
    html += '<div class="tbl-foot" style="display:flex;justify-content:space-between;align-items:center;padding:12px 20px">'
      + '<span class="text-xs text-t">' + filtered.length + ' entries' + (pageStack.length > 0 ? ' · Page ' + (pageStack.length + 1) : '') + '</span>'
      + '<div style="display:flex;gap:8px">'
      + '<button class="btn btn-s btn-sm" data-action="prevPage"' + (pageStack.length === 0 ? ' disabled' : '') + '>← Back</button>'
      + '<button class="btn btn-s btn-sm" data-action="nextPage"' + (!hasMore ? ' disabled' : '') + '>Next →</button>'
      + '</div></div></div>';

    tableContainer.innerHTML = html;
  }

  el.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action="prevPage"], [data-action="nextPage"]');
    if (!btn || btn.disabled) return;
    if (btn.dataset.action === 'nextPage' && hasMore) {
      pageStack.push({ lastKey, lastTimestamp });
      lastKey = entries._nextKey;
      lastTimestamp = entries._nextTimestamp;
      load();
    } else if (btn.dataset.action === 'prevPage' && pageStack.length > 0) {
      const prev = pageStack.pop();
      lastKey = prev.lastKey;
      lastTimestamp = prev.lastTimestamp;
      load();
    }
  });

  load();
  return el;
}
