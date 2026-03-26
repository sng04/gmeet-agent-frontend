import { loadTemplate } from '../../utils/template.js';
import { StatCard } from '../../components/ui/Card.js';
import { Table } from '../../components/ui/Table.js';
import { Button } from '../../components/ui/Button.js';
import { navigate } from '../../router.js';

const mockStats = [
  { icon: '📊', iconColor: 'red', label: 'Active Sessions', value: '1', meta: '4 total sessions · Click to view →', link: 'qa', live: true },
  { icon: '🤖', iconColor: 'green', label: 'Active Agents', value: '2', meta: '3 total agents', link: 'agents' },
  { icon: '📁', iconColor: 'amber', label: 'Projects', value: '3', meta: '14 assigned users', link: 'projects' },
  { icon: '💬', iconColor: 'cyan', label: 'Q&A Pairs', value: '16', meta: '284,500 tokens used', link: 'qa' },
];

const mockSessions = [
  { purpose: 'Integration Planning Session', project: 'Acme Corp Sales', agent: 'TechSales Bot', state: 'live', qa: 3, duration: '12 min (live)' },
  { purpose: 'Q3 Technical Architecture Review', project: 'Acme Corp Sales', agent: 'TechSales Bot', state: 'summary', qa: 8, duration: '47 min' },
  { purpose: 'Product Walkthrough', project: 'Global Logistics Demo', agent: 'Demo Agent', state: 'ended', qa: 5, duration: '32 min' },
  { purpose: 'Security Compliance Review', project: 'Acme Corp Sales', agent: 'TechSales Bot', state: 'ended', qa: 0, duration: '—' },
];

const mockQA = [
  { question: 'What kind of encryption do you use for data at rest?', answer: 'We use AES-256 encryption for all data at rest, managed through AWS KMS...', session: 'Q3 Architecture Review', time: '09:05:32', conf: 92 },
  { question: 'How does the system handle concurrent users?', answer: 'Our system uses auto-scaling through ECS Fargate, dynamically adjusting...', session: 'Q3 Architecture Review', time: '09:12:18', conf: 88 },
  { question: 'Can we integrate this with our existing Slack workspace?', answer: 'Currently, the system focuses on Google Meet integration. Slack...', session: 'Integration Planning', time: '10:35:41', conf: 85 },
];

export default async function DashboardController(params) {
  const el = await loadTemplate('/templates/admin/dashboard.html', 'dashboard');

  // Populate stats grid
  const statsGrid = el.querySelector('[data-bind="statsGrid"]');
  mockStats.forEach(s => statsGrid.appendChild(StatCard(s)));

  // Sessions table
  const stateMap = { live: 'b-live', summary: 'b-summary', ended: 'b-ended' };
  const stateLabel = { live: 'Live', summary: 'Finished', ended: 'Ended' };

  const sessionsTable = Table({
    title: 'Recent Sessions',
    actions: Button({ text: 'View All →', variant: 'g', size: 'sm', onClick: () => navigate('qa') }).outerHTML,
    columns: [
      { label: 'Purpose', key: 'purpose', render: r => `<strong>${r.purpose}</strong>` },
      { label: 'Project', key: 'project' },
      { label: 'Agent', key: 'agent' },
      { label: 'State', key: 'state', render: r => `<span class="badge ${stateMap[r.state]}"><span class="dot"></span> ${stateLabel[r.state]}</span>` },
      { label: 'Q&A', key: 'qa' },
      { label: 'Duration', key: 'duration', className: 'mono text-xs' },
    ],
    data: mockSessions,
  });
  el.querySelector('[data-bind="sessionsTable"]').appendChild(sessionsTable);

  // Q&A table
  const qaTable = Table({
    title: 'Recent Q&A Pairs',
    actions: Button({ text: 'View All →', variant: 'g', size: 'sm', onClick: () => navigate('qa') }).outerHTML,
    columns: [
      { label: 'Question', render: r => `<strong style="max-width:220px" class="truncate">${r.question}</strong>`, width: '25%' },
      { label: 'Answer', render: r => `<span style="max-width:280px" class="truncate">${r.answer}</span>`, width: '30%' },
      { label: 'Session', key: 'session' },
      { label: 'Time', key: 'time', className: 'mono text-xs' },
      { label: 'Conf.', render: r => `<span class="badge ${r.conf >= 90 ? 'b-ok' : 'b-warn'}">${r.conf}%</span>` },
    ],
    data: mockQA,
  });
  el.querySelector('[data-bind="qaTable"]').appendChild(qaTable);

  return el;
}
