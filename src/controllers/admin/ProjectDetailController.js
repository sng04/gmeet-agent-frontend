import { loadTemplate } from '../../utils/template.js';
import { Button } from '../../components/ui/Button.js';
import { Modal } from '../../components/ui/Modal.js';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.js';
import { showLoading, hideLoading } from '../../components/ui/Loading.js';
import { navigate } from '../../router.js';
import { projectsApi } from '../../api/projects.js';
import { sessionsApi } from '../../api/sessions.js';
import { botCredentialApi } from '../../api/botCredential.js';
import { usersApi } from '../../api/users.js';
import { kbDocumentsApi } from '../../api/kbDocuments.js';
import { filesApi } from '../../api/files.js';
import { formatDate } from '../../utils/format.js';

// Bot status to UI status mapping
function getUIStatus(botStatus) {
  const statusMap = {
    'none': 'none',
    'pending': 'starting',
    'queued': 'starting',
    'starting': 'starting',
    'joining': 'starting',
    'in_meeting': 'live',
    'running': 'live',
    'stopping': 'stopping',
    'stopped': 'stopping',
    'completed': 'finished',
    'failed': 'failed',
  };
  return statusMap[botStatus] || botStatus;
}

function getStatusBadge(uiStatus) {
  const badges = {
    starting: '<span class="badge b-pri"><span class="dot"></span> Starting</span>',
    live: '<span class="badge b-live"><span class="dot"></span> Live</span>',
    stopping: '<span class="badge b-warn"><span class="dot"></span> Stopping</span>',
    finished: '<span class="badge b-summary"><span class="dot"></span> Finished</span>',
    failed: '<span class="badge b-err"><span class="dot"></span> Failed</span>',
    none: '<span class="badge b-gray"><span class="dot"></span> No Bot</span>',
  };
  return badges[uiStatus] || '<span class="badge b-gray">' + uiStatus + '</span>';
}

function calculateDuration(startTime, endTime = null) {
  if (!startTime) return '—';
  const start = new Date(startTime);
  const end = endTime ? new Date(endTime) : new Date();
  const diffMs = end - start;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return diffMins + ' min';
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  return mins > 0 ? hours + 'h ' + mins + 'm' : hours + 'h';
}

export default async function ProjectDetailController(params) {
  const el = await loadTemplate('/templates/admin/project-detail.html', 'project-detail');
  const projectId = params?.id;

  const pageLoading = el.querySelector('[data-bind="pageLoading"]');
  const pageContent = el.querySelector('[data-bind="pageContent"]');
  const pageError = el.querySelector('[data-bind="pageError"]');

  if (!projectId) {
    pageLoading.style.display = 'none';
    pageError.style.display = 'block';
    pageError.innerHTML = `
      <div class="empty">
        <div class="empty-icon">⚠️</div>
        <div class="empty-title">Project not found</div>
        <div class="empty-desc">No project ID provided</div>
      </div>
    `;
    return el;
  }

  let project = null;
  let credentialEmail = null;
  let assignedUsers = [];
  let allUsers = [];
  let sessions = [];
  let kbDocuments = [];
  let sessionPollInterval = null;

  function startSessionPolling() {
    if (sessionPollInterval) return;
    sessionPollInterval = setInterval(async () => {
      try {
        const res = await sessionsApi.listByProject(projectId);
        const updated = res.data?.items || [];
        updated.sort((a, b) => new Date(b.created_at || b.start_time || 0) - new Date(a.created_at || a.start_time || 0));
        const changed = updated.some((u, i) => {
          const old = sessions[i];
          return !old || u.bot_status !== old.bot_status;
        }) || updated.length !== sessions.length;
        if (changed) {
          sessions = updated;
          renderSessionsTab();
          el.querySelector('[data-bind="statSessions"]').textContent = sessions.length;
        }
      } catch (err) { /* ignore */ }
    }, 5000);
  }

  el._cleanup = () => {
    if (sessionPollInterval) { clearInterval(sessionPollInterval); sessionPollInterval = null; }
  };

  // Breadcrumb nav-back
  el.querySelectorAll('.nav-back').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      navigate(link.dataset.to);
    });
  });

  // Load project data
  async function loadProject() {
    try {
      const res = await projectsApi.get(projectId);
      project = res.data;

      if (project.bot_credential_id) {
        try {
          const credRes = await botCredentialApi.get(project.bot_credential_id);
          credentialEmail = credRes.data?.email;
        } catch (err) {
          console.warn('Failed to fetch credential:', err);
        }
      }

      // Hide loading, show content
      pageLoading.style.display = 'none';
      pageContent.style.display = 'block';

      // Populate data
      populateProjectData();
      setupEventListeners();
      loadUsers();
      loadSessions();
    } catch (err) {
      pageLoading.style.display = 'none';
      pageError.style.display = 'block';
      pageError.innerHTML = `
        <div class="empty">
          <div class="empty-icon">⚠️</div>
          <div class="empty-title">Failed to load project</div>
          <div class="empty-desc">${err.message}</div>
        </div>
      `;
    }
  }

  async function populateProjectData() {
    // Header
    el.querySelector('[data-bind="projectName"]').textContent = project.name || 'Untitled';
    el.querySelector('[data-bind="title"]').textContent = project.name || 'Untitled';
    el.querySelector('[data-bind="description"]').textContent = project.description || 'No description';

    // Stats
    el.querySelector('[data-bind="statAgent"]').textContent = project.agent_name || 'Not assigned';
    el.querySelector('[data-bind="statGmail"]').textContent = credentialEmail || 'Not assigned';
    el.querySelector('[data-bind="statUsers"]').textContent = project.total_users ?? 0;
    el.querySelector('[data-bind="statSessions"]').textContent = project.total_sessions ?? 0;

    // KB
    el.querySelector('[data-bind="kbMeta"]').textContent = 'Loading documents...';
    loadKbDocuments();

    // Edit button
    el.querySelector('[data-bind="actions"]').appendChild(
      Button({ text: 'Edit Project', variant: 's', onClick: () => navigate(`project-edit?id=${projectId}`) })
    );
  }

  async function loadKbDocuments() {
    try {
      const res = await kbDocumentsApi.list(projectId);
      const d = res.data;
      kbDocuments = Array.isArray(d) ? d : (d?.items || d?.documents || (Array.isArray(d?.data) ? d.data : []));
      el.querySelector('[data-bind="kbMeta"]').textContent = kbDocuments.length + ' document' + (kbDocuments.length !== 1 ? 's' : '');
      renderKbDocs();
    } catch (err) {
      console.warn('Failed to load KB documents:', err);
      kbDocuments = [];
      el.querySelector('[data-bind="kbMeta"]').textContent = 'Failed to load';
      renderKbDocs();
    }
  }

  function renderKbDocs() {
    const container = el.querySelector('[data-bind="kbContent"]');

    if (kbDocuments.length === 0) {
      container.innerHTML = '<div class="empty" style="padding:24px"><div class="empty-icon">📚</div><div class="empty-title">No documents yet</div><div class="empty-desc">Upload PDF or Markdown files for the AI agent to reference</div></div>';
      return;
    }

    const getIcon = (name) => {
      if (name?.endsWith('.pdf')) return '📕';
      if (name?.endsWith('.md')) return '📘';
      return '📄';
    };

    const getStatusBadgeKB = (status) => {
      const map = { indexed: 'b-ok', pending: 'b-warn', failed: 'b-err', processing: 'b-pri' };
      return '<span class="badge ' + (map[status] || 'b-gray') + '"><span class="dot"></span> ' + (status || 'unknown') + '</span>';
    };

    container.innerHTML = '<table style="width:100%;border-collapse:collapse"><thead><tr>'
      + '<th style="text-align:left;font-size:11px;font-weight:500;color:var(--gray-500);text-transform:uppercase;letter-spacing:.05em;padding:10px 20px;border-bottom:1px solid var(--gray-100);background:var(--gray-25)">Document</th>'
      + '<th style="text-align:left;font-size:11px;font-weight:500;color:var(--gray-500);text-transform:uppercase;padding:10px 20px;border-bottom:1px solid var(--gray-100);background:var(--gray-25)">Description</th>'
      + '<th style="text-align:left;font-size:11px;font-weight:500;color:var(--gray-500);text-transform:uppercase;padding:10px 20px;border-bottom:1px solid var(--gray-100);background:var(--gray-25)">Status</th>'
      + '<th style="text-align:left;font-size:11px;font-weight:500;color:var(--gray-500);text-transform:uppercase;padding:10px 20px;border-bottom:1px solid var(--gray-100);background:var(--gray-25)">Uploaded</th>'
      + '<th style="padding:10px 20px;border-bottom:1px solid var(--gray-100);background:var(--gray-25)"></th>'
      + '</tr></thead><tbody>'
      + kbDocuments.map((doc, i) => {
          const border = i < kbDocuments.length - 1 ? 'border-bottom:1px solid var(--gray-100)' : '';
          const uploaded = doc.created_at ? formatDate(doc.created_at) : '—';
          return '<tr>'
            + '<td style="padding:12px 20px;' + border + '"><div class="flex items-c gap-3">' + getIcon(doc.file_name) + ' <a href="#" class="text-sm fw-m text-pri" style="text-decoration:none" data-action="kbDownload" data-s3-key="' + (doc.s3_key || '') + '">' + (doc.file_name || '—') + '</a></div></td>'
            + '<td style="padding:12px 20px;font-size:12px;color:var(--gray-500);' + border + '">' + (doc.description || '—') + '</td>'
            + '<td style="padding:12px 20px;' + border + '">' + getStatusBadgeKB(doc.status) + '</td>'
            + '<td style="padding:12px 20px;font-size:12px;' + border + '">' + uploaded + '</td>'
            + '<td style="padding:12px 20px;' + border + '"><button class="btn btn-d btn-sm" data-action="kbDelete" data-doc-id="' + doc.document_id + '">Delete</button></td>'
            + '</tr>';
        }).join('')
      + '</tbody></table>';
  }

  async function handleKbUpload(file) {
    showLoading('Uploading ' + file.name + '...');
    try {
      const res = await kbDocumentsApi.create(projectId, { file_name: file.name, description: '' });
      const uploadUrl = res.data?.upload_url;
      const contentType = res.data?.content_type || 'application/octet-stream';
      if (!uploadUrl) throw new Error('No upload URL returned');

      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': contentType },
        body: file,
      });
      if (!uploadRes.ok) throw new Error('S3 upload failed: ' + uploadRes.status);

      hideLoading();
      await loadKbDocuments();
    } catch (err) {
      hideLoading();
      alert('Failed to upload: ' + err.message);
    }
  }

  function handleKbDelete(docId) {
    const doc = kbDocuments.find(d => d.document_id === docId);
    ConfirmDialog({
      title: 'Delete Document',
      message: 'Are you sure you want to delete "' + (doc?.file_name || 'this document') + '"?',
      warning: 'This will also remove the document from the AI knowledge base.',
      confirmText: 'Delete',
      confirmingText: 'Deleting...',
      loadingMessage: 'Deleting document...',
      onConfirm: () => kbDocumentsApi.delete(projectId, docId),
      onSuccess: () => loadKbDocuments(),
      onError: (err) => alert('Failed to delete: ' + err.message),
    });
  }

  function renderSessionsTab() {
    const sessionsLoading = el.querySelector('[data-bind="sessionsLoading"]');
    const sessionsContent = el.querySelector('[data-bind="sessionsContent"]');
    const sessionsEmpty = el.querySelector('[data-bind="sessionsEmpty"]');

    sessionsLoading.style.display = 'none';

    if (sessions.length === 0) {
      sessionsEmpty.style.display = 'block';
      return;
    }

    sessionsContent.style.display = 'block';
    const tbody = el.querySelector('[data-bind="sessionsBody"]');
    
    tbody.innerHTML = sessions.map(s => {
      const uiStatus = getUIStatus(s.bot_status);
      let duration = '—';
      if (uiStatus === 'live') {
        duration = calculateDuration(s.start_time) + ' (ongoing)';
      } else if ((uiStatus === 'finished' || uiStatus === 'failed' || uiStatus === 'stopping') && s.start_time) {
        duration = calculateDuration(s.start_time, s.end_time);
      }
      const startTimeDisplay = s.start_time ? formatDate(s.start_time, { hour: '2-digit', minute: '2-digit' }) : '—';
      const meetLinkHtml = s.meeting_link 
        ? '<a href="' + s.meeting_link + '" target="_blank" class="text-pri">' + s.meeting_link.replace('https://', '') + '</a>'
        : '—';

      let actionHtml = '';
      if (uiStatus === 'live') {
        actionHtml = '<button class="btn btn-live btn-sm" data-action="viewSession" data-session-id="' + s.session_id + '" data-status="live">Live →</button>';
      } else if (uiStatus === 'finished') {
        actionHtml = '<button class="btn btn-review btn-sm" data-action="viewSession" data-session-id="' + s.session_id + '" data-status="finished">Review</button>';
      }

      return '<tr><td><strong class="text-p">' + (s.name || 'Untitled') + '</strong><div class="text-xs text-t">' + startTimeDisplay + '</div></td><td>' + getStatusBadge(uiStatus) + '</td><td class="mono text-xs">' + meetLinkHtml + '</td><td>—</td><td class="mono text-xs">' + duration + '</td><td><div class="session-action-btns">' + actionHtml + '</div></td></tr>';
    }).join('');

    el.querySelector('[data-bind="sessionsFoot"]').innerHTML = '<span>' + sessions.length + ' session' + (sessions.length !== 1 ? 's' : '') + '</span>';

    // Update live banner
    updateLiveBanner();
  }

  function updateLiveBanner() {
    const liveBanner = el.querySelector('[data-bind="liveBanner"]');
    if (!liveBanner) return;
    
    const liveSession = sessions.find(s => getUIStatus(s.bot_status) === 'live');
    
    if (liveSession) {
      liveBanner.style.display = 'block';
      liveBanner.innerHTML = '<div class="card-body" style="padding:14px 20px"><div class="flex items-c gap-3"><span class="badge b-live" style="font-size:12px;padding:4px 10px"><span class="dot"></span> Live Session</span><div><div class="text-sm fw-sb text-p">' + (liveSession.name || 'Untitled Session') + '</div><div class="text-xs text-t">Started ' + (liveSession.start_time ? calculateDuration(liveSession.start_time) + ' ago' : 'recently') + '</div></div><button class="btn btn-s btn-sm" style="margin-left:auto" data-action="viewLive" data-session-id="' + liveSession.session_id + '">View Live →</button></div></div>';
    } else {
      liveBanner.style.display = 'none';
    }
  }

  async function loadSessions() {
    const sessionsLoading = el.querySelector('[data-bind="sessionsLoading"]');
    const sessionsError = el.querySelector('[data-bind="sessionsError"]');

    try {
      const res = await sessionsApi.listByProject(projectId);
      sessions = res.data?.items || [];
      sessions.sort((a, b) => new Date(b.created_at || b.start_time || 0) - new Date(a.created_at || a.start_time || 0));
      renderSessionsTab();
      startSessionPolling();
      el.querySelector('[data-bind="statSessions"]').textContent = sessions.length;
    } catch (err) {
      sessionsLoading.style.display = 'none';
      sessionsError.style.display = 'block';
      sessionsError.innerHTML = '<div class="empty"><div class="empty-icon">⚠️</div><div class="empty-title">Failed to load sessions</div><div class="empty-desc">' + err.message + '</div></div>';
    }
  }

  function setupEventListeners() {
    // View Live from banner
    el.addEventListener('click', (e) => {
      const viewLiveBtn = e.target.closest('[data-action="viewLive"]');
      if (viewLiveBtn) {
        const sessionId = viewLiveBtn.dataset.sessionId;
        if (sessionId) {
          navigate('live?sessionId=' + sessionId);
        }
      }

      // Session action buttons (Live/Review)
      const sessionBtn = e.target.closest('[data-action="viewSession"]');
      if (sessionBtn) {
        const sessionId = sessionBtn.dataset.sessionId;
        const status = sessionBtn.dataset.status;
        if (status === 'live') {
          navigate('live?sessionId=' + sessionId);
        } else {
          navigate('session/' + sessionId);
        }
      }
    });

    // Tab switching
    el.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        el.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        el.querySelectorAll('.tab-c').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        el.querySelector(`[data-bind="tab${tab.dataset.tab === 'users' ? 'Users' : 'Sessions'}"]`).classList.add('active');
      });
    });

    // KB toggle
    el.querySelector('[data-action="kbToggle"]')?.addEventListener('click', (e) => {
      if (!e.target.closest('.upload-zone') && !e.target.closest('[data-bind="kbFileInput"]')) {
        const content = el.querySelector('[data-bind="kbContent"]');
        const toggleText = el.querySelector('[data-bind="kbToggleText"]');
        const isHidden = content.style.display === 'none';
        content.style.display = isHidden ? '' : 'none';
        toggleText.textContent = isHidden ? '▲ collapse' : '▼ expand';
      }
    });

    // KB upload
    el.querySelector('[data-action="kbUploadClick"]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      el.querySelector('[data-bind="kbFileInput"]')?.click();
    });
    el.querySelector('[data-bind="kbFileInput"]')?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        handleKbUpload(file);
        e.target.value = '';
      }
    });

    // KB download and delete (delegated)
    el.addEventListener('click', async (e) => {
      const downloadLink = e.target.closest('[data-action="kbDownload"]');
      if (downloadLink) {
        e.preventDefault();
        const s3Key = downloadLink.dataset.s3Key;
        if (!s3Key) return;
        try {
          const res = await filesApi.getDownloadUrl(s3Key);
          const url = res.data?.download_url;
          if (url) window.open(url, '_blank');
        } catch (err) { alert('Failed to get download link: ' + err.message); }
        return;
      }
      const deleteBtn = e.target.closest('[data-action="kbDelete"]');
      if (deleteBtn) {
        handleKbDelete(deleteBtn.dataset.docId);
      }
    });
  }

  async function loadUsers() {
    try {
      const res = await projectsApi.getUsers(projectId);
      assignedUsers = res.data?.users || [];
      renderUsersTab();
      el.querySelector('[data-bind="statUsers"]').textContent = assignedUsers.length;
    } catch (err) {
      assignedUsers = [];
      renderUsersTab();
    }
  }

  function renderUsersTab() {
    const container = el.querySelector('[data-bind="tabUsers"]');
    
    if (assignedUsers.length === 0) {
      container.innerHTML = `
        <div class="flex jc-end mb-4">
          <button class="btn btn-p btn-sm" data-action="assignUser">+ Assign User</button>
        </div>
        <div class="empty">
          <div class="empty-icon">👥</div>
          <div class="empty-title">No users assigned</div>
          <div class="empty-desc">Assign users to this project to get started</div>
        </div>
      `;
    } else {
      container.innerHTML = `
        <div class="flex jc-end mb-4">
          <button class="btn btn-p btn-sm" data-action="assignUser">+ Assign User</button>
        </div>
        <div class="tbl-wrap">
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Added</th><th></th></tr></thead>
            <tbody>
              ${assignedUsers.map(u => `
                <tr>
                  <td><strong>${u.username || u.email}</strong></td>
                  <td class="mono text-sm">${u.email}</td>
                  <td><span class="badge b-gray">${u.role || 'user'}</span></td>
                  <td class="text-xs">${u.assigned_at ? new Date(u.assigned_at).toLocaleDateString() : '—'}</td>
                  <td><button class="btn btn-d btn-sm" data-action="removeUser" data-id="${u.project_user_id}">Remove</button></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="tbl-foot"><span>${assignedUsers.length} user${assignedUsers.length !== 1 ? 's' : ''} assigned</span></div>
        </div>
      `;
    }

    container.querySelector('[data-action="assignUser"]')?.addEventListener('click', openAssignUserModal);
    container.querySelectorAll('[data-action="removeUser"]').forEach(btn => {
      btn.addEventListener('click', () => handleRemoveUser(btn.dataset.id));
    });
  }

  async function openAssignUserModal() {
    showLoading('Loading users...');
    try {
      const res = await usersApi.list();
      allUsers = res.data?.items || res.data?.users || res.data || [];
      if (!Array.isArray(allUsers)) allUsers = [];
    } catch (err) {
      hideLoading();
      alert('Failed to load users: ' + err.message);
      return;
    }
    hideLoading();

    if (allUsers.length === 0) {
      alert('No users found. Please create users first.');
      return;
    }

    const assignedIds = new Set(assignedUsers.map(u => u.user_id));
    const available = allUsers.filter(u => !assignedIds.has(u.user_id));

    if (available.length === 0) {
      alert('All users are already assigned');
      return;
    }

    const bodyEl = document.createElement('div');
    bodyEl.innerHTML = `
      <div class="form-g">
        <label class="form-l">Select User <span class="req">*</span></label>
        <select class="form-sel" id="assignUserSelect">
          <option value="">Choose a user...</option>
          ${available.map(u => `<option value="${u.user_id}">${u.username || u.email} (${u.email})</option>`).join('')}
        </select>
      </div>
      <div id="assignUserError" class="text-sm" style="color:var(--err-500);margin-top:8px;display:none"></div>
    `;

    const footerEl = document.createElement('div');
    footerEl.className = 'flex gap-3 jc-end';
    const cancelBtn = Button({ text: 'Cancel', variant: 's', onClick: () => modal.close() });
    const assignBtn = Button({ text: 'Assign User', variant: 'p', onClick: handleAssign });
    footerEl.appendChild(cancelBtn);
    footerEl.appendChild(assignBtn);

    const modal = Modal({ title: 'Assign User to Project', body: bodyEl, footer: footerEl });

    async function handleAssign() {
      const userId = bodyEl.querySelector('#assignUserSelect').value;
      const errorEl = bodyEl.querySelector('#assignUserError');
      if (!userId) {
        errorEl.textContent = 'Please select a user';
        errorEl.style.display = 'block';
        return;
      }
      modal.close();
      showLoading('Assigning user...');
      try {
        await projectsApi.assignUser({ project_id: projectId, user_id: userId });
        hideLoading();
        loadUsers();
      } catch (err) {
        hideLoading();
        alert('Failed to assign user: ' + err.message);
      }
    }
  }

  function handleRemoveUser(projectUserId) {
    const user = assignedUsers.find(u => u.project_user_id === projectUserId);
    ConfirmDialog({
      title: 'Remove User',
      message: `Are you sure you want to remove <strong>${user?.username || user?.email || 'this user'}</strong> from this project?`,
      confirmText: 'Remove',
      confirmingText: 'Removing...',
      loadingMessage: 'Removing user...',
      onConfirm: () => projectsApi.removeUser(projectUserId),
      onSuccess: loadUsers
    });
  }

  loadProject();
  return el;
}
