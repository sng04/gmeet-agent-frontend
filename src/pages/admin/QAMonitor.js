import { SearchBox, FilterSelect } from '../../components/ui/Form.js';

const mockStats = {
  totalQA: 16,
  avgConfidence: 88,
  sessionsWithQA: 3,
};

const mockQA = [
  { 
    id: '1',
    project: 'Acme Corp Sales',
    session: 'Integration Planning',
    question: 'Can we integrate this with our existing Slack workspace?', 
    answer: 'Currently, the system focuses on Google Meet integration. Slack integration is not in the current scope, but the architecture supports future webhook-based integrations.',
    confidence: 94, 
    time: '10:35:41',
    lastUpdated: '10:35:53',
  },
  { 
    id: '2',
    project: 'Acme Corp Sales',
    session: 'Q3 Architecture Review',
    question: 'What kind of encryption do you use for data at rest?', 
    answer: 'We use AES-256 encryption for all data at rest, managed through AWS KMS. This applies to both our DynamoDB storage and S3 buckets. All keys are rotated annually.',
    confidence: 92, 
    time: '09:05:32',
    lastUpdated: '09:05:44',
  },
  { 
    id: '3',
    project: 'Acme Corp Sales',
    session: 'Q3 Architecture Review',
    question: 'How does the system handle concurrent users?', 
    answer: 'Our system uses auto-scaling through ECS Fargate, which dynamically adjusts the number of running containers based on load. We support up to 500 concurrent meeting sessions.',
    confidence: 88, 
    time: '09:12:18',
    lastUpdated: '09:12:29',
  },
];

export default function QAMonitorPage() {
  const el = document.createElement('div');
  el.className = 'page';

  const getConfidenceBadge = (conf) => {
    if (conf >= 90) return `<span class="badge b-ok">${conf}% confidence</span>`;
    if (conf >= 70) return `<span class="badge b-warn">${conf}% confidence</span>`;
    return `<span class="badge b-err">${conf}% confidence</span>`;
  };

  el.innerHTML = `
    <div class="pg-hdr">
      <div>
        <h1>Q&A Monitor</h1>
        <div class="pg-sub">All question-answer pairs across sessions, in chronological order</div>
      </div>
    </div>
    <div class="filters" id="filters"></div>
    <div class="g g3 mb-5" style="max-width:500px">
      <div class="stat" style="cursor:default">
        <div class="stat-label">Total Q&A Pairs</div>
        <div class="stat-val">${mockStats.totalQA}</div>
      </div>
      <div class="stat" style="cursor:default">
        <div class="stat-label">Avg Confidence</div>
        <div class="stat-val">${mockStats.avgConfidence}%</div>
      </div>
      <div class="stat" style="cursor:default">
        <div class="stat-label">Sessions with Q&A</div>
        <div class="stat-val">${mockStats.sessionsWithQA}</div>
      </div>
    </div>
    <div id="qa-list">
      ${mockQA.map(qa => `
        <div class="qa">
          <div class="flex jc-b items-s mb-4">
            <div class="text-xs text-t">
              <strong>${qa.project}</strong> · ${qa.session} · <span class="mono">${qa.time} — Last updated: ${qa.lastUpdated}</span>
              <button class="qa-refresh" data-id="${qa.id}">↻ Refresh</button>
            </div>
            ${getConfidenceBadge(qa.confidence)}
          </div>
          <div class="qa-q"><div class="qi">Q</div><div class="qa-txt q">${qa.question}</div></div>
          <div class="qa-a"><div class="ai">A</div><div class="qa-txt">${qa.answer}</div></div>
        </div>
      `).join('')}
    </div>
  `;

  const filters = el.querySelector('#filters');
  filters.appendChild(SearchBox({ placeholder: 'Search questions or answers...' }));
  filters.appendChild(FilterSelect({
    options: [
      { value: '', label: 'All Projects' },
      { value: 'acme', label: 'Acme Corp Sales' },
      { value: 'logistics', label: 'Global Logistics Demo' },
    ],
  }));
  filters.appendChild(FilterSelect({
    options: [
      { value: '', label: 'All Sessions' },
      { value: 'integration', label: 'Integration Planning' },
      { value: 'q3', label: 'Q3 Architecture Review' },
    ],
  }));
  filters.appendChild(FilterSelect({
    options: [
      { value: '', label: 'All Confidence' },
      { value: 'high', label: 'High (≥90%)' },
      { value: 'medium', label: 'Medium (70–89%)' },
    ],
  }));
  filters.appendChild(FilterSelect({
    options: [
      { value: '', label: 'All Dates' },
      { value: 'today', label: 'Today' },
      { value: 'week', label: 'This Week' },
    ],
  }));

  // Handle refresh buttons
  el.querySelectorAll('.qa-refresh').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.textContent = '↻ Refreshing...';
      setTimeout(() => {
        btn.textContent = '↻ Refresh';
      }, 1000);
    });
  });

  return el;
}
