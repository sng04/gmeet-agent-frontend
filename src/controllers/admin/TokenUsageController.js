import { loadTemplate } from '../../utils/template.js';
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

export default async function TokenUsageController(params) {
  const el = await loadTemplate('/templates/admin/token-usage.html', 'token-usage');

  // Month filter
  const actions = el.querySelector('[data-bind="actions"]');
  actions.appendChild(FilterSelect({
    options: [
      { value: 'mar', label: 'March 2026' },
      { value: 'feb', label: 'February 2026' },
    ],
  }));

  // Stats
  const statsGrid = el.querySelector('[data-bind="statsGrid"]');
  mockStats.forEach(s => statsGrid.appendChild(StatCard(s)));

  // Chart
  const chart = el.querySelector('[data-bind="chart"]');
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

  el.querySelector('[data-bind="table"]').appendChild(table);

  return el;
}
