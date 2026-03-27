import { loadTemplate } from '../../utils/template.js';
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

export default async function ProjectDetailController(params) {
  const el = await loadTemplate('/templates/admin/project-detail.html', 'project-detail');

  const getStatusBadge = (status) => {
    const badges = {
      live: '<span class="badge b-live"><span class="dot"></span> Live</span>',
      finished: '<span class="badge b-summary"><span class="dot"></span> Finished</span>',
      ended: '<span class="badge b-ended"><span class="dot"></span> Ended</span>',
    };
    return badges[status] || '';
  };

  // Populate data-bind fields
  el.querySelector('[data-bind="projectName"]').textContent = mockProject.name;
  el.querySelector('[data-bind="title"]').textContent = mockProject.name;
  el.querySelector('[data-bind="description"]').textContent = mockProject.description;
  el.querySelector('[data-bind="statAgent"]').textContent = mockProject.agent;
  el.querySelector('[data-bind="statGmail"]').textContent = mockProject.gmail;
  el.querySelector('[data-bind="statKbPrefix"]').innerHTML = `<code>${mockProject.kbPrefix}</code>`;
  el.querySelector('[data-bind="statUsers"]').textContent = mockProject.users;
  el.querySelector('[data-bind="statSessions"]').textContent = mockProject.sessions;
  el.querySelector('[data-bind="kbMeta"]').innerHTML = `${mockDocs.length} documents · Last updated Mar 12, 2026 · <span class="kb-folder-tag">prefix: ${mockProject.kbPrefix}</span>`;

  // KB docs table
  el.querySelector('[data-bind="kbContent"]').innerHTML = `
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
  `;

  // Users tab content
  el.querySelector('[data-bind="tabUsers"]').innerHTML = `
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
  `;

  // Sessions tab content
  el.querySelector('[data-bind="tabSessions"]').innerHTML = `
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
  `;

  // Breadcrumb nav-back handlers
  el.querySelectorAll('.nav-back').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      navigate(link.dataset.to);
    });
  });

  // Edit Project button
  el.querySelector('[data-bind="actions"]').appendChild(
    Button({ text: 'Edit Project', variant: 's', onClick: () => navigate('project-edit') })
  );

  // View Live button
  el.querySelector('[data-action="viewLive"]').addEventListener('click', () => navigate('qa'));

  // Tab switching
  el.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      el.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      el.querySelectorAll('.tab-c').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      const tabName = tab.dataset.tab;
      const bindName = tabName === 'users' ? 'tabUsers' : 'tabSessions';
      el.querySelector(`[data-bind="${bindName}"]`).classList.add('active');
    });
  });

  // KB folder collapse toggle
  el.querySelector('[data-action="kbToggle"]').addEventListener('click', (e) => {
    if (!e.target.closest('.upload-zone')) {
      const content = el.querySelector('[data-bind="kbContent"]');
      const toggleText = el.querySelector('[data-bind="kbToggleText"]');
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
