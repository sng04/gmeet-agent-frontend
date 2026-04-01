import { loadTemplate } from '../../utils/template.js';
import { navigate } from '../../router.js';
import { sessionsApi } from '../../api/sessions.js';
import { projectsApi } from '../../api/projects.js';
import { qaPairsApi } from '../../api/qaPairs.js';
import { renderMarkdown } from '../../utils/markdown.js';
import { MeetingSocket } from '../../api/websocket.js';
import { formatDate } from '../../utils/format.js';
import { sanitize } from '../../utils/sanitize.js';

const SPEAKER_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#EC4899', '#06B6D4', '#F97316',
];

function getSpeakerColor(speaker) {
  const idx = parseInt(speaker?.replace('spk_', ''), 10) || 0;
  return SPEAKER_COLORS[idx % SPEAKER_COLORS.length];
}

function formatSpeaker(speaker) {
  const idx = parseInt(speaker?.replace('spk_', ''), 10) || 0;
  return 'Speaker ' + (idx + 1);
}

function formatTimestamp(isoString) {
  return new Date(isoString).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });
}

function getUIStatus(botStatus) {
  const map = {
    'none': 'none', 'pending': 'starting', 'queued': 'starting',
    'starting': 'starting', 'joining': 'starting', 'in_meeting': 'live',
    'running': 'live', 'stopping': 'stopping', 'stopped': 'finished',
    'completed': 'finished', 'failed': 'failed',
  };
  return map[botStatus] || botStatus;
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

function parseSummaryChapters(markdown) {
  if (!markdown) return {};
  const chapters = {};
  const sections = markdown.split(/^## /m).filter(Boolean);
  for (const section of sections) {
    const [title, ...body] = section.split('\n');
    const key = title.trim().toLowerCase().replace(/[^a-z ]/g, '');
    chapters[key] = body.join('\n').trim();
  }
  return chapters;
}

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
  let qaPairs = [];
  let socket = null;

  // ─── Historical transcript fetch ───

  async function fetchAllTranscripts(sid) {
    let allItems = [];
    let lastKey = null;
    do {
      const params = { limit: 100 };
      if (lastKey) params.lastKey = lastKey;
      try {
        const res = await sessionsApi.getTranscripts(sid, params);
        const items = res.data?.items || [];
        allItems = [...allItems, ...items];
        lastKey = res.data?.lastKey || null;
      } catch (err) {
        console.error('Failed to fetch transcripts:', err);
        break;
      }
    } while (lastKey);
    return allItems;
  }

  // ─── WebSocket message router ───

  function handleWSMessage(data) {
    switch (data.type) {
      case 'retroFeedback':
        handleRetroFeedback(data);
        break;
      case 'retroResponse':
        handleRetroResponse(data);
        break;
      case 'error':
        handleError(data);
        break;
      default:
        break;
    }
  }

  function handleRetroFeedback(data) {
    const feedbackEl = el.querySelector('[data-bind="retroFeedback"]');
    if (feedbackEl) {
      feedbackEl.innerHTML = renderMarkdown(data.feedback || '');
    }
  }

  function handleRetroResponse(data) {
    const chatMsgs = el.querySelector('[data-bind="chatMsgs"]');
    if (!chatMsgs) return;
    // Remove typing indicator
    const typing = chatMsgs.querySelector('.chat-test-row.typing');
    if (typing) typing.remove();
    // Append AI response
    chatMsgs.innerHTML += '<div class="chat-test-row"><div class="chat-test-bubble ai-bubble"><div class="agent-lbl">MeetAgent AI</div><div class="chat-test-body">' + renderMarkdown(data.message || '') + '</div></div></div>';
    chatMsgs.scrollTop = chatMsgs.scrollHeight;
  }

  function handleError(data) {
    const chatMsgs = el.querySelector('[data-bind="chatMsgs"]');
    if (!chatMsgs) return;
    // Remove typing indicator
    const typing = chatMsgs.querySelector('.chat-test-row.typing');
    if (typing) typing.remove();
    const message = data.message || data.error || 'An error occurred';
    chatMsgs.innerHTML += '<div class="chat-test-row"><div class="chat-test-bubble ai-bubble" style="border-color:var(--err-200);background:var(--err-50)"><div class="agent-lbl" style="color:var(--err-500)">System</div><div class="chat-test-body" style="color:var(--err-600)">' + sanitize(message) + '</div></div></div>';
    chatMsgs.scrollTop = chatMsgs.scrollHeight;
  }

  // ─── Load session ───

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

      // Fetch QA pairs via REST
      try {
        const qaRes = await qaPairsApi.listBySession(sessionId);
        qaPairs = qaRes.data?.items || qaRes.data || [];
      } catch (err) {
        console.warn('Failed to load QA pairs:', err);
        qaPairs = [];
        // Show user-facing error in QA tab
        const qaList = el.querySelector('[data-bind="qaList"]');
        if (qaList) {
          qaList.innerHTML = '<div class="empty"><div class="empty-icon">⚠️</div><div class="empty-title">Failed to load Q&A pairs</div><div class="empty-desc">' + sanitize(err.message || 'Please try again later') + '</div></div>';
        }
      }

      pageLoading.style.display = 'none';
      pageContent.style.display = 'block';

      populateSessionData();
      setupEventListeners();
      renderMeetingSummary();

      // Connect WebSocket for retro analysis and chat
      socket = new MeetingSocket({
        sessionId,
        agentId: session.agent_id,
        onMessage: handleWSMessage,
        onOpen: () => {
          // Request coaching feedback once connected
          socket.retroAnalysis(sessionId);
        },
        onClose: () => {},
        onError: (e) => console.error('WS error:', e),
      });
      socket.connect();
    } catch (err) {
      pageLoading.style.display = 'none';
      pageError.style.display = 'block';
      pageError.innerHTML = '<div class="empty"><div class="empty-icon">⚠️</div><div class="empty-title">Failed to load session</div><div class="empty-desc">' + sanitize(err.message) + '</div></div>';
    }
  }

  function populateSessionData() {
    const projectName = project?.name || session.project_name || 'Unknown Project';
    const uiStatus = getUIStatus(session.bot_status);

    el.querySelector('[data-bind="sessionName"]').textContent = session.name || 'Untitled Session';
    el.querySelector('[data-bind="projectName"]').textContent = projectName;
    el.querySelector('[data-bind="backLink"]').textContent = projectName;

    el.querySelector('[data-bind="metaProject"]').textContent = projectName;
    el.querySelector('[data-bind="metaQA"]').textContent = qaPairs.length > 0 ? qaPairs.length : '—';
    el.querySelector('[data-bind="metaStarted"]').textContent = session.start_time
      ? formatDate(session.start_time, { hour: '2-digit', minute: '2-digit' })
      : '—';
    el.querySelector('[data-bind="metaEnded"]').textContent = session.end_time
      ? formatDate(session.end_time, { hour: '2-digit', minute: '2-digit' })
      : '—';

    const meetLinkEl = el.querySelector('[data-bind="metaMeetLink"]');
    if (session.meeting_link) {
      meetLinkEl.href = session.meeting_link;
      meetLinkEl.textContent = sanitize(session.meeting_link.replace('https://', ''));
    } else {
      meetLinkEl.textContent = '—';
      meetLinkEl.removeAttribute('href');
    }

    const duration = calculateDuration(session.start_time, session.end_time);
    el.querySelector('[data-bind="metaDuration"]').textContent = session.start_time ? duration : '—';
    el.querySelector('[data-bind="metaScore"]').textContent = '—';

    el.querySelector('[data-bind="statusBadge"]').innerHTML = getStatusBadge(uiStatus);
    el.querySelector('[data-bind="statusBadgeInline"]').innerHTML = getStatusBadge(uiStatus);

    renderQAList();
    renderTranscript();
  }

  // ─── Meeting summary rendering ───

  async function renderMeetingSummary() {
    const summaryContent = el.querySelector('[data-bind="summaryContent"]');
    const improvementsContent = el.querySelector('[data-bind="improvementsContent"]');
    const missedItemsContent = el.querySelector('[data-bind="missedItemsContent"]');
    const actionItemsContent = el.querySelector('[data-bind="actionItemsContent"]');
    const insightsContent = el.querySelector('[data-bind="insightsContent"]');
    const loadingHtml = '<div class="loading"><div class="loading-spinner"></div><div class="loading-text">Loading summary...</div></div>';
    const notAvailable = '<p style="font-size:13px;color:var(--gray-400);line-height:1.6">Summary not yet available. It will be generated after the session ends.</p>';

    // Show loading state
    if (summaryContent) summaryContent.innerHTML = loadingHtml;

    try {
      const res = await sessionsApi.getSummary(sessionId);
      const data = res.data || {};
      const summaryMarkdown = data.summary_markdown;

      if (!summaryMarkdown || data.status === 'not_generated') {
        if (summaryContent) summaryContent.innerHTML = notAvailable;
        if (improvementsContent) improvementsContent.innerHTML = notAvailable;
        if (missedItemsContent) missedItemsContent.innerHTML = notAvailable;
        if (actionItemsContent) actionItemsContent.innerHTML = notAvailable;
        if (insightsContent) insightsContent.innerHTML = notAvailable;
        return;
      }

      const chapters = parseSummaryChapters(summaryMarkdown);
      const noContent = '<p style="font-size:13px;color:var(--gray-400)">No content</p>';

      if (summaryContent) summaryContent.innerHTML = renderMarkdown(chapters['meeting summary'] || '') || noContent;
      if (improvementsContent) improvementsContent.innerHTML = renderMarkdown(chapters['areas for improvement'] || '') || noContent;
      if (missedItemsContent) missedItemsContent.innerHTML = renderMarkdown(chapters['missed agenda items'] || '') || noContent;
      if (actionItemsContent) actionItemsContent.innerHTML = renderMarkdown(chapters['action items  next steps'] || chapters['action items next steps'] || '') || noContent;
      if (insightsContent) insightsContent.innerHTML = renderMarkdown(chapters['session insights'] || '') || noContent;
    } catch (err) {
      console.warn('Failed to fetch summary:', err);
      if (summaryContent) summaryContent.innerHTML = notAvailable;
      if (improvementsContent) improvementsContent.innerHTML = notAvailable;
      if (missedItemsContent) missedItemsContent.innerHTML = notAvailable;
      if (actionItemsContent) actionItemsContent.innerHTML = notAvailable;
      if (insightsContent) insightsContent.innerHTML = notAvailable;
    }
  }

  // ─── QA list rendering ───

  function renderQAList() {
    const qaList = el.querySelector('[data-bind="qaList"]');
    qaList.innerHTML = qaPairs.length > 0
      ? qaPairs.map(qa => {
          const question = qa.question || '';
          const hostAnswer = qa.host_answer || qa.answer || '';
          const aiAnswer = qa.ai_answer || qa.suggested_answer || '';
          const confidence = qa.confidence;
          const time = qa.detected_at ? formatTimestamp(qa.detected_at) : qa.timestamp ? formatTimestamp(qa.timestamp) : qa.created_at ? formatTimestamp(qa.created_at) : '';
          const author = qa.author || 'Client';

          return '<div class="qa">'
            + '<div class="flex jc-b items-s mb-4">'
            + '<div class="text-xs text-t mono">' + time + '</div>'
            + (confidence != null ? '<span class="badge ' + (confidence >= 90 ? 'b-ok' : 'b-warn') + '">' + confidence + '%</span>' : '')
            + '</div>'
            + '<div class="qa-q"><div class="qi">Q</div><div class="qa-txt q"><span class="qna-author client" style="font-size:10px;margin-right:6px">' + sanitize(author) + '</span>' + sanitize(question) + '</div></div>'
            + (hostAnswer ? '<div class="qa-a mt-2"><div class="ai">A</div><div class="qa-txt">' + renderMarkdown(hostAnswer) + '</div></div>' : '')
            + (aiAnswer ? '<div class="qa-a mt-2" style="border-left:3px solid var(--pri-300);padding-left:10px;margin-left:28px"><div class="text-xs mono fw-m" style="color:var(--pri-500);margin-bottom:2px">💡 AI Suggestion</div><div class="text-sm" style="color:var(--gray-600);line-height:1.5">' + renderMarkdown(aiAnswer) + '</div></div>' : '')
            + '</div>';
        }).join('')
      : '<div class="empty"><div class="empty-icon">💬</div><div class="empty-title">No Q&A pairs</div><div class="empty-desc">No questions were detected</div></div>';

    el.querySelector('[data-bind="qaCountText"]').textContent = qaPairs.length + ' Q&A pairs';
  }

  function renderTranscript() {
    const transcript = el.querySelector('[data-bind="transcript"]');
    transcript.innerHTML = '<div class="loading"><div class="loading-spinner"></div><div class="loading-text">Loading transcript...</div></div>';

    fetchAllTranscripts(sessionId).then(items => {
      const sorted = items.sort(
        (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
      );

      if (sorted.length > 0) {
        transcript.innerHTML = sorted.map(line => {
          const time = line.timestamp ? formatTimestamp(line.timestamp) : '';
          return '<div class="tscript-item">'
            + '<div class="ts">' + time + '</div>'
            + '<div class="ts-text">' + (line.text || '') + '</div>'
            + '</div>';
        }).join('');
      } else {
        transcript.innerHTML = '<div class="empty"><div class="empty-icon">📝</div><div class="empty-title">No transcript available</div><div class="empty-desc">No transcript was recorded for this session</div></div>';
      }
    }).catch(() => {
      transcript.innerHTML = '<div class="empty"><div class="empty-icon">⚠️</div><div class="empty-title">Failed to load transcript</div><div class="empty-desc">Please try again later</div></div>';
    });
  }

  // ─── Chat helpers ───

  function showNotConnectedNotification() {
    const chatMsgs = el.querySelector('[data-bind="chatMsgs"]');
    if (!chatMsgs) return;
    chatMsgs.innerHTML += '<div class="chat-test-row"><div class="chat-test-bubble ai-bubble" style="border-color:var(--warn-200);background:var(--warn-50)"><div class="agent-lbl" style="color:var(--warn-500)">System</div><div class="chat-test-body" style="color:var(--warn-600)">Not connected — please wait for reconnection.</div></div></div>';
    chatMsgs.scrollTop = chatMsgs.scrollHeight;
  }

  function ensureConnected() {
    if (socket && socket.connected) return true;
    showNotConnectedNotification();
    return false;
  }

  function showTypingIndicator() {
    const chatMsgs = el.querySelector('[data-bind="chatMsgs"]');
    if (!chatMsgs) return;
    if (!chatMsgs.querySelector('.chat-test-row.typing')) {
      chatMsgs.innerHTML += '<div class="chat-test-row typing"><div class="chat-test-bubble ai-bubble"><div class="agent-lbl">MeetAgent AI</div><div class="chat-test-body" style="color:var(--gray-400)">Thinking...</div></div></div>';
      chatMsgs.scrollTop = chatMsgs.scrollHeight;
    }
  }

  // ─── Event listeners ───

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
      const message = chatInput.value.trim();
      chatMsgs.innerHTML += '<div class="chat-test-row right"><div class="chat-test-bubble user-bubble">' + message + '</div></div>';
      chatInput.value = '';
      showTypingIndicator();
      if (ensureConnected()) {
        socket.retroChat(sessionId, message);
      }
    };

    el.querySelector('[data-action="chatSend"]').addEventListener('click', sendChat);
    chatInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendChat(); });

    el.querySelectorAll('.ai-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const text = chip.textContent;
        chatMsgs.innerHTML += '<div class="chat-test-row right"><div class="chat-test-bubble user-bubble">' + text + '</div></div>';
        showTypingIndicator();
        if (ensureConnected()) {
          socket.retroChat(sessionId, text);
        }
      });
    });
  }

  // ─── Cleanup ───

  el._cleanup = () => {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  };

  loadSession();
  return el;
}
