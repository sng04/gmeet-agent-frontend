import { Button } from '../../components/ui/Button.js';
import { navigate } from '../../router.js';

const mockProject = {
  id: '1',
  name: 'Acme Corp Sales',
  description: 'Enterprise sales meetings with Acme Corp technical team',
  agent: 'TechSales Bot',
  sessions: 3,
  qa: 11,
};

const mockSessions = [
  { id: '1', purpose: 'Integration Planning', status: 'live', agent: 'TechSales Bot', qa: 3, duration: '12 min (ongoing)', date: 'Started today 10:30 AM' },
  { id: '2', purpose: 'Q3 Architecture Review', status: 'finished', agent: 'TechSales Bot', qa: 8, duration: '47 min', date: 'Mar 15, 2026' },
  { id: '3', purpose: 'Security Compliance Review', status: 'ended', agent: 'TechSales Bot', qa: 0, duration: '—', date: 'Mar 12, 2026' },
];

const mockQA = [
  { session: 'Integration Planning', date: 'Today, 10:31 AM', question: 'Can we integrate this with our existing Slack workspace?', answer: 'Currently, the system focuses on Google Meet integration. Slack integration is not in the current scope, but the architecture supports future webhook-based integrations.', confidence: 94 },
  { session: 'Q3 Architecture Review', date: 'Mar 15, 09:05 AM', question: 'What kind of encryption do you use for data at rest?', answer: 'We use AES-256 encryption for all data at rest, managed through AWS KMS. All keys are rotated annually.', confidence: 92 },
  { session: 'Q3 Architecture Review', date: 'Mar 15, 09:12 AM', question: 'How does the system handle concurrent users?', answer: 'Our system uses auto-scaling through ECS Fargate, supporting up to 500 concurrent sessions with sub-3-second latency.', confidence: 88 },
];

const mockDocs = [
  { name: 'Platform Architecture Overview.pdf', type: 'pdf', size: '2.4 MB', status: 'indexed', uploaded: 'Mar 10, 2026' },
  { name: 'API Reference Guide.docx', type: 'docx', size: '1.1 MB', status: 'indexed', uploaded: 'Mar 10, 2026' },
  { name: 'Security Compliance Checklist.pdf', type: 'pdf', size: '890 KB', status: 'indexed', uploaded: 'Mar 12, 2026' },
];

export default function UserProjectDetailPage() {
  const el = document.createElement('div');
  el.className = 'page';

  const getStatusBadge = (status) => {
    const badges = {
      live: '<span class="badge b-live"><span class="dot"></span> Live</span>',
      finished: '<span class="badge b-summary"><span class="dot"></span> Finished</span>',
      ended: '<span class="badge b-ended"><span class="dot"></span> Ended</span>',
    };
    return badges[status] || '';
  };

  const getConfidenceBadge = (conf) => {
    if (conf >= 90) return `<span class="badge b-ok">${conf}%</span>`;
    if (conf >= 80) return `<span class="badge b-warn">${conf}%</span>`;
    return `<span class="badge b-err">${conf}%</span>`;
  };

  el.innerHTML = `
    <div class="bc">
      <a href="#" class="nav-back" data-to="">My Projects</a>
      <span class="sep">›</span>
      <span class="cur">${mockProject.name}</span>
    </div>
    <div class="pg-hdr">
      <div>
        <h1>${mockProject.name}</h1>
        <div class="pg-sub">${mockProject.description}</div>
      </div>
      <div class="pg-actions" id="actions"></div>
    </div>

    <!-- Live Session Banner -->
    <div class="card mb-6" style="border-color:var(--err-500);background:var(--err-50)">
      <div class="card-body" style="padding:14px 20px">
        <div class="flex items-c gap-3">
          <span class="badge b-live" style="font-size:12px;padding:4px 10px"><span class="dot"></span> Live Session</span>
          <div>
            <div class="text-sm fw-sb text-p">Integration Planning</div>
            <div class="text-xs text-t">Started by you · 12 min ago · 3 Q&A pairs</div>
          </div>
          <button class="btn btn-live btn-sm" style="margin-left:auto" id="live-btn">Open Live View →</button>
        </div>
      </div>
    </div>

    <!-- Stats -->
    <div class="g g3 mb-6">
      <div class="stat" style="cursor:default">
        <div class="stat-label">Default Agent</div>
        <div class="stat-val" style="font-size:15px;margin-top:4px">${mockProject.agent}</div>
      </div>
      <div class="stat" style="cursor:default">
        <div class="stat-label">Total Sessions</div>
        <div class="stat-val">${mockProject.sessions}</div>
      </div>
      <div class="stat" style="cursor:default">
        <div class="stat-label">Total Q&A Pairs</div>
        <div class="stat-val">${mockProject.qa}</div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs">
      <div class="tab active" data-tab="sessions">📋 Sessions</div>
      <div class="tab" data-tab="qna">💬 Q&A Pairs</div>
      <div class="tab" data-tab="kb">📚 Knowledge Base</div>
    </div>

    <!-- Sessions Tab -->
    <div class="tab-c active" id="tab-sessions">
      <div class="tbl-wrap">
        <table>
          <thead>
            <tr>
              <th>Purpose</th>
              <th>Status</th>
              <th>Agent</th>
              <th>Q&A</th>
              <th>Duration</th>
              <th style="text-align:right">Action</th>
            </tr>
          </thead>
          <tbody>
            ${mockSessions.map(s => `
              <tr>
                <td><strong class="text-p">${s.purpose}</strong><div class="text-xs text-t">${s.date}</div></td>
                <td>${getStatusBadge(s.status)}</td>
                <td>${s.agent}</td>
                <td>${s.qa}</td>
                <td class="mono text-xs">${s.duration}</td>
                <td>
                  <div class="session-action-btns">
                    ${s.status === 'live' ? '<button class="btn btn-live btn-sm" data-action="live">Live →</button>' : ''}
                    ${s.status === 'finished' ? '<button class="btn btn-review btn-sm" data-action="review">Review</button>' : ''}
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="tbl-foot"><span>${mockSessions.length} sessions</span></div>
      </div>
    </div>

    <!-- Q&A Tab -->
    <div class="tab-c" id="tab-qna">
      <div class="g g3 mb-5" style="max-width:500px">
        <div class="stat" style="cursor:default"><div class="stat-label">Total Q&A Pairs</div><div class="stat-val">${mockProject.qa}</div></div>
        <div class="stat" style="cursor:default"><div class="stat-label">Avg Confidence</div><div class="stat-val">88%</div></div>
        <div class="stat" style="cursor:default"><div class="stat-label">Sessions with Q&A</div><div class="stat-val">3</div></div>
      </div>
      ${mockQA.map(qa => `
        <div class="qa">
          <div class="flex jc-b items-s mb-4">
            <div class="text-xs text-t"><strong>${qa.session}</strong> · ${qa.date}</div>
            ${getConfidenceBadge(qa.confidence)}
          </div>
          <div class="qa-q"><div class="qi">Q</div><div class="qa-txt q">${qa.question}</div></div>
          <div class="qa-a"><div class="ai">A</div><div class="qa-txt">${qa.answer}</div></div>
        </div>
      `).join('')}
    </div>

    <!-- KB Tab -->
    <div class="tab-c" id="tab-kb">
      <div class="kb-folder">
        <div class="kb-folder-hdr">
          <div class="flex items-c gap-3">
            <span style="font-size:18px">📚</span>
            <div>
              <div class="text-sm fw-sb">${mockProject.name}</div>
              <div class="text-xs text-t">${mockDocs.length} documents · Last updated Mar 12, 2026</div>
            </div>
            <span class="kb-folder-tag">prefix: acme-corp</span>
          </div>
        </div>
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr>
              <th style="text-align:left;font-size:11px;font-weight:500;color:var(--gray-500);text-transform:uppercase;letter-spacing:.05em;padding:10px 20px;border-bottom:1px solid var(--gray-100);background:var(--gray-25)">Document</th>
              <th style="text-align:left;font-size:11px;font-weight:500;color:var(--gray-500);text-transform:uppercase;padding:10px 20px;border-bottom:1px solid var(--gray-100);background:var(--gray-25)">Size</th>
              <th style="text-align:left;font-size:11px;font-weight:500;color:var(--gray-500);text-transform:uppercase;padding:10px 20px;border-bottom:1px solid var(--gray-100);background:var(--gray-25)">Status</th>
              <th style="text-align:left;font-size:11px;font-weight:500;color:var(--gray-500);text-transform:uppercase;padding:10px 20px;border-bottom:1px solid var(--gray-100);background:var(--gray-25)">Uploaded</th>
            </tr>
          </thead>
          <tbody>
            ${mockDocs.map((doc, i) => `
              <tr>
                <td style="padding:12px 20px;${i < mockDocs.length - 1 ? 'border-bottom:1px solid var(--gray-100)' : ''}">
                  <div class="flex items-c gap-3">
                    <div class="doc-icon ${doc.type}">${doc.type === 'pdf' ? '📕' : '📘'}</div>
                    <div class="text-sm fw-m text-p">${doc.name}</div>
                  </div>
                </td>
                <td style="padding:12px 20px;font-family:var(--mono);font-size:13px;${i < mockDocs.length - 1 ? 'border-bottom:1px solid var(--gray-100)' : ''}">${doc.size}</td>
                <td style="padding:12px 20px;${i < mockDocs.length - 1 ? 'border-bottom:1px solid var(--gray-100)' : ''}"><span class="badge b-indexed"><span class="dot"></span> ${doc.status}</span></td>
                <td style="padding:12px 20px;font-size:12px;color:var(--gray-500);${i < mockDocs.length - 1 ? 'border-bottom:1px solid var(--gray-100)' : ''}">${doc.uploaded}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <div class="card" style="background:var(--gray-25);border-color:var(--gray-100)">
        <div class="card-body" style="padding:14px 20px">
          <div class="text-xs text-t">📌 These are the reference documents your agent uses to answer questions during sessions. Contact your admin to add or update documents.</div>
        </div>
      </div>
    </div>
  `;

  el.querySelectorAll('.nav-back').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      navigate(link.dataset.to);
    });
  });

  el.querySelector('#actions').appendChild(
    Button({ text: '+ New Session', variant: 'p', onClick: () => navigate('session-create') })
  );

  el.querySelector('#live-btn').addEventListener('click', () => navigate('live-session'));

  // Tab switching
  el.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      el.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      el.querySelectorAll('.tab-c').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      el.querySelector(`#tab-${tab.dataset.tab}`).classList.add('active');
    });
  });

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
