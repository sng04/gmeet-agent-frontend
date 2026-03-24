import { Button } from '../../components/ui/Button.js';
import { SearchBox, FilterSelect } from '../../components/ui/Form.js';
import { navigate } from '../../router.js';

const mockSkillBuckets = [
  {
    id: '1',
    name: 'Sales Skills',
    prefix: 'sales-skills',
    type: 'real-time',
    fileCount: 3,
    lastUpdated: 'Mar 15, 2026',
    files: [
      { name: 'objection-handling.txt', description: 'Handles common sales objections with rebuttals', size: '12 KB', status: 'verified', uploaded: 'Mar 10, 2026' },
      { name: 'pricing-negotiation.txt', description: 'Pricing tiers and negotiation guidance', size: '8 KB', status: 'verified', uploaded: 'Mar 12, 2026' },
      { name: 'follow-up-templates.txt', description: 'Email templates for post-meeting follow-ups', size: '15 KB', status: 'verified', uploaded: 'Mar 15, 2026' },
    ],
  },
  {
    id: '2',
    name: 'Meeting Summary Skills',
    prefix: 'summary-skills',
    type: 'post-session',
    fileCount: 1,
    lastUpdated: 'Mar 10, 2026',
    files: [
      { name: 'meeting-summariser.txt', description: 'Formats Q&A pairs into structured meeting notes', size: '6 KB', status: 'verified', uploaded: 'Mar 10, 2026' },
    ],
  },
];

export default function SkillsPage() {
  const el = document.createElement('div');
  el.className = 'page';

  el.innerHTML = `
    <div class="pg-hdr">
      <div>
        <h1>Skills</h1>
        <div class="pg-sub">Skill instruction buckets — each bucket has a prefix and contains uploadable skill files injected into the agent</div>
      </div>
      <div class="pg-actions" id="actions"></div>
    </div>
    <div class="filters" id="filters"></div>
    <div id="buckets-list"></div>
    <div class="card" style="background:var(--gray-25);border-color:var(--gray-100)">
      <div class="card-body" style="padding:14px 20px">
        <div class="text-xs text-t">⚡ Skill buckets work like Knowledge Base collections — each bucket has a prefix and contains uploadable instruction files. <strong>Real-time</strong> buckets are injected during sessions; <strong>post-session</strong> buckets trigger after a session ends. Skills are separate from a project's KB.</div>
      </div>
    </div>
  `;

  el.querySelector('#actions').appendChild(
    Button({ text: '+ New Skill Bucket', variant: 'p', onClick: () => navigate('skill-create') })
  );

  const filters = el.querySelector('#filters');
  filters.appendChild(SearchBox({ placeholder: 'Search skill buckets...' }));
  filters.appendChild(FilterSelect({
    options: [
      { value: '', label: 'All Types' },
      { value: 'real-time', label: 'real-time' },
      { value: 'post-session', label: 'post-session' },
    ],
  }));

  const bucketsList = el.querySelector('#buckets-list');

  mockSkillBuckets.forEach(bucket => {
    const folder = document.createElement('div');
    folder.className = 'kb-folder';
    folder.innerHTML = `
      <div class="kb-folder-hdr" data-toggle="${bucket.id}">
        <div class="flex items-c gap-3">
          <span style="font-size:18px">⚡</span>
          <div>
            <div class="text-sm fw-sb">${bucket.name}</div>
            <div class="text-xs text-t">${bucket.fileCount} skill files · Last updated ${bucket.lastUpdated}</div>
          </div>
          <span class="kb-folder-tag">prefix: ${bucket.prefix}</span>
          <span class="badge ${bucket.type === 'real-time' ? 'b-info' : 'b-pri'}" style="margin-left:4px">${bucket.type}</span>
        </div>
        <div class="flex gap-2 items-c">
          <span class="text-xs text-t" id="toggle-${bucket.id}">▲ collapse</span>
          <label class="upload-zone" style="display:inline-flex;align-items:center;gap:6px;padding:4px 12px;margin:0;border-style:dashed;border-width:1px;cursor:pointer;font-size:12px;color:var(--pri-500);background:var(--pri-25)">📤 Upload Skill File</label>
        </div>
      </div>
      <div id="content-${bucket.id}">
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr>
              <th style="text-align:left;font-size:11px;font-weight:500;color:var(--gray-500);text-transform:uppercase;letter-spacing:.05em;padding:10px 20px;border-bottom:1px solid var(--gray-100);background:var(--gray-25)">Skill File</th>
              <th style="text-align:left;font-size:11px;font-weight:500;color:var(--gray-500);text-transform:uppercase;padding:10px 20px;border-bottom:1px solid var(--gray-100);background:var(--gray-25)">Size</th>
              <th style="text-align:left;font-size:11px;font-weight:500;color:var(--gray-500);text-transform:uppercase;padding:10px 20px;border-bottom:1px solid var(--gray-100);background:var(--gray-25)">Status</th>
              <th style="text-align:left;font-size:11px;font-weight:500;color:var(--gray-500);text-transform:uppercase;padding:10px 20px;border-bottom:1px solid var(--gray-100);background:var(--gray-25)">Uploaded</th>
              <th style="padding:10px 20px;border-bottom:1px solid var(--gray-100);background:var(--gray-25)"></th>
            </tr>
          </thead>
          <tbody>
            ${bucket.files.map((file, i) => `
              <tr>
                <td style="padding:12px 20px;${i < bucket.files.length - 1 ? 'border-bottom:1px solid var(--gray-100)' : ''}">
                  <div class="flex items-c gap-3">
                    <div class="doc-icon txt">📄</div>
                    <div>
                      <div class="text-sm fw-m text-p">${file.name}</div>
                      <div class="text-xs text-t mt-1">${file.description}</div>
                    </div>
                  </div>
                </td>
                <td style="padding:12px 20px;font-family:var(--mono);font-size:13px;${i < bucket.files.length - 1 ? 'border-bottom:1px solid var(--gray-100)' : ''}">${file.size}</td>
                <td style="padding:12px 20px;${i < bucket.files.length - 1 ? 'border-bottom:1px solid var(--gray-100)' : ''}"><span class="badge b-indexed"><span class="dot"></span> ${file.status}</span></td>
                <td style="padding:12px 20px;font-size:12px;${i < bucket.files.length - 1 ? 'border-bottom:1px solid var(--gray-100)' : ''}">${file.uploaded}</td>
                <td style="padding:12px 20px;${i < bucket.files.length - 1 ? 'border-bottom:1px solid var(--gray-100)' : ''}"><button class="btn btn-d btn-sm">Delete</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
    bucketsList.appendChild(folder);
  });

  // Toggle folder collapse
  el.addEventListener('click', (e) => {
    const header = e.target.closest('[data-toggle]');
    if (header && !e.target.closest('.upload-zone')) {
      const id = header.dataset.toggle;
      const content = el.querySelector(`#content-${id}`);
      const toggle = el.querySelector(`#toggle-${id}`);
      if (content.style.display === 'none') {
        content.style.display = '';
        toggle.textContent = '▲ collapse';
      } else {
        content.style.display = 'none';
        toggle.textContent = '▼ expand';
      }
    }
  });

  return el;
}
