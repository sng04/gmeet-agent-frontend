import { Button } from '../../components/ui/Button.js';
import { navigate } from '../../router.js';

const mockProject = {
  id: '1',
  name: 'Acme Corp Sales',
  description: 'Enterprise sales meetings with Acme Corp technical team',
  agent: 'TechSales Bot',
  gmail: 'techsales-bot@agents.company.com',
  kbPrefix: 'acme-corp',
  users: 4,
  sessions: 3,
};

const mockUsers = [
  { name: 'Sarah Chen', email: 'sarah@company.com', role: 'user', added: 'Feb 10, 2026' },
  { name: 'Mike Lee', email: 'mike@company.com', role: 'user', added: 'Feb 12, 2026' },
  { name: 'Anna Park', email: 'anna@company.com', role: 'user', added: 'Feb 15, 2026' },
  { name: 'James Wu', email: 'james@company.com', role: 'user', added: 'Mar 1, 2026' },
];

const mockSessions = [
  { purpose: 'Q3 Architecture Review', status: 'finished', qa: 8, duration: '47 min', createdBy: 'Sarah Chen' },
  { purpose: 'Integration Planning', status: 'live', qa: 3, duration: '12 min', createdBy: 'Sarah Chen' },
  { purpose: 'Security Compliance Review', status: 'ended', qa: 0, duration: '—', createdBy: 'Sarah Chen' },
];

const mockDocs = [
  { name: 'Platform Architecture Overview.pdf', type: 'pdf', size: '2.4 MB', status: 'indexed', uploaded: 'Mar 10, 2026' },
  { name: 'API Reference Guide.docx', type: 'docx', size: '1.1 MB', status: 'indexed', uploaded: 'Mar 10, 2026' },
  { name: 'Security Compliance Checklist.pdf', type: 'pdf', size: '890 KB', status: 'indexed', uploaded: 'Mar 12, 2026' },
];

export default function ProjectDetailPage() {
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

  el.innerHTML = `
    <div class="bc">
      <a href="#" class="nav-back" data-to="projects">Projects</a>
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
            <div class="text-xs text-t">Started by Sarah Chen · 12 min ago · 3 Q&A pairs</div>
          </div>
          <button class="btn btn-s btn-sm" style="margin-left:auto" id="view-live-btn">View Live →</button>
        </div>
      </div>
    </div>

    <!-- Stats -->
    <div class="g g5 mb-6">
      <div class="stat" style="cursor:default">
        <div class="stat-label">Default Agent</div>
        <div class="stat-val" style="font-size:15px;margin-top:4px">${mockProject.agent}</div>
      </div>
      <div class="stat" style="cursor:default">
        <div class="stat-label">Gmail Credential</div>
        <div class="stat-val" style="font-size:11px;font-weight:500;margin-top:4px;font-family:var(--mono);word-break:break-all">${mockProject.gmail}</div>
      </div>
      <div class="stat" style="cursor:default">
        <div class="stat-label">KB Prefix</div>
        <div class="stat-val" style="font-size:18px;margin-top:4px"><code>${mockProject.kbPrefix}</code></div>
      </div>
      <div class="stat" style="cursor:default">
        <div class="stat-label">Assigned Users</div>
        <div class="stat-val">${mockProject.users}</div>
      </div>
      <div class="stat" style="cursor:default">
        <div class="stat-label">Total Sessions</div>
        <div class="stat-val">${mockProject.sessions}</div>
      </div>
    </div>

    <!-- Knowledge Base Section -->
    <div class="kb-folder mb-6">
      <div class="kb-folder-hdr" id="kb-toggle">
        <div class="flex items-c gap-3">
          <span style="font-size:18px">📚</span>
          <div>
            <div class="text-sm fw-sb">Knowledge Base</div>
            <div class="text-xs text-t">${mockDocs.length} documents · Last updated Mar 12, 2026 · <span class="kb-folder-tag">prefix: ${mockProject.kbPrefix}</span></div>
          </div>
        </div>
        <div class="flex gap-2 items-c">
          <span class="text-xs text-t" id="kb-toggle-text">▲ collapse</span>
          <label class="upload-zone" style="display:inline-flex;align-items:center;gap:6px;padding:4px 12px;margin:0;border-style:dashed;border-width:1px;cursor:pointer;font-size:12px;color:var(--pri-500);background:var(--pri-25)">📤 Upload Doc</label>
        </div>
      </div>
      <div id="kb-content">
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr>
              <th style="text-align:left;font-size:11px;font-weight:500;color:var(--gray-500);text-transform:uppercase;letter-spacing:.05em;padding:10px 20px;border-bottom:1px solid var(--gray-100);background:var(--gray-25)">Document</th>
              <th style="text-align:left;font-size:11px;font-weight:500;color:var(--gray-500);text-transform:uppercase;padding:10px 20px;border-bottom:1px solid var(--gray-100);background:var(--gray-25)">Size</th>
              <th style="text-align:left;font-size:11px;font-weight:500;color:var(--gray-500);text-transform:uppercase;padding:10px 20px;border-bottom:1px solid var(--gray-100);background:var(--gray-25)">Status</th>
              <th style="text-align:left;font-size:11px;font-weight:500;color:var(--gray-500);text-transform:uppercase;padding:10px 20px;border-bottom:1px solid var(--gray-100);background:var(--gray-25)">Uploaded</th>
              <th style="padding:10px 20px;border-bottom:1px solid var(--gray-100);background:var(--gray-25)"></th>
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
                <td style="padding:12px 20px;font-size:12px;${i < mockDocs.length - 1 ? 'border-bottom:1px solid var(--gray-100)' : ''}">${doc.uploaded}</td>
                <td style="padding:12px 20px;${i < mockDocs.length - 1 ? 'border-bottom:1px solid var(--gray-100)' : ''}"><button class="btn btn-d btn-sm">Delete</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs">
      <div class="tab active" data-tab="users">Assigned Users</div>
      <div class="tab" data-tab="sessions">Session History</div>
    </div>

    <!-- Users Tab -->
    <div class="tab-c active" id="tab-users">
      <div class="flex jc-b items-c mb-4">
        <div class="text-sm text-t">${mockUsers.length} users assigned</div>
        <button class="btn btn-p btn-sm">+ Assign User</button>
      </div>
      <div class="tbl-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Added</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${mockUsers.map(user => `
              <tr>
                <td><strong>${user.name}</strong></td>
                <td class="mono text-sm">${user.email}</td>
                <td><span class="badge b-gray">${user.role}</span></td>
                <td class="text-xs">${user.added}</td>
                <td><button class="btn btn-d btn-sm">Remove</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Sessions Tab -->
    <div class="tab-c" id="tab-sessions">
      <div class="tbl-wrap">
        <table>
          <thead>
            <tr>
              <th>Purpose</th>
              <th>State</th>
              <th>Q&A</th>
              <th>Duration</th>
              <th>Created By</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${mockSessions.map(session => `
              <tr>
                <td><strong>${session.purpose}</strong></td>
                <td>${getStatusBadge(session.status)}</td>
                <td>${session.qa}</td>
                <td class="mono text-xs">${session.duration}</td>
                <td>${session.createdBy}</td>
                <td><button class="btn btn-s btn-sm">Review</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
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
    Button({ text: 'Edit Project', variant: 's', onClick: () => navigate('project-edit') })
  );

  el.querySelector('#view-live-btn').addEventListener('click', () => navigate('qa'));

  // Tab switching
  el.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      el.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      el.querySelectorAll('.tab-c').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      el.querySelector(`#tab-${tab.dataset.tab}`).classList.add('active');
    });
  });

  // KB folder toggle
  el.querySelector('#kb-toggle').addEventListener('click', (e) => {
    if (!e.target.closest('.upload-zone')) {
      const content = el.querySelector('#kb-content');
      const toggleText = el.querySelector('#kb-toggle-text');
      if (content.style.display === 'none') {
        content.style.display = '';
        toggleText.textContent = '▲ collapse';
      } else {
        content.style.display = 'none';
        toggleText.textContent = '▼ expand';
      }
    }
  });

  return el;
}
