import { loadTemplate } from '../../utils/template.js';
import { Button } from '../../components/ui/Button.js';
import { SearchBox, FilterSelect } from '../../components/ui/Form.js';
import { navigate } from '../../router.js';
import { skillsApi } from '../../api/skills.js';
import { agentsApi } from '../../api/agents.js';
import { formatDate } from '../../utils/format.js';

export default async function SkillsController(params) {
  const el = await loadTemplate('/templates/admin/skills.html', 'skills');

  el.querySelector('[data-bind="actions"]').appendChild(
    Button({ text: '+ New Skill', variant: 'p', onClick: () => navigate('skill-create') })
  );

  const loadingEl = el.querySelector('[data-bind="loading"]');
  const errorEl = el.querySelector('[data-bind="error"]');
  const listEl = el.querySelector('[data-bind="skillsList"]');

  let allSkills = [];
  let agents = [];

  // Filters
  const filters = el.querySelector('[data-bind="filters"]');
  const searchBox = SearchBox({ placeholder: 'Search skills...' });
  const agentFilter = FilterSelect({ options: [{ value: '', label: 'All Agents' }] });
  filters.appendChild(searchBox);
  filters.appendChild(agentFilter);

  async function load() {
    loadingEl.style.display = '';
    errorEl.style.display = 'none';
    listEl.innerHTML = '';

    try {
      const [skillsRes, agentsRes] = await Promise.all([
        skillsApi.list(),
        agentsApi.list(),
      ]);
      allSkills = skillsRes.data?.skills || skillsRes.data || [];
      agents = agentsRes.data?.agents || agentsRes.data || [];

      // Populate agent filter
      const select = agentFilter.querySelector('select');
      select.innerHTML = '<option value="">All Agents</option>';
      agents.forEach(a => {
        select.innerHTML += `<option value="${a.agent_id}">${a.agent_name}</option>`;
      });

      loadingEl.style.display = 'none';
      renderSkills(allSkills);
    } catch (err) {
      loadingEl.style.display = 'none';
      errorEl.style.display = '';
      errorEl.innerHTML = `<div class="empty"><div class="empty-icon">⚠️</div><div class="empty-title">Failed to load skills</div><div class="empty-desc">${err.message}</div></div>`;
    }
  }

  function getAgentName(agentId) {
    return agents.find(a => a.agent_id === agentId)?.agent_name || agentId;
  }

  function renderSkills(skills) {
    listEl.innerHTML = '';
    if (!skills.length) {
      listEl.innerHTML = '<div class="empty"><div class="empty-icon">📄</div><div class="empty-title">No skills found</div><div class="empty-desc">Create a skill and attach it to an agent</div></div>';
      return;
    }

    // Group by agent
    const grouped = {};
    skills.forEach(s => {
      const key = s.agent_id || 'unassigned';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(s);
    });

    Object.entries(grouped).forEach(([agentId, agentSkills]) => {
      const folder = document.createElement('div');
      folder.className = 'kb-folder';
      const agentName = getAgentName(agentId);
      folder.innerHTML = `
        <div class="kb-folder-hdr">
          <div class="flex items-c gap-3">
            <span style="font-size:18px">🤖</span>
            <div>
              <div class="text-sm fw-sb">${agentName}</div>
              <div class="text-xs text-t">${agentSkills.length} skill${agentSkills.length !== 1 ? 's' : ''}</div>
            </div>
          </div>
        </div>
      `;

      const table = document.createElement('table');
      table.style.cssText = 'width:100%;border-collapse:collapse';
      table.innerHTML = `
        <thead><tr>
          <th style="text-align:left;font-size:11px;font-weight:500;color:var(--gray-500);text-transform:uppercase;letter-spacing:.05em;padding:10px 20px;border-bottom:1px solid var(--gray-100);background:var(--gray-25)">Skill</th>
          <th style="text-align:left;font-size:11px;font-weight:500;color:var(--gray-500);text-transform:uppercase;padding:10px 20px;border-bottom:1px solid var(--gray-100);background:var(--gray-25)">File</th>
          <th style="text-align:left;font-size:11px;font-weight:500;color:var(--gray-500);text-transform:uppercase;padding:10px 20px;border-bottom:1px solid var(--gray-100);background:var(--gray-25)">Created</th>
          <th style="padding:10px 20px;border-bottom:1px solid var(--gray-100);background:var(--gray-25)"></th>
        </tr></thead>
        <tbody>${agentSkills.map((s, i) => `
          <tr>
            <td style="padding:12px 20px;${i < agentSkills.length - 1 ? 'border-bottom:1px solid var(--gray-100)' : ''}">
              <div class="text-sm fw-m text-p">${s.skill_name}</div>
              ${s.description ? `<div class="text-xs text-t mt-1">${s.description}</div>` : ''}
            </td>
            <td style="padding:12px 20px;font-family:var(--mono);font-size:13px;${i < agentSkills.length - 1 ? 'border-bottom:1px solid var(--gray-100)' : ''}">${s.file_name || '—'}</td>
            <td style="padding:12px 20px;font-size:12px;${i < agentSkills.length - 1 ? 'border-bottom:1px solid var(--gray-100)' : ''}">${s.created_at ? formatDate(s.created_at) : '—'}</td>
            <td style="padding:12px 20px;${i < agentSkills.length - 1 ? 'border-bottom:1px solid var(--gray-100)' : ''}"><button class="btn btn-d btn-sm" data-delete-skill="${s.skill_id}">Delete</button></td>
          </tr>
        `).join('')}</tbody>
      `;
      folder.appendChild(table);
      listEl.appendChild(folder);
    });
  }

  // Filter handlers
  const searchInput = searchBox.querySelector('input');
  searchInput.addEventListener('input', applyFilters);
  agentFilter.querySelector('select').addEventListener('change', applyFilters);

  function applyFilters() {
    const q = searchInput.value.toLowerCase();
    const agentId = agentFilter.querySelector('select').value;
    const filtered = allSkills.filter(s => {
      if (agentId && s.agent_id !== agentId) return false;
      if (q && !s.skill_name?.toLowerCase().includes(q) && !s.file_name?.toLowerCase().includes(q)) return false;
      return true;
    });
    renderSkills(filtered);
  }

  // Delete handler
  el.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-delete-skill]');
    if (!btn) return;
    if (!confirm('Delete this skill?')) return;
    try {
      await skillsApi.delete(btn.dataset.deleteSkill);
      load();
    } catch (err) { alert(err.message); }
  });

  load();
  return el;
}
