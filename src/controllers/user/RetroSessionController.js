import { loadTemplate } from '../../utils/template.js';
import { navigate } from '../../router.js';
import { sessionsApi } from '../../api/sessions.js';
import { projectsApi } from '../../api/projects.js';
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

function calculateDuration(startTime, endTime) {
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

// Mock Q&A and transcript data
const mockQA = [
  {
    question: 'What kind of encryption do you use for data at rest?',
    hostAnswer: 'We use AES-256 via AWS KMS, keys rotated annually.',
    aiAnswer: 'We use AES-256 encryption for all data at rest, managed through AWS KMS.',
    confidence: 92,
    time: '09:05:32',
    author: 'Client'
  },
];

const mockTranscript = [
  { time: '09:00:15', author: 'Host', text: 'Welcome everyone, thanks for joining.' },
  { time: '09:05:32', author: 'Client', text: 'What kind of encryption do you use?', isQuestion: true },
];

export default async function RetroSessionController(params) {
  const el = await loadTemplate('/templates/user/retro-session.html', 'retro-session');

  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get('sessionId') || params?.id;

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

  async function loadSession() {
    try {
      const sessionRes = await sessionsApi.get(sessionId);
      session = sessionRes.data;

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
    } catch (err) {
      pageLoading.style.display = 'none';
      pageError.style.display = 'block';
      pageError.innerHTML = '<div class="empty"><div class="empty-icon">⚠️</div><div class="empty-title">Failed to load session</div><div class="empty-desc">' + err.message + '</div></div>';
    }
  }

  function populateSessionData() {
    const projectName = project?.name || session.project_name || 'Unknown Project';
    const uiStatus = getUIStatus(session.bot_status);

    el.querySelector('[data-bind="sessionName"]').textContent = session.name || 'Untitled Session';
    el.querySelector('[data-bind="projectName"]').textContent = projectName;
    el.querySelector('[data-bind="backLink"]').textContent = projectName;

    el.querySelector('[data-bind="metaProject"]').textContent = projectName;
    el.querySelector('[data-bind="metaQA"]').textContent = '—';
    el.querySelector('[data-bind="metaStarted"]').textContent = session.start_time 
      ? formatDate(session.start_time, { hour: '2-digit', minute: '2-digit' }) 
      : '—';
    el.querySelector('[data-bind="metaEnded"]').textContent = session.end_time 
      ? formatDate(session.end_time, { hour: '2-digit', minute: '2-digit' }) 
      : '—';
    
    const meetLinkEl = el.querySelector('[data-bind="metaMeetLink"]');
    if (session.meeting_link) {
      meetLinkEl.href = session.meeting_link;
      meetLinkEl.textContent = session.meeting_link.replace('https://', '');
    } else {
      meetLinkEl.textContent = '—';
      meetLinkEl.removeAttribute('href');
    }
    
    const duration = calculateDuration(session.start_time, session.end_time);
    el.querySelector('[data-bind="metaDuration"]').textContent = session.start_time ? duration : '—';
    el.querySelector('[data-bind="metaScore"]').textContent = '—';

    el.querySelector('[data-bind="statusBadge"]').innerHTML = getStatusBadge(uiStatus);
    el.querySelector('[data-bind="statusBadgeInline"]').innerHTML = getStatusBadge(uiStatus);

    el.querySelector('[data-bind="summaryBody"]').textContent = 'Session summary will be generated after analysis.';
    el.querySelector('[data-bind="insightsBody"]').innerHTML = 'Session insights will be available after analysis.';

    renderQAList();
    renderTranscript();
  }

  function renderQAList() {
    const qaList = el.querySelector('[data-bind="qaList"]');
    qaList.innerHTML = mockQA.length > 0 
      ? mockQA.map(qa => '<div class="qa"><div class="flex jc-b items-s mb-4"><div class="text-xs text-t mono">' + qa.time + '</div><span class="badge ' + (qa.confidence >= 90 ? 'b-ok' : 'b-warn') + '">' + qa.confidence + '%</span></div><div class="qa-q"><div class="qi">Q</div><div class="qa-txt q"><span class="qna-author client" style="font-size:10px;margin-right:6px">' + qa.author + '</span>' + qa.question + '</div></div><div class="qa-a mt-2"><div class="ai">A</div><div class="qa-txt">' + qa.hostAnswer + '</div></div><div class="qa-a mt-2"><div class="ai" style="background:var(--gray-100);color:var(--gray-600)">AI</div><div class="qa-txt" style="color:var(--gray-500)">' + qa.aiAnswer + '</div></div></div>').join('')
      : '<div class="empty"><div class="empty-icon">💬</div><div class="empty-title">No Q&A pairs</div><div class="empty-desc">No questions were detected</div></div>';
    
    el.querySelector('[data-bind="qaCountText"]').textContent = mockQA.length + ' Q&A pairs';
  }

  function renderTranscript() {
    const transcript = el.querySelector('[data-bind="transcript"]');
    transcript.innerHTML = mockTranscript.length > 0
      ? mockTranscript.map(item => '<div class="tscript-item' + (item.isQuestion ? ' question' : '') + '"><div class="ts-author">' + item.author + '</div><div class="ts">' + item.time + '</div>' + item.text + (item.isQuestion ? '<div class="text-xs fw-m mt-1" style="color:var(--warn-600)">⚡ Question detected</div>' : '') + '</div>').join('')
      : '<div class="text-sm text-t">No transcript available</div>';
  }

  function setupEventListeners() {
    el.querySelector('[data-action="backNav"]').addEventListener('click', (e) => {
      e.preventDefault();
      if (session?.project_id) {
        navigate('project/' + session.project_id);
      } else {
        navigate('');
      }
    });

    el.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        el.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        el.querySelectorAll('.tab-c').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        el.querySelector('#tab-' + tab.dataset.tab).classList.add('active');
      });
    });

    const chatInput = el.querySelector('[data-bind="chatInput"]');
    const chatMsgs = el.querySelector('[data-bind="chatMsgs"]');

    const sendChat = () => {
      if (!chatInput.value.trim()) return;
      chatMsgs.innerHTML += '<div class="chat-msg user">' + chatInput.value + '</div>';
      const q = chatInput.value;
      chatInput.value = '';
      setTimeout(() => {
        chatMsgs.innerHTML += '<div class="chat-msg ai"><div class="chat-label">MeetAgent AI</div>Analyzing: ' + q + '...</div>';
        chatMsgs.scrollTop = chatMsgs.scrollHeight;
      }, 700);
    };

    el.querySelector('[data-action="chatSend"]').addEventListener('click', sendChat);
    chatInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendChat(); });

    el.querySelectorAll('.ai-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const text = chip.textContent;
        chatMsgs.innerHTML += '<div class="chat-msg user">' + text + '</div>';
        setTimeout(() => {
          chatMsgs.innerHTML += '<div class="chat-msg ai"><div class="chat-label">MeetAgent AI</div>Analyzing: ' + text + '...</div>';
          chatMsgs.scrollTop = chatMsgs.scrollHeight;
        }, 600);
      });
    });
  }

  loadSession();
  return el;
}
