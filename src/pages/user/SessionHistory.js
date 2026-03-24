import { Table } from '../../components/ui/Table.js';
import { SearchBox, FilterSelect } from '../../components/ui/Form.js';
import { navigate } from '../../router.js';

const mockSessions = [
  { id: '1', purpose: 'Integration Planning', date: 'Started today 10:30 AM', status: 'live', agent: 'TechSales Bot', qa: 3, duration: '12 min (ongoing)' },
  { id: '2', purpose: 'Q3 Architecture Review', date: 'Mar 15, 2026', status: 'finished', agent: 'TechSales Bot', qa: 8, duration: '47 min' },
  { id: '3', purpose: 'Security Compliance Review', date: 'Mar 12, 2026', status: 'ended', agent: 'TechSales Bot', qa: 0, duration: '—' },
  { id: '4', purpose: 'Product Capabilities Demo', date: 'Mar 8, 2026', status: 'finished', agent: 'TechSales Bot', qa: 5, duration: '32 min' },
];

export default function SessionHistoryPage() {
  const el = document.createElement('div');
  el.className = 'page';

  el.innerHTML = `
    <div class="pg-hdr">
      <div>
        <h1>Session History</h1>
        <div class="pg-sub">All sessions for <strong>Acme Corp Sales</strong></div>
      </div>
    </div>
    <div class="filters" id="filters"></div>
    <div id="table"></div>
  `;

  const filters = el.querySelector('#filters');
  filters.appendChild(SearchBox({ placeholder: 'Search sessions...' }));
  filters.appendChild(FilterSelect({
    options: [
      { value: '', label: 'All Status' },
      { value: 'live', label: 'Live' },
      { value: 'finished', label: 'Finished' },
      { value: 'ended', label: 'Ended' },
    ],
  }));
  filters.appendChild(FilterSelect({
    options: [
      { value: '', label: 'All Agents' },
      { value: 'techsales', label: 'TechSales Bot' },
    ],
  }));
  filters.appendChild(FilterSelect({
    options: [
      { value: '', label: 'All Dates' },
      { value: 'week', label: 'This Week' },
      { value: 'month', label: 'This Month' },
    ],
  }));

  const getStatusBadge = (status) => {
    const badges = {
      live: '<span class="badge b-live"><span class="dot"></span> Live</span>',
      finished: '<span class="badge b-summary"><span class="dot"></span> Finished</span>',
      ended: '<span class="badge b-ended"><span class="dot"></span> Ended</span>',
    };
    return badges[status] || '';
  };

  const getAction = (session) => {
    if (session.status === 'live') {
      return `<div class="session-action-btns"><button class="btn btn-live btn-sm" data-action="live">Live →</button></div>`;
    }
    if (session.status === 'finished') {
      return `<div class="session-action-btns"><button class="btn btn-review btn-sm" data-action="review">Review</button></div>`;
    }
    return '';
  };

  const table = Table({
    columns: [
      { label: 'Purpose', render: r => `<strong class="text-p">${r.purpose}</strong><div class="text-xs text-t">${r.date}</div>` },
      { label: 'Status', render: r => getStatusBadge(r.status) },
      { label: 'Agent', key: 'agent' },
      { label: 'Q&A', key: 'qa' },
      { label: 'Duration', key: 'duration', className: 'mono text-xs' },
      { label: '', render: r => getAction(r), className: 'text-right' },
    ],
    data: mockSessions,
    footer: `<span>${mockSessions.length} sessions found</span>`,
  });

  el.querySelector('#table').appendChild(table);

  // Handle action buttons
  el.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (btn) {
      if (btn.dataset.action === 'live') navigate('live-session');
      if (btn.dataset.action === 'review') navigate('retro-session');
    }
  });

  return el;
}
