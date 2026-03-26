import { loadTemplate } from '../../utils/template.js';
import { navigate } from '../../router.js';
import { sessionsApi } from '../../api/sessions.js';
import { projectsApi } from '../../api/projects.js';
import { formatDate } from '../../utils/format.js';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.js';

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

function calculateDuration(startTime) {
  if (!startTime) return '—';
  const start = new Date(startTime);
  const now = new Date();
  const diffMs = now - start;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return diffMins + ' min';
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  return mins > 0 ? hours + 'h ' + mins + 'm' : hours + 'h';
}

// Mock Q&A and transcript data (will be replaced with real API later)
const mockQA = [
  {
    question: 'Can we integrate this with our existing Slack workspace?',
    hostAnswer: "That's a great question, let me share what our team has prepared — currently Slack isn't in scope but we're exploring webhooks.",
    aiAnswer: 'Currently, the system focuses on Google Meet integration. Slack integration is not in the current scope, but the architecture supports future webhook-based integrations.',
    time: '10:31:05',
    author: 'Client'
  },
];

const mockTranscript = [
  { time: '10:30:15', author: 'Host', text: 'Welcome everyone, thanks for joining. Let\'s get started.' },
  { time: '10:31:05', author: 'Client', text: 'Can we integrate this with our existing Slack workspace?', isQuestion: true },
];

export default async function LiveSessionController(params) {
  const el = await loadTemplate('/templates/user/live-session.html', 'live-session');

  // Get sessionId from URL query params
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get('sessionId');

  const pageLoading = el.querySelector('[data-bind="pageLoading"]');
  const pageContent = el.querySelector('[data-bind="pageContent"]');
  const pageError = el.querySelector('[data-bind="pageError"]');

  if (!sessionId) {
    pageLoading.style.display = 'none';
    pageError.style.display = 'block';
    pageError.innerHTML = '<div class="empty"><div class="empty-icon">⚠️</div><div class="empty-title">Session not found</div><div class="empty-desc">No session ID provided</div></div>';
    return el;
  }

  let session = null;
  let project = null;
  let durationInterval = null;

  async function loadSession() {
    try {
      // Load session data
      const sessionRes = await sessionsApi.get(sessionId);
      session = sessionRes.data;

      // Load project data
      if (session.project_id) {
        try {
          const projectRes = await projectsApi.get(session.project_id);
          project = projectRes.data;
        } catch (err) {
          console.warn('Failed to load project:', err);
        }
      }

      pageLoading.style.display = 'none';
      pageContent.style.display = 'block';

      populateSessionData();
      setupEventListeners();
      startDurationTimer();
    } catch (err) {
      pageLoading.style.display = 'none';
      pageError.style.display = 'block';
      pageError.innerHTML = '<div class="empty"><div class="empty-icon">⚠️</div><div class="empty-title">Failed to load session</div><div class="empty-desc">' + err.message + '</div></div>';
    }
  }

  function populateSessionData() {
    const projectName = project?.name || session.project_name || 'Unknown Project';
    const uiStatus = getUIStatus(session.bot_status);
    const isLive = uiStatus === 'live';

    // Header
    el.querySelector('[data-bind="sessionName"]').textContent = session.name || 'Untitled Session';
    el.querySelector('[data-bind="projectName"]').textContent = projectName;
    el.querySelector('[data-bind="backLink"]').textContent = projectName;

    // Meta info
    el.querySelector('[data-bind="metaProject"]').textContent = projectName;
    el.querySelector('[data-bind="metaQA"]').textContent = '—';
    el.querySelector('[data-bind="metaStarted"]').textContent = session.start_time 
      ? formatDate(session.start_time, { hour: '2-digit', minute: '2-digit' }) 
      : '—';
    
    // Meet link
    const meetLinkEl = el.querySelector('[data-bind="metaMeetLink"]');
    if (session.meeting_link) {
      meetLinkEl.href = session.meeting_link;
      meetLinkEl.textContent = session.meeting_link.replace('https://', '');
    } else {
      meetLinkEl.textContent = '—';
      meetLinkEl.removeAttribute('href');
    }
    
    // Duration with ongoing indicator for live
    updateDuration();

    // Status badge
    el.querySelector('[data-bind="statusBadge"]').innerHTML = getStatusBadge(uiStatus);

    // Show/hide live controls based on status
    const connStatus = el.querySelector('#conn-status');
    const endBtn = el.querySelector('#btn-end-session');
    const modeToggle = el.querySelector('#session-mode-toggle');
    
    if (!isLive) {
      connStatus.style.display = 'none';
      endBtn.style.display = 'none';
      // If not live, default to retro mode
      el.querySelector('.mode-btn[data-mode="retro"]').click();
    }

    // Render Q&A and transcript (mock for now)
    renderQAList();
    renderTranscript();
  }

  function updateDuration() {
    const uiStatus = getUIStatus(session.bot_status);
    const isLive = uiStatus === 'live';
    const duration = calculateDuration(session.start_time);
    const durationText = isLive ? duration + ' (ongoing)' : duration;
    el.querySelector('[data-bind="metaDuration"]').textContent = session.start_time ? durationText : '—';
  }

  function startDurationTimer() {
    const uiStatus = getUIStatus(session.bot_status);
    if (uiStatus === 'live') {
      durationInterval = setInterval(updateDuration, 60000); // Update every minute
    }
  }

  function renderQAList() {
    const renderQAItem = (qa) => '<div class="qa"><div class="flex jc-b items-s mb-4"><div class="text-xs text-t mono">' + qa.time + '</div></div><div class="qa-q"><div class="qi">Q</div><div class="qa-txt q"><span class="qna-author client" style="font-size:10px;margin-right:6px">' + qa.author + '</span>' + qa.question + '</div></div><div class="qa-a mt-2"><div class="ai">A</div><div class="qa-txt">' + qa.hostAnswer + '</div></div><div class="qa-a mt-2"><div class="ai" style="background:var(--gray-100);color:var(--gray-600)">AI</div><div class="qa-txt" style="color:var(--gray-500)">' + qa.aiAnswer + '</div></div></div>';

    const qaHtml = mockQA.length > 0 
      ? mockQA.map(renderQAItem).join('') 
      : '<div class="empty"><div class="empty-icon">💬</div><div class="empty-title">No Q&A pairs yet</div><div class="empty-desc">Questions will appear here as they are detected</div></div>';

    el.querySelector('[data-bind="liveQaList"]').innerHTML = qaHtml;
    el.querySelector('[data-bind="retroQaList"]').innerHTML = qaHtml;
  }

  function renderTranscript() {
    const renderTranscriptItem = (item) => '<div class="tscript-item' + (item.isQuestion ? ' question' : '') + '"><div class="ts-author">' + item.author + '</div><div class="ts">' + item.time + '</div>' + item.text + (item.isQuestion ? '<div class="text-xs fw-m mt-1" style="color:var(--warn-600)">⚡ Question detected</div>' : '') + '</div>';

    const transcriptHtml = mockTranscript.length > 0
      ? mockTranscript.map(renderTranscriptItem).join('')
      : '<div class="text-sm text-t">No transcript available yet</div>';

    el.querySelector('[data-bind="liveTranscript"]').innerHTML = transcriptHtml;
    el.querySelector('[data-bind="retroTranscript"]').innerHTML = transcriptHtml;
    el.querySelector('[data-bind="retroTranscriptCount"]').textContent = mockTranscript.length;
  }

  function setupEventListeners() {
    // Breadcrumb back - navigate to project detail
    el.querySelector('[data-action="backNav"]').addEventListener('click', (e) => {
      e.preventDefault();
      if (session?.project_id) {
        navigate('project/' + session.project_id);
      } else {
        navigate('');
      }
    });

    // Session mode toggle (Live/Retro)
    el.querySelectorAll('#session-mode-toggle .mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        el.querySelectorAll('#session-mode-toggle .mode-btn').forEach(b => b.classList.remove('active'));
        el.querySelectorAll('.mode-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        el.querySelector('#mode-' + btn.dataset.mode).classList.add('active');

        // Update connection status visibility
        const connStatus = el.querySelector('#conn-status');
        const endBtn = el.querySelector('#btn-end-session');
        if (btn.dataset.mode === 'retro') {
          connStatus.style.display = 'none';
          endBtn.style.display = 'none';
        } else {
          const uiStatus = getUIStatus(session.bot_status);
          if (uiStatus === 'live') {
            connStatus.style.display = '';
            endBtn.style.display = '';
          }
        }
      });
    });

    // Tab switching within modes
    el.querySelectorAll('.tabs .tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const tabsContainer = tab.parentElement;
        const contentContainer = tabsContainer.closest('.mode-panel') || tabsContainer.parentElement;
        tabsContainer.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        contentContainer.querySelectorAll('.tab-c').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        contentContainer.querySelector('#tab-' + tab.dataset.tab).classList.add('active');
      });
    });

    // End session button
    const endBtn = el.querySelector('#btn-end-session');
    endBtn.addEventListener('click', () => {
      ConfirmDialog({
        title: 'End Session',
        message: 'Are you sure you want to end this session? The bot will leave the meeting and stop recording.',
        warning: 'You can still review the session data after ending.',
        confirmText: 'End Session',
        confirmingText: 'Ending...',
        loadingMessage: 'Ending session...',
        onConfirm: async () => {
          await sessionsApi.stopBot(sessionId);
          
          // Clear interval
          if (durationInterval) {
            clearInterval(durationInterval);
          }
        },
        onSuccess: () => {
          // Redirect to project detail
          const projectId = session?.project_id;
          if (projectId) {
            navigate('project/' + projectId);
          } else {
            navigate('');
          }
        },
        onError: (err) => {
          alert('Failed to end session: ' + err.message);
        }
      });
    });

    // Chat functionality
    const chatInput = el.querySelector('[data-bind="chatInput"]');
    const chatMsgs = el.querySelector('[data-bind="chatMsgs"]');

    const sendChat = () => {
      if (!chatInput.value.trim()) return;
      chatMsgs.innerHTML += '<div class="chat-msg user">' + chatInput.value + '</div>';
      const q = chatInput.value;
      chatInput.value = '';
      setTimeout(() => {
        chatMsgs.innerHTML += '<div class="chat-msg ai"><div class="chat-label">MeetAgent AI</div>Based on the session data for: ' + q.toLowerCase() + ' — I\'m analyzing the session content...</div>';
        chatMsgs.scrollTop = chatMsgs.scrollHeight;
      }, 700);
    };

    el.querySelector('[data-action="chatSend"]').addEventListener('click', sendChat);
    chatInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendChat(); });

    // Suggested chips
    el.querySelectorAll('.ai-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const text = chip.textContent;
        chatMsgs.innerHTML += '<div class="chat-msg user">' + text + '</div>';
        setTimeout(() => {
          chatMsgs.innerHTML += '<div class="chat-msg ai"><div class="chat-label">MeetAgent AI</div>Analyzing session data for: ' + text + '...</div>';
          chatMsgs.scrollTop = chatMsgs.scrollHeight;
        }, 600);
      });
    });
  }

  // Cleanup function
  el._cleanup = () => {
    if (durationInterval) {
      clearInterval(durationInterval);
    }
  };

  loadSession();
  return el;
}
