import { Table } from '../../components/ui/Table.js';
import { SearchBox, FilterSelect } from '../../components/ui/Form.js';

const mockLogs = [
  { id: '1', action: 'Session Started', user: 'Sarah Chen', target: 'Integration Planning', time: '10:30:15', ip: '192.168.1.100' },
  { id: '2', action: 'Project Updated', user: 'Richie Tan', target: 'Acme Corp Sales', time: '10:15:42', ip: '192.168.1.50' },
  { id: '3', action: 'Agent Modified', user: 'Richie Tan', target: 'TechSales Bot', time: '09:45:30', ip: '192.168.1.50' },
  { id: '4', action: 'User Added', user: 'Richie Tan', target: 'bob@acme.com', time: '09:30:00', ip: '192.168.1.50' },
  { id: '5', action: 'Session Ended', user: 'System', target: 'Q3 Architecture Review', time: '09:05:00', ip: '—' },
];

export default function AuditLogsPage() {
  const el = document.createElement('div');
  el.className = 'page';

  el.innerHTML = `
    <div class="pg-hdr">
      <div>
        <h1>Audit Logs</h1>
        <div class="pg-sub">Track system activities and changes</div>
      </div>
    </div>
    <div class="filters" id="filters"></div>
    <div id="table"></div>
  `;

  const filters = el.querySelector('#filters');
  filters.appendChild(SearchBox({ placeholder: 'Search logs...' }));
  filters.appendChild(FilterSelect({
    options: [
      { value: '', label: 'All Actions' },
      { value: 'session', label: 'Sessions' },
      { value: 'project', label: 'Projects' },
      { value: 'agent', label: 'Agents' },
      { value: 'user', label: 'Users' },
    ],
  }));

  const table = Table({
    columns: [
      { label: 'Action', render: r => `<strong>${r.action}</strong>` },
      { label: 'User', key: 'user' },
      { label: 'Target', key: 'target' },
      { label: 'Time', key: 'time', className: 'mono text-xs' },
      { label: 'IP Address', key: 'ip', className: 'mono text-xs text-t' },
    ],
    data: mockLogs,
    footer: `<span>Showing ${mockLogs.length} of 156 logs</span>`,
  });

  el.querySelector('#table').appendChild(table);

  return el;
}
