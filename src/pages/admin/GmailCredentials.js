import { Button } from '../../components/ui/Button.js';
import { Alert } from '../../components/ui/Alert.js';
import { getVerificationBadge, getStatusBadge, getContainerStatusBadge } from '../../components/ui/Badge.js';
import { navigate } from '../../router.js';
import { botCredentialApi } from '../../api/botCredential.js';

export default function GmailCredentialsPage() {
  const container = document.createElement('div');
  container.className = 'page';
  container.id = 'p-gmail-credentials';

  container.innerHTML = `
    <div class="pg-hdr">
      <div>
        <h1>Gmail Credentials</h1>
        <div class="pg-sub">Manage Gmail accounts used by projects to join Google Meet</div>
      </div>
      <div class="pg-actions" id="actions"></div>
    </div>
    <div id="alert-container"></div>
    <div id="credentials-list">
      <div class="loading">
        <div class="loading-spinner"></div>
        <div class="loading-text">Loading credentials...</div>
      </div>
    </div>
  `;

  container.querySelector('#actions').appendChild(
    Button({ text: '+ Add Credential', variant: 'p', onClick: () => navigate('gmail-create') })
  );

  // Add alert
  container.querySelector('#alert-container').appendChild(
    Alert({
      message: 'Gmail passwords are encrypted at rest using AWS KMS and are <strong>never displayed in plain text</strong>. Credentials are only decrypted in memory when authenticating.',
      variant: 'warn',
      icon: '🔒'
    })
  );

  let credentials = [];
  
  // Load credentials
  async function loadCredentials() {
    const tableContainer = container.querySelector('#credentials-list');

    try {
      const response = await botCredentialApi.list();
      credentials = response.data?.items || [];
      renderCredentials();
    } catch (err) {
      console.error('Failed to load credentials:', err);
      tableContainer.innerHTML = `
        <div class="empty">
          <div class="empty-icon">⚠️</div>
          <div class="empty-title">Failed to load credentials</div>
          <div class="empty-desc">${err.message}</div>
        </div>
      `;
    }
  }

  async function handleDelete(credentialId, email) {
    if (!confirm(`Are you sure you want to remove credential "${email}"?`)) return;
    
    try {
      await botCredentialApi.delete(credentialId);
      await loadCredentials();
    } catch (err) {
      alert(`Failed to delete: ${err.message}`);
    }
  }

  async function toggleExpand(credentialId, expandRow) {
    const isExpanded = expandRow.style.display !== 'none';
    
    if (isExpanded) {
      expandRow.style.display = 'none';
      return;
    }

    expandRow.style.display = 'table-row';
    expandRow.querySelector('.pool-content').innerHTML = '<div class="text-center text-t py-4">Loading pool...</div>';

    try {
      const response = await botCredentialApi.getPool(credentialId);
      const containers = response.data?.containers || [];
      
      if (containers.length === 0) {
        expandRow.querySelector('.pool-content').innerHTML = '<div class="text-center text-t py-4">No containers in pool</div>';
        return;
      }

      const poolHtml = `
        <table class="pool-table">
          <thead>
            <tr>
              <th>Container ID</th>
              <th>Session</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${containers.map(c => `
              <tr>
                <td><code class="text-xs">${c.container_id}</code></td>
                <td>${c.current_session_name || '—'}</td>
                <td>${getContainerStatusBadge(c.status)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
      expandRow.querySelector('.pool-content').innerHTML = poolHtml;
    } catch (err) {
      expandRow.querySelector('.pool-content').innerHTML = `<div class="text-center text-t py-4">Failed to load pool: ${err.message}</div>`;
    }
  }

  function renderCredentials() {
    const tableContainer = container.querySelector('#credentials-list');
    
    if (credentials.length === 0) {
      tableContainer.innerHTML = `
        <div class="empty">
          <div class="empty-icon">📧</div>
          <div class="empty-title">No credentials found</div>
          <div class="empty-desc">Click "Add Credential" to create your first Gmail credential</div>
        </div>
      `;
      return;
    }

    const tableWrap = document.createElement('div');
    tableWrap.className = 'tbl-wrap';
    tableWrap.innerHTML = `
      <table>
        <thead>
          <tr>
            <th style="width:40px"></th>
            <th>Gmail Account</th>
            <th>Verification</th>
            <th>Status</th>
            <th>Warm Pool Size</th>
            <th></th>
          </tr>
        </thead>
        <tbody id="cred-tbody"></tbody>
      </table>
      <div class="tbl-foot">
        <span>${credentials.length} credentials · Encrypted at rest via AWS KMS</span>
      </div>
    `;

    const tbody = tableWrap.querySelector('#cred-tbody');

    credentials.forEach(cred => {
      // Main row
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <button class="btn btn-g btn-sm expand-btn" data-id="${cred.credential_id}" style="padding:4px 8px">
            <span class="expand-icon">▶</span>
          </button>
        </td>
        <td><span class="mono text-sm">${cred.email}</span></td>
        <td>${getVerificationBadge(cred.verification_status)}</td>
        <td>${getStatusBadge(cred.available_status)}</td>
        <td>${cred.warm_pool_size || 0}</td>
        <td>
          <div class="flex gap-2 jc-end">
            <button class="btn btn-s btn-sm" data-action="edit" data-id="${cred.credential_id}">Edit</button>
            <button class="btn btn-d btn-sm" data-action="delete" data-id="${cred.credential_id}" data-email="${cred.email}">Remove</button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);

      // Expandable row for pool
      const expandRow = document.createElement('tr');
      expandRow.className = 'expand-row';
      expandRow.style.display = 'none';
      expandRow.innerHTML = `
        <td colspan="6" style="padding:0;background:var(--gray-50)">
          <div class="pool-content" style="padding:16px 20px"></div>
        </td>
      `;
      tbody.appendChild(expandRow);

      // Expand button click
      tr.querySelector('.expand-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        const icon = tr.querySelector('.expand-icon');
        const isExpanded = expandRow.style.display !== 'none';
        icon.textContent = isExpanded ? '▶' : '▼';
        toggleExpand(cred.credential_id, expandRow);
      });
    });

    tableContainer.innerHTML = '';
    tableContainer.appendChild(tableWrap);

    // Handle action buttons
    tableContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      
      e.stopPropagation();
      const action = btn.dataset.action;
      const id = btn.dataset.id;
      
      if (action === 'edit') {
        navigate(`gmail-edit?id=${id}`);
      } else if (action === 'delete') {
        handleDelete(id, btn.dataset.email);
      }
    });
  }

  // Load data after render (non-blocking)
  loadCredentials();

  return container;
}
