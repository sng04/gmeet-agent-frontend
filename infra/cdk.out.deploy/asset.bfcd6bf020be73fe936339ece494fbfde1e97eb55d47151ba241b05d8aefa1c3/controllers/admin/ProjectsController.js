import { loadTemplate } from '../../utils/template.js';
import { Table } from '../../components/ui/Table.js';
import { Button } from '../../components/ui/Button.js';
import { SearchBox, FilterSelect } from '../../components/ui/Form.js';
import { navigate } from '../../router.js';

const mockProjects = [
  { id: '1', name: 'Acme Corp Sales', desc: 'Enterprise sales meetings with Acme Corp', agent: 'TechSales Bot', gmail: 'techsales-bot@agents.company.com', users: 4, sessions: 12 },
  { id: '2', name: 'Global Logistics Demo', desc: 'Product demos for integration team', agent: 'Demo Agent', gmail: 'demo-bot@agents.company.com', users: 2, sessions: 5 },
  { id: '3', name: 'Internal Training', desc: 'Internal team upskilling sessions', agent: 'TechSales Bot', gmail: null, users: 8, sessions: 3 },
];

export default async function ProjectsController(params) {
  const el = await loadTemplate('/templates/admin/projects.html', 'projects');

  // Actions — New Project button
  el.querySelector('[data-bind="actions"]').appendChild(
    Button({ text: '+ New Project', variant: 'p', onClick: () => navigate('project-create') })
  );

  // Filters — search + status filter
  const filters = el.querySelector('[data-bind="filters"]');
  filters.appendChild(SearchBox({ placeholder: 'Search projects...' }));
  filters.appendChild(FilterSelect({
    options: [
      { value: '', label: 'All Status' },
      { value: 'active', label: 'Active' },
      { value: 'archived', label: 'Archived' },
    ],
  }));

  // Table
  const table = Table({
    columns: [
      { label: 'Project Name', render: r => `<strong class="text-p">${r.name}</strong><div class="text-xs text-t mt-1">${r.desc}</div>` },
      { label: 'Default Agent', key: 'agent' },
      { label: 'Gmail Credential', render: r => r.gmail ? `<span class="mono text-sm">${r.gmail}</span>` : '<span class="text-t">—</span>' },
      { label: 'Users', key: 'users' },
      { label: 'Sessions', key: 'sessions' },
      { label: '', render: r => `<button class="btn btn-g btn-sm" data-id="${r.id}">Open →</button>` },
    ],
    data: mockProjects.map(p => ({ ...p, _onClick: () => navigate('project-detail') })),
    footer: `<span>${mockProjects.length} projects</span>`,
  });
  el.querySelector('[data-bind="table"]').appendChild(table);

  return el;
}
