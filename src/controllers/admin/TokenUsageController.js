import { loadTemplate } from '../../utils/template.js';
import { StatCard } from '../../components/ui/Card.js';
import { Table } from '../../components/ui/Table.js';
import { FilterSelect } from '../../components/ui/Form.js';
import { tokenUsageApi } from '../../api/tokenUsage.js';
import { sanitize } from '../../utils/sanitize.js';

function getMonthOptions() {
  const opts = [];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const val = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    opts.push({ value: val, label });
  }
  return opts;
}

export default async function TokenUsageController() {
  const el = await loadTemplate('/templates/admin/token-usage.html', 'token-usage');

  const monthOptions = getMonthOptions();
  let currentPeriod = monthOptions[0].value;

  const actions = el.querySelector('[data-bind="actions"]');
  actions.appendChild(FilterSelect({
    options: monthOptions,
    onChange: (val) => { currentPeriod = val; loadAll(); }
  }));

  const statsGrid = el.querySelector('[data-bind="statsGrid"]');
  const chartEl = el.querySelector('[data-bind="chart"]');
  const tableEl = el.querySelector('[data-bind="table"]');

  async function loadAll() {
    statsGrid.innerHTML = '<div class="text-xs text-t">Loading...</div>';
    chartEl.innerHTML = '<div class="text-xs text-t" style="padding:40px;text-align:center">Loading chart...</div>';
    tableEl.innerHTML = '<div class="loading"><div class="loading-spinner"></div></div>';

    await Promise.all([loadSummary(), loadChart(), loadProjectTable()]);
  }

  async function loadSummary() {
    try {
      const res = await tokenUsageApi.summary(currentPeriod);
      const d = res.data || {};
      const totalTokens = d.total_tokens || 0;
      const cost = d.estimated_cost_usd != null ? '$' + d.estimated_cost_usd.toFixed(2) : '—';
      const days = currentPeriod ? new Date(currentPeriod + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '—';

      statsGrid.innerHTML = '';
      [
        { icon: '🪙', iconColor: 'blue', label: 'Total Tokens', value: totalTokens.toLocaleString(), meta: days },
        { icon: '💲', iconColor: 'green', label: 'Estimated Cost', value: cost, meta: days },
        { icon: '📋', iconColor: 'amber', label: 'Sessions', value: String(d.total_sessions || 0), meta: (d.total_qa_pairs || 0) + ' Q&A pairs' },
      ].forEach(s => statsGrid.appendChild(StatCard(s)));
    } catch (err) {
      statsGrid.innerHTML = '<div class="text-xs" style="color:var(--err-600)">Failed to load summary</div>';
    }
  }

  async function loadChart() {
    try {
      const res = await tokenUsageApi.daily(currentPeriod);
      const days = res.data?.days || [];
      chartEl.innerHTML = '';

      if (!days.length) {
        chartEl.innerHTML = '<div class="text-xs text-t" style="padding:40px;text-align:center">No usage data for this period</div>';
        return;
      }

      const maxTokens = Math.max(...days.map(d => d.tokens || 0), 1);

      days.forEach(day => {
        const tokens = day.tokens || 0;
        const height = Math.max(Math.round((tokens / maxTokens) * 160), 4);
        const label = new Date(day.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const bar = document.createElement('div');
        bar.className = 'tchart-g';
        bar.innerHTML =
          '<div class="tchart-tip">' + tokens.toLocaleString() + '</div>' +
          '<div class="tchart-bar" style="height:' + height + 'px"></div>' +
          '<div class="tchart-lbl">' + label + '</div>';
        chartEl.appendChild(bar);
      });
    } catch (err) {
      chartEl.innerHTML = '<div class="text-xs" style="color:var(--err-600);padding:20px;text-align:center">Failed to load chart</div>';
    }
  }

  async function loadProjectTable() {
    try {
      const res = await tokenUsageApi.byProject(currentPeriod);
      const projects = res.data?.projects || [];

      if (!projects.length) {
        tableEl.innerHTML = '<div class="empty"><div class="empty-icon">📊</div><div class="empty-title">No project usage</div><div class="empty-desc">No token usage recorded for this period</div></div>';
        return;
      }

      const table = Table({
        title: 'Usage by Project',
        columns: [
          { label: 'Project', render: r => '<strong>' + sanitize(r.project_name || '—') + '</strong>' },
          { label: 'Sessions', render: r => String(r.total_sessions || 0) },
          { label: 'Q&A Pairs', render: r => String(r.total_qa_pairs || 0) },
          { label: 'Tokens', render: r => (r.total_tokens || 0).toLocaleString(), className: 'mono' },
          { label: 'Est. Cost', render: r => r.estimated_cost_usd != null ? '$' + r.estimated_cost_usd.toFixed(2) : '—', className: 'mono' },
        ],
        data: projects,
      });
      tableEl.innerHTML = '';
      tableEl.appendChild(table);
    } catch (err) {
      tableEl.innerHTML = '<div class="text-xs" style="color:var(--err-600)">Failed to load project usage</div>';
    }
  }

  loadAll();
  return el;
}
