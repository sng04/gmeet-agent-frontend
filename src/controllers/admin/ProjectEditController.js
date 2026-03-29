import { loadTemplate } from '../../utils/template.js';
import { navigate } from '../../router.js';
import { Button } from '../../components/ui/Button.js';
import { Alert } from '../../components/ui/Alert.js';
import { showLoading, hideLoading } from '../../components/ui/Loading.js';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.js';
import { projectsApi } from '../../api/projects.js';
import { botCredentialApi } from '../../api/botCredential.js';

export default async function ProjectEditController() {
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('id');

  const el = await loadTemplate('/templates/admin/project-edit.html', 'project-edit');
  const alertContainer = el.querySelector('[data-bind="alertContainer"]');
  const pageLoading = el.querySelector('[data-bind="pageLoading"]');
  const pageContent = el.querySelector('[data-bind="pageContent"]');
  const pageError = el.querySelector('[data-bind="pageError"]');
  const deleteAlert = el.querySelector('[data-bind="deleteAlert"]');
  const deleteActions = el.querySelector('[data-bind="deleteActions"]');

  if (!projectId) {
    pageLoading.style.display = 'none';
    pageError.style.display = 'block';
    pageError.innerHTML = `
      <div class="empty">
        <div class="empty-icon">⚠️</div>
        <div class="empty-title">No project ID provided</div>
      </div>
    `;
    return el;
  }

  let project = null;

  // Nav back handlers
  el.querySelectorAll('[data-action="navBack"]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const to = link.dataset.to;
      if (to === 'project-detail') {
        navigate(`projects/${projectId}`);
      } else {
        navigate(to);
      }
    });
  });

  async function loadProject() {
    try {
      // Load project
      const res = await projectsApi.get(projectId);
      project = res.data;

      // Update breadcrumb
      el.querySelector('[data-bind="projectLink"]').textContent = project.name || 'Project';

      // Populate form
      el.querySelector('[name="name"]').value = project.name || '';
      el.querySelector('[name="description"]').value = project.description || '';

      // Populate agent select (mock)
      const agentSelect = el.querySelector('[data-bind="agentSelect"]');
      const mockAgents = [
        { value: 'agent-1', label: 'TechSales Bot' },
        { value: 'agent-2', label: 'Demo Agent' },
        { value: 'agent-3', label: 'Support Agent' },
      ];
      mockAgents.forEach(a => {
        const opt = document.createElement('option');
        opt.value = a.value;
        opt.textContent = a.label;
        agentSelect.appendChild(opt);
      });
      if (project.agent_id) agentSelect.value = project.agent_id;

      // Load gmail credentials
      const gmailSelect = el.querySelector('[data-bind="gmailSelect"]');
      try {
        const credRes = await botCredentialApi.list();
        const credentials = credRes.data?.items || [];
        credentials
          .filter(c => c.verification_status === 'verified' && c.available_status === 'active')
          .forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.credential_id;
            opt.textContent = c.email;
            gmailSelect.appendChild(opt);
          });
        if (project.bot_credential_id) gmailSelect.value = project.bot_credential_id;
      } catch (err) {
        console.error('Failed to load credentials:', err);
      }

      // Hide loading, show content
      pageLoading.style.display = 'none';
      pageContent.style.display = 'block';

      // Setup form actions
      const actions = el.querySelector('[data-bind="formActions"]');
      actions.appendChild(Button({ text: 'Cancel', variant: 's', onClick: () => navigate(`projects/${projectId}`) }));
      actions.appendChild(Button({ text: 'Save Changes', variant: 'p', onClick: handleSubmit }));

      // Setup danger zone
      deleteActions.appendChild(Button({
        text: 'Delete Project',
        variant: 'd',
        onClick: () => handleDelete(project.name)
      }));

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

  async function handleSubmit() {
    alertContainer.innerHTML = '';

    const name = el.querySelector('[name="name"]').value.trim();
    const description = el.querySelector('[name="description"]').value.trim();
    const agent_id = el.querySelector('[name="agent_id"]').value;
    const bot_credential_id = el.querySelector('[name="bot_credential_id"]').value;

    if (!name) {
      alertContainer.appendChild(Alert({ message: 'Project name is required', variant: 'err' }));
      return;
    }
    if (!bot_credential_id) {
      alertContainer.appendChild(Alert({ message: 'Gmail Credential is required', variant: 'err' }));
      return;
    }

    const payload = { name, bot_credential_id };
    if (description) payload.description = description;
    if (agent_id) payload.agent_id = agent_id;

    showLoading('Saving changes...');
    try {
      await projectsApi.update(projectId, payload);
      hideLoading();
      navigate(`projects/${projectId}`);
    } catch (err) {
      hideLoading();
      alertContainer.appendChild(Alert({ message: err.message || 'Failed to update project', variant: 'err' }));
    }
  }

  function handleDelete(projectName) {
    deleteAlert.innerHTML = '';
    ConfirmDialog({
      title: 'Delete Project',
      message: `Are you sure you want to delete "<strong>${projectName}</strong>"? This will permanently delete all sessions, transcripts, and user assignments.`,
      confirmText: 'Delete Project',
      confirmingText: 'Deleting...',
      loadingMessage: 'Deleting project...',
      onConfirm: () => projectsApi.delete(projectId),
      onSuccess: () => navigate('projects'),
      onError: (err) => {
        if (err.status === 409) {
          deleteAlert.innerHTML = '';
          deleteAlert.appendChild(Alert({
            message: 'Cannot delete project while a meeting is in progress. Please end all active meetings first.',
            variant: 'warn'
          }));
        } else if (err.status === 404) {
          deleteAlert.innerHTML = '';
          deleteAlert.appendChild(Alert({ message: 'Project not found', variant: 'err' }));
        } else {
          deleteAlert.innerHTML = '';
          deleteAlert.appendChild(Alert({ message: err.message || 'Failed to delete project', variant: 'err' }));
        }
      }
    });
  }

  loadProject();
  return el;
}
