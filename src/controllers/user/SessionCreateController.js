import { loadTemplate } from '../../utils/template.js';
import { Button } from '../../components/ui/Button.js';
import { Alert } from '../../components/ui/Alert.js';
import { showLoading, hideLoading } from '../../components/ui/Loading.js';
import { navigate } from '../../router.js';
import { projectsApi } from '../../api/projects.js';
import { sessionsApi } from '../../api/sessions.js';

export default async function SessionCreateController(params) {
  const el = await loadTemplate('/templates/user/session-create.html', 'session-create');

  // Get projectId from URL query params
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('projectId');

  const pageLoading = el.querySelector('[data-bind="pageLoading"]');
  const pageContent = el.querySelector('[data-bind="pageContent"]');
  const pageError = el.querySelector('[data-bind="pageError"]');
  const alertContainer = el.querySelector('[data-bind="alertContainer"]');

  if (!projectId) {
    pageLoading.style.display = 'none';
    pageError.style.display = 'block';
    pageError.innerHTML = `
      <div class="empty">
        <div class="empty-icon">⚠️</div>
        <div class="empty-title">Project not specified</div>
        <div class="empty-desc">Please select a project first to create a session</div>
      </div>
    `;
    return el;
  }

  let project = null;

  async function loadProject() {
    try {
      const res = await projectsApi.get(projectId);
      project = res.data;

      pageLoading.style.display = 'none';
      pageContent.style.display = 'block';

      populateProjectData();
      setupEventListeners();
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

  function populateProjectData() {
    el.querySelector('[data-bind="projectName"]').textContent = project.name || 'Untitled';
    el.querySelector('[data-bind="backLink"]').textContent = project.name || 'Project';
  }

  function setupEventListeners() {
    // Back navigation
    el.querySelector('[data-action="backNav"]').addEventListener('click', (e) => {
      e.preventDefault();
      navigate(`project/${projectId}`);
    });

    // Form action buttons
    const actions = el.querySelector('[data-bind="formActions"]');
    
    const submitBtn = Button({ 
      text: 'Start Session →', 
      variant: 'p', 
      size: 'lg', 
      onClick: handleSubmit 
    });
    const cancelBtn = Button({ 
      text: 'Cancel', 
      variant: 's', 
      size: 'lg', 
      onClick: () => navigate(`project/${projectId}`) 
    });
    
    actions.appendChild(submitBtn);
    actions.appendChild(cancelBtn);
  }

  async function handleSubmit() {
    // Clear previous alerts
    alertContainer.innerHTML = '';

    const name = el.querySelector('[name="name"]').value.trim();
    let meeting_link = el.querySelector('[name="meeting_link"]').value.trim();
    const description = el.querySelector('[name="description"]').value.trim();
    const style = el.querySelector('[name="style"]').value;

    // Validation
    if (!name) {
      alertContainer.appendChild(Alert({ message: 'Session name is required', variant: 'error' }));
      return;
    }

    if (!meeting_link) {
      alertContainer.appendChild(Alert({ message: 'Google Meet link is required', variant: 'error' }));
      return;
    }

    // Validate and normalize meeting link format
    // Accept: https://meet.google.com/xxx-xxxx-xxx, meet.google.com/xxx-xxxx-xxx, xxx-xxxx-xxx
    const meetCodeRegex = /^[a-z]{3}-[a-z]{4}-[a-z]{3}$/i;
    const fullUrlRegex = /^(https?:\/\/)?meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/i;
    
    if (meetCodeRegex.test(meeting_link)) {
      // User entered just the code (xxx-xxxx-xxx), add full URL
      meeting_link = 'https://meet.google.com/' + meeting_link;
    } else if (meeting_link.startsWith('meet.google.com/')) {
      // User entered without https://
      meeting_link = 'https://' + meeting_link;
    } else if (!fullUrlRegex.test(meeting_link)) {
      alertContainer.appendChild(Alert({ 
        message: 'Invalid Google Meet link format. Use: https://meet.google.com/xxx-xxxx-xxx or just the code (xxx-xxxx-xxx)', 
        variant: 'error' 
      }));
      return;
    }

    if (!style) {
      alertContainer.appendChild(Alert({ message: 'Please select an assistant style', variant: 'error' }));
      return;
    }

    // Build payload
    const payload = {
      project_id: projectId,
      name,
      meeting_link,
      style,
    };
    if (description) payload.description = description;

    showLoading('Creating session...');

    try {
      const res = await sessionsApi.create(payload);
      const session = res.data;
      hideLoading();

      // Bot should be starting, navigate to live view
      navigate(`live?sessionId=${session.session_id}`);
    } catch (err) {
      hideLoading();
      
      // Handle specific bot credential errors
      let errorMessage = err.message || 'Failed to create session';
      if (err.message?.includes('bot credential')) {
        errorMessage = 'Cannot start bot: ' + err.message + '. Please contact your admin.';
      }
      
      alertContainer.appendChild(Alert({ message: errorMessage, variant: 'error' }));
    }
  }

  loadProject();
  return el;
}
