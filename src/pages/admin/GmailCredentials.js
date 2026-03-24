import { Table } from '../../components/ui/Table.js';
import { Button } from '../../components/ui/Button.js';
import { navigate } from '../../router.js';

const mockCredentials = [
  { id: '1', email: 'techsales-bot@agents.company.com', verification: 'verified', availability: 'available', lastUsed: 'Mar 15, 2026' },
  { id: '2', email: 'demo-bot@agents.company.com', verification: 'verified', availability: 'available', lastUsed: 'Mar 14, 2026' },
  { id: '3', email: 'support-bot@agents.company.com', verification: 'failed', availability: 'unavailable', lastUsed: '—' },
];

export default function GmailCredentialsPage() {
  const el = document.createElement('div');
  el.className = 'page';

  el.innerHTML = `
    <div class="pg-hdr">
      <div>
        <h1>Gmail Credentials</h1>
        <div class="pg-sub">Manage Gmail accounts used by projects to join Google Meet</div>
      </div>
      <div class="pg-actions" id="actions"></div>
    </div>
    <div class="card mb-5" style="background:var(--warn-50);border-color:var(--warn-100)">
      <div class="card-body" style="padding:12px 20px">
        <div class="flex items-c gap-3">
          <span>🔒</span>
          <span class="text-sm" style="color:var(--warn-700)">Gmail passwords are encrypted at rest using AWS KMS and are <strong>never displayed in plain text</strong>. Credentials are only decrypted in memory when authenticating.</span>
        </div>
      </div>
    </div>
    <div id="table"></div>
  `;

  el.querySelector('#actions').appendChild(
    Button({ text: '+ Add Credential', variant: 'p', onClick: () => navigate('gmail-create') })
  );

  const getVerificationBadge = (status) => {
    if (status === 'verified') return '<span class="badge b-ok"><span class="dot"></span> verified</span>';
    return '<span class="badge b-err"><span class="dot"></span> failed to verify</span>';
  };

  const getAvailabilityBadge = (status) => {
    if (status === 'available') return '<span class="badge b-ok"><span class="dot"></span> available</span>';
    return '<span class="badge b-gray"><span class="dot"></span> unavailable</span>';
  };

  const table = Table({
    columns: [
      { label: 'Gmail Account', render: r => `<span class="mono text-sm">${r.email}</span>` },
      { label: 'Verification', render: r => getVerificationBadge(r.verification) },
      { label: 'Availability', render: r => getAvailabilityBadge(r.availability) },
      { label: 'Last Used', key: 'lastUsed', className: 'text-xs' },
      { label: '', render: () => `
        <div class="flex gap-2">
          <button class="btn btn-s btn-sm" data-action="edit">Edit</button>
          <button class="btn btn-d btn-sm">Remove</button>
        </div>
      ` },
    ],
    data: mockCredentials,
    footer: `<span>${mockCredentials.length} credentials · Encrypted at rest via AWS KMS · Passwords never shown in plain text</span>`,
  });

  el.querySelector('#table').appendChild(table);

  // Handle edit button
  el.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action="edit"]');
    if (btn) navigate('gmail-edit');
  });

  return el;
}
