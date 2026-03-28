import { loadTemplate } from '../../utils/template.js';
import { Button } from '../../components/ui/Button.js';
import { Alert } from '../../components/ui/Alert.js';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.js';
import { getVerificationBadge, getContainerStatusBadge } from '../../components/ui/Badge.js';
import { navigate } from '../../router.js';
import { botCredentialApi } from '../../api/botCredential.js';
import { botPoolApi } from '../../api/botPool.js';

export default async function GmailCredentialsController(params) {
  const el = await loadTemplate('/templates/admin/gmail-credentials.html', 'gmail-credentials');

  el.querySelector('[data-bind="actions"]').appendChild(
    Button({ text: '+ Add Credential', variant: 'p', onClick: () => navigate('gmail-create') })
  );

  // Security alert
  el.querySelector('[data-bind="alertContainer"]').appendChild(
    Alert({
      message: 'Gmail passwords are encrypted at rest using AWS KMS and are <strong>never displayed in plain text</strong>. Credentials are only decrypted in memory when authenticating.',
      variant: 'warn',
      icon: '🔒'
    })
  );

  let credentials = [];
  let pollingIntervals = new Map();
  let refreshInterval = null;

  // Cleanup polling on page leave
  function cleanup() {
    pollingIntervals.forEach(intervalId => clearInterval(intervalId));
    pollingIntervals.clear();
    if (refreshInterval) { clearInterval(refreshInterval); refreshInterval = null; }
  }

  // Store cleanup function for router to call
  el._cleanup = cleanup;

  // Auto-refresh credentials list every 5s to pick up status changes
  function startAutoRefresh() {
    if (refreshInterval) return;
    refreshInterval = setInterval(async () => {
      try {
        const response = await botCredentialApi.list();
        const updated = response.data?.items || [];
        // Only re-render if something changed
        const changed = updated.some((u, i) => {
          const old = credentials[i];
          if (!old) return true;
          return u.verification_status !== old.verification_status
            || u.available_status !== old.available_status
            || JSON.stringify(u.warm_pool_status) !== JSON.stringify(old.warm_pool_status);
        }) || updated.length !== credentials.length;
        if (changed) {
          credentials = updated;
          renderCredentials();
        }
      } catch (err) {
        // Silently ignore refresh errors
      }
    }, 5000);
  }

  async function loadCredentials() {
    const tableContainer = el.querySelector('[data-bind="credentialsList"]');

    try {
      const response = await botCredentialApi.list();
      credentials = response.data?.items || [];
      renderCredentials();
      startPollingForValidating();
      startAutoRefresh();
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

  // Poll verification status for validating credentials
  function startPollingForValidating() {
    // Clear existing polls
    pollingIntervals.forEach(intervalId => clearInterval(intervalId));
    pollingIntervals.clear();

    credentials.forEach(cred => {
      if (cred.verification_status === 'validating') {
        pollCredential(cred.credential_id);
      }
    });
  }

  async function pollCredential(credentialId) {
    const poll = async () => {
      try {
        const response = await botCredentialApi.checkVerification(credentialId);
        const status = response.data?.verification_status;

        if (status !== 'validating') {
          // Status changed, stop polling and reload
          clearInterval(pollingIntervals.get(credentialId));
          pollingIntervals.delete(credentialId);

          // If verified, auto-start warm pool
          if (status === 'verified') {
            const cred = credentials.find(c => c.credential_id === credentialId);
            if (cred && cred.warm_pool_size > 0) {
              try {
                await botPoolApi.start({ credential_ids: [credentialId] });
              } catch (poolErr) {
                console.warn('Failed to start warm pool:', poolErr);
              }
            }
          }

          // Reload list to show updated status
          loadCredentials();
        }
      } catch (err) {
        console.warn('Poll error:', err);
      }
    };

    // Poll immediately then every 2 seconds
    poll();
    const intervalId = setInterval(poll, 2000);
    pollingIntervals.set(credentialId, intervalId);
  }

  function handleDelete(credentialId, email) {
    ConfirmDialog({
      title: 'Delete Credential',
      message: `Are you sure you want to remove credential <strong>${email}</strong>?`,
      loadingMessage: 'Removing credential...',
      onConfirm: () => botCredentialApi.delete(credentialId),
      onSuccess: loadCredentials
    });
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

  function getStatusText(cred) {
    if (cred.verification_status === 'validating') {
      return '<span style="color:var(--info-600)">Pending</span>';
    }
    if (cred.available_status === 'active') {
      return '<span style="color:var(--ok-600)">Active</span>';
    }
    return '<span style="color:var(--gray-500)">Inactive</span>';
  }

  function getPoolStatusText(cred) {
    // Only show pool status for verified credentials
    if (cred.verification_status !== 'verified') {
      return '—';
    }
    const pool = cred.warm_pool_status;
    if (!pool) return '—';
    return `<span style="color:var(--ok-500)">${pool.idle || 0} idle</span> / <span style="color:var(--warn-500)">${pool.busy || 0} busy</span>`;
  }

  function renderCredentials() {
    const tableContainer = el.querySelector('[data-bind="credentialsList"]');

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
            <th>Pool Size</th>
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
      const isVerified = cred.verification_status === 'verified';
      const isFailed = cred.verification_status === 'verification_failed';

      tr.innerHTML = `
        <td>
          <button class="btn btn-g btn-sm expand-btn" data-id="${cred.credential_id}" style="padding:4px 8px" ${!isVerified ? 'disabled style="opacity:0.3;cursor:not-allowed"' : ''}>
            <span class="expand-icon">▶</span>
          </button>
        </td>
        <td>
          <span class="mono text-sm">${cred.email}</span>
          ${isFailed && cred.verification_error ? `<div class="text-xs" style="color:var(--err-500);margin-top:2px">${cred.verification_error}</div>` : ''}
        </td>
        <td>${getVerificationBadge(cred.verification_status)}</td>
        <td>${getStatusText(cred)}</td>
        <td>${cred.warm_pool_size || 0}</td>
        <td>
          <div class="flex gap-2 jc-end">
            <button class="btn btn-s btn-sm" data-action="edit" data-id="${cred.credential_id}">${isFailed ? 'Retry' : 'Edit'}</button>
            <button class="btn btn-d btn-sm" data-action="delete" data-id="${cred.credential_id}" data-email="${cred.email}">Remove</button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);

      // Expandable row for pool (only for verified)
      if (isVerified) {
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
      }
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

  return el;
}
