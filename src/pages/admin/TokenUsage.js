import { StatCard } from '../../components/ui/Card.js';
import { Table } from '../../components/ui/Table.js';
import { FilterSelect } from '../../components/ui/Form.js';

const mockStats = [
  { icon: '🪙', iconColor: 'blue', label: 'Total Tokens', value: '284,500', meta: 'March 2026' },
  { icon: '💲', iconColor: 'green', label: 'Estimated Cost', value: '$14.22', meta: 'March 2026' },
  { icon: '📊', iconColor: 'amber', label: 'Daily Average', value: '40,643', meta: '7 days recorded' },
];

const mockDailyUsage = [
  { date: 'Mar 10', tokens: 32000, height: 82 },
  { date: 'Mar 11', tokens: 45000, height: 116 },
  { date: 'Mar 12', tokens: 28000, height: 72 },
  { date: 'Mar 13', tokens: 51000, height: 132 },
  { date: 'Mar 14', tokens: 38000, height: 98 },
  { date: 'Mar 15', tokens: 62000, height: 160 },
  { date: 'Mar 16', tokens: 28500, height: 73 },
];

const mockProjectUsage = [
  { project: 'Acme Corp Sales', sessions: 3, qa: 11, tokens: '93,500' },
  { project: 'Global Logistics Demo', sessions: 1, qa: 5, tokens: '42,500' },
  { project: 'Internal Training', sessions: 0, qa: 0, tokens: '0' },
];

export default function TokenUsagePage() {
  const el = document.createElement('div');
  el.className = 'page';

  el.innerHTML = `
    <div class="pg-hdr">
      <div>
        <h1>Token Usage</h1>
        <div class="pg-sub">Monitor AI token consumption and costs</div>
      </div>
      <div class="pg-actions" id="actions"></div>
    </div>
    <div class="g g3 mb-6" id="stats-grid"></div>
    <div class="card mb-6">
      <div class="card-hdr">
        <div class="text-md fw-sb">Daily Token Usage</div>
      </div>
      <div class="card-body">
        <div class="tchart" id="chart"></div>
      </div>
    </div>
    <div id="table"></div>
  `;

  // Month filter
  const actions = el.querySelector('#actions');
  actions.appendChild(FilterSelect({
    options: [
      { value: 'mar', label: 'March 2026' },
      { value: 'feb', label: 'February 2026' },
    ],
  }));

  // Stats
  const statsGrid = el.querySelector('#stats-grid');
  mockStats.forEach(s => statsGrid.appendChild(StatCard(s)));

  // Chart
  const chart = el.querySelector('#chart');
  mockDailyUsage.forEach(day => {
    const bar = document.createElement('div');
    bar.className = 'tchart-g';
    bar.innerHTML = `
      <div class="tchart-tip">${day.tokens.toLocaleString()}</div>
      <div class="tchart-bar" style="height:${day.height}px"></div>
      <div class="tchart-lbl">${day.date}</div>
    `;
    chart.appendChild(bar);
  });

  // Table
  const table = Table({
    title: 'Usage by Project',
    columns: [
      { label: 'Project', render: r => `<strong>${r.project}</strong>` },
      { label: 'Sessions', key: 'sessions' },
      { label: 'Q&A Pairs', key: 'qa' },
      { label: 'Est. Tokens', key: 'tokens', className: 'mono' },
    ],
    data: mockProjectUsage,
  });

  el.querySelector('#table').appendChild(table);

  return el;
}
