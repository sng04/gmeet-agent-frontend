import { loadTemplate } from '../../utils/template.js';
import { Button } from '../../components/ui/Button.js';
import { SearchBox } from '../../components/ui/Form.js';
import { navigate } from '../../router.js';
import { projectsApi } from '../../api/projects.js';
import { sessionsApi } from '../../api/sessions.js';
import { botCredentialApi } from '../../api/botCredential.js';
import { sanitize } from '../../utils/sanitize.js';

export default async function ProjectsController() {
  const el = await loadTemplate('/templates/admin/projects.html', 'projects');

  el.querySelector('[data-bind="actions"]').appendChild(
    Button({ text: '+ New Project', variant: 'p', onClick: () => navigate('project-create') })
  );

  // Search box
  const filters = el.querySelector('[data-bind="filters"]');
  let searchTerm = '';
  filters.appendChild(SearchBox({
    placeholder: 'Search projects...',
    onInput: (val) => {
      searchTerm = val.toLowerCase();
      currentPage = 1;
      renderProjects();
    }
  }));

  let projects = [];
  let credentialMap = {};
  let currentPage = 1;
  const PAGE_SIZE = 20;

  async function loadData() {
    const tableContainer = el.querySelector('[data-bind="table"]');
    tableContainer.innerHTML = `
      <div class="loading">
        <div class="loading-spinner"></div>
        <div class="loading-text">Loading projects...</div>
      </div>
    `;

    try {
      const [projectsRes, credentialsRes] = await Promise.all([
        projectsApi.list(),
        botCredentialApi.list()
      ]);

      projects = projectsRes.data?.items || [];
      
      const credentials = credentialsRes.data?.items || [];
      credentialMap = {};
      credentials.forEach(c => {
        credentialMap[c.credential_id] = c.email;
      });

      await Promise.all(projects.map(async (p) => {
        try {
          const sessRes = await sessionsApi.listByProject(p.project_id);
          const items = sessRes.data?.items || [];
          p._sessionCount = items.length;
        } catch { p._sessionCount = 0; }
        try {
          const usersRes = await projectsApi.getUsers(p.project_id);
          const users = usersRes.data?.users || usersRes.data?.items || [];
          p._userCount = Array.isArray(users) ? users.length : 0;
        } catch { p._userCount = 0; }
      }));

      renderProjects();
    } catch (err) {
      console.error('Failed to load projects:', err);
      tableContainer.innerHTML = `
        <div class="empty">
          <div class="empty-icon">⚠️</div>
          <div class="empty-title">Failed to load projects</div>
          <div class="empty-desc">${sanitize(err.message)}</div>
        </div>
      `;
    }
  }

  function renderProjects() {
    const tableContainer = el.querySelector('[data-bind="table"]');
    
    const filtered = projects.filter(p => 
      !searchTerm || 
      p.name?.toLowerCase().includes(searchTerm) ||
      p.description?.toLowerCase().includes(searchTerm) ||
      p.email?.toLowerCase().includes(searchTerm)
    );

    if (filtered.length === 0) {
      tableContainer.innerHTML = `
        <div class="empty">
          <div class="empty-icon">📁</div>
          <div class="empty-title">${searchTerm ? 'No matching projects' : 'No projects found'}</div>
          <div class="empty-desc">${searchTerm ? 'Try a different search term' : 'Click "+ New Project" to create your first project'}</div>
        </div>
      `;
      return;
    }

    // Client-side pagination
    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    if (currentPage > totalPages) currentPage = totalPages;
    const start = (currentPage - 1) * PAGE_SIZE;
    const pageItems = filtered.slice(start, start + PAGE_SIZE);
    const hasMore = currentPage < totalPages;

    const tableWrap = document.createElement('div');
    tableWrap.className = 'tbl-wrap';
    tableWrap.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Project Name</th>
            <th>Default Agent</th>
            <th>Gmail Credential</th>
            <th>Users</th>
            <th>Sessions</th>
            <th></th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
      <div class="tbl-foot" style="display:flex;justify-content:space-between;align-items:center;padding:12px 20px">
        <span class="text-xs text-t">Page ${currentPage} of ${totalPages} · ${filtered.length} project${filtered.length !== 1 ? 's' : ''}</span>
        <div style="display:flex;gap:8px">
          <button class="btn btn-s btn-sm" data-action="prevPage"${currentPage <= 1 ? ' disabled' : ''}>← Back</button>
          <button class="btn btn-s btn-sm" data-action="nextPage"${!hasMore ? ' disabled' : ''}>Next →</button>
        </div>
      </div>
    `;

    const tbody = tableWrap.querySelector('tbody');

    pageItems.forEach(project => {
      const tr = document.createElement('tr');
      const gmailEmail = project.bot_credential_id 
        ? credentialMap[project.bot_credential_id] 
        : null;

      tr.innerHTML = `
        <td>
          <strong class="text-p">${sanitize(project.name || '—')}</strong>
          ${project.description ? `<div class="text-xs text-t mt-1">${sanitize(project.description)}</div>` : ''}
        </td>
        <td>${project.agent_name ? '<span class="text-sm">' + sanitize(project.agent_name) + '</span>' : '<span class="text-t">Not assigned</span>'}</td>
        <td>${gmailEmail 
          ? `<span class="mono text-sm">${sanitize(gmailEmail)}</span>` 
          : '<span class="badge b-warn">Not assigned</span>'
        }</td>
        <td>${project._userCount ?? project.assigned_users?.length ?? project.total_users ?? 0}</td>
        <td>${project._sessionCount ?? project.total_sessions ?? 0}</td>
        <td>
          <button class="btn btn-g btn-sm" data-action="open" data-id="${project.project_id}">Open →</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    tableContainer.innerHTML = '';
    tableContainer.appendChild(tableWrap);
  }

  // Handle action buttons via event delegation on el
  el.addEventListener('click', (e) => {
    const pageBtn = e.target.closest('[data-action="prevPage"], [data-action="nextPage"]');
    if (pageBtn && !pageBtn.disabled) {
      if (pageBtn.dataset.action === 'prevPage' && currentPage > 1) {
        currentPage--;
        renderProjects();
      } else if (pageBtn.dataset.action === 'nextPage') {
        currentPage++;
        renderProjects();
      }
      return;
    }

    const btn = e.target.closest('[data-action="open"]');
    if (btn) {
      navigate(`projects/${btn.dataset.id}`);
    }
  });

  loadData();
  return el;
}
