import { loadTemplate } from '../../utils/template.js';
import { Button } from '../../components/ui/Button.js';
import { SearchBox } from '../../components/ui/Form.js';
import { navigate } from '../../router.js';
import { projectsApi } from '../../api/projects.js';
import { sessionsApi } from '../../api/sessions.js';
import { botCredentialApi } from '../../api/botCredential.js';

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
      renderProjects();
    }
  }));

  let projects = [];
  let credentialMap = {};

  async function loadData() {
    const tableContainer = el.querySelector('[data-bind="table"]');
    tableContainer.innerHTML = `
      <div class="loading">
        <div class="loading-spinner"></div>
        <div class="loading-text">Loading projects...</div>
      </div>
    `;

    try {
      // Fetch projects, credentials, and agents in parallel
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

      // Fetch session and user counts per project
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
          <div class="empty-desc">${err.message}</div>
        </div>
      `;
    }
  }

  function renderProjects() {
    const tableContainer = el.querySelector('[data-bind="table"]');
    
    // Filter by search term
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
      <div class="tbl-foot">
        <span>${filtered.length} project${filtered.length !== 1 ? 's' : ''}</span>
      </div>
    `;

    const tbody = tableWrap.querySelector('tbody');

    filtered.forEach(project => {
      const tr = document.createElement('tr');
      
      // Get gmail email from credential map
      const gmailEmail = project.bot_credential_id 
        ? credentialMap[project.bot_credential_id] 
        : null;

      tr.innerHTML = `
        <td>
          <strong class="text-p">${project.name || '—'}</strong>
          ${project.description ? `<div class="text-xs text-t mt-1">${project.description}</div>` : ''}
        </td>
        <td>${project.agent_name ? '<span class="text-sm">' + project.agent_name + '</span>' : '<span class="text-t">Not assigned</span>'}</td>
        <td>${gmailEmail 
          ? `<span class="mono text-sm">${gmailEmail}</span>` 
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

    // Handle action buttons
    tableContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;

      const action = btn.dataset.action;
      const id = btn.dataset.id;

      if (action === 'open') {
        navigate(`projects/${id}`);
      }
    });
  }

  // Load data
  loadData();

  return el;
}
