import { loadTemplate } from '../../utils/template.js';
import { navigate } from '../../router.js';
import { sessionsApi } from '../../api/sessions.js';
import { projectsApi } from '../../api/projects.js';
import { formatDate } from '../../utils/format.js';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.js';

const WEBSOCKET_URL = 'wss://nim2yxc596.execute-api.ap-southeast-1.amazonaws.com/production';

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

function formatTranscriptTime(startTimeSeconds) {
  const total = parseFloat(startTimeSeconds);
  if (isNaN(total)) return '--:--';
  const m = Math.floor(total / 60);
  const s = Math.floor(total % 60);
  return m.toString().padStart(2, '0') + ':' + s.toString().padStart(2, '0');
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
    'running': 'live', 'stopping': 'stopping', 'stopped': 'stopping',
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

function calculateDuration(startTime) {
  if (!startTime) return '—';
  const diffMs = Date.now() - new Date(startTime).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return mins + ' min';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? h + 'h ' + m + 'm' : h + 'h';
}

// Mock Q&A data (will be replaced with real API later)
const mockQA = [
  {
    question: 'Can we integrate this with our existing Slack workspace?',
    hostAnswer: "That's a great question, let me share what our team has prepared — currently Slack isn't in scope but we're exploring webhooks.",
    aiAnswer: 'Currently, the system focuses on Google Meet integration. Slack integration is not in the current scope, but the architecture supports future webhook-based integrations.',
    time: '10:31:05',
    author: 'Client'
  },
];

export default async function LiveSessionController() {
  const el = await loadTemplate('/templates/user/live-session.html', 'live-session');

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
  let statusPollInterval = null;

  // Transcript state
  let transcriptLines = [];   // Final lines
  let partialLine = null;     // Current partial
  let ws = null;
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 5;
  let reconnectTimeout = null;
  let isUserScrolledUp = false;
  let isWsConnected = false;

  // ─── Transcript rendering ───

  function renderTranscriptLine(line, isPartial) {
    const time = line.timestamp ? formatTimestamp(line.timestamp) : formatTranscriptTime(line.start_time);
    const cls = isPartial ? ' partial' : '';
    return '<div class="tscript-item' + cls + '" data-tid="' + (line.transcript_id || '') + '">'
      + '<div class="ts">' + time + '</div>'
      + '<div class="ts-text">' + (line.text || '') + '</div>'
      + '</div>';
  }

  function renderAllTranscripts() {
    const container = el.querySelector('[data-bind="liveTranscript"]');
    const emptyEl = el.querySelector('[data-bind="transcriptEmpty"]');

    if (transcriptLines.length === 0 && !partialLine) {
      if (emptyEl) emptyEl.style.display = '';
      return;
    }
    if (emptyEl) emptyEl.style.display = 'none';

    let html = transcriptLines.map(l => renderTranscriptLine(l, false)).join('');
    if (partialLine) {
      html += renderTranscriptLine(partialLine, true);
    }
    container.innerHTML = html;
    autoScrollTranscript();
  }

  function appendTranscriptLine(line) {
    const container = el.querySelector('[data-bind="liveTranscript"]');
    const emptyEl = el.querySelector('[data-bind="transcriptEmpty"]');
    if (emptyEl) emptyEl.style.display = 'none';

    // Remove existing partial element
    const existingPartial = container.querySelector('.tscript-item.partial');
    if (existingPartial) existingPartial.remove();

    container.insertAdjacentHTML('beforeend', renderTranscriptLine(line, false));
    autoScrollTranscript();
  }

  function updatePartialDisplay() {
    const container = el.querySelector('[data-bind="liveTranscript"]');
    const emptyEl = el.querySelector('[data-bind="transcriptEmpty"]');
    if (emptyEl) emptyEl.style.display = 'none';

    // Remove old partial
    const existingPartial = container.querySelector('.tscript-item.partial');
    if (existingPartial) existingPartial.remove();

    if (partialLine) {
      container.insertAdjacentHTML('beforeend', renderTranscriptLine(partialLine, true));
      autoScrollTranscript();
    }
  }

  function autoScrollTranscript() {
    if (isUserScrolledUp) return;
    const scrollContainer = el.querySelector('[data-bind="transcriptContainer"]');
    if (scrollContainer) {
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }
  }

  function setupScrollDetection() {
    const scrollContainer = el.querySelector('[data-bind="transcriptContainer"]');
    if (!scrollContainer) return;
    scrollContainer.addEventListener('scroll', () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      isUserScrolledUp = (scrollHeight - scrollTop - clientHeight) > 50;
    });
  }

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

  // ─── WebSocket ───

  function connectWebSocket(sid) {
    console.log('[Transcript] connectWebSocket called:', { sid, wsUrl: WEBSOCKET_URL });
    if (!WEBSOCKET_URL) {
      console.warn('VITE_WEBSOCKET_URL not configured, skipping WebSocket');
      return;
    }

    try {
      ws = new WebSocket(WEBSOCKET_URL + '?session_id=' + sid);
    } catch (err) {
      console.error('WebSocket creation failed:', err);
      return;
    }

    ws.onopen = () => {
      console.log('WebSocket connected for session:', sid);
      reconnectAttempts = 0;
      isWsConnected = true;
      updateConnectionUI(true);
    };

    ws.onmessage = (event) => {
      let data;
      try { data = JSON.parse(event.data); } catch { return; }
      console.log('[Transcript] WS message:', data.type, data);

      if (data.type === 'transcriptLine' && data.line) {
        handleTranscriptLine(data.line);
      }
    };

    ws.onclose = (event) => {
      isWsConnected = false;
      updateConnectionUI(false);

      // Auto-reconnect if not intentional close
      if (event.code !== 1000 && reconnectAttempts < maxReconnectAttempts) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
        reconnectAttempts++;
        console.log('Reconnecting in ' + delay + 'ms (attempt ' + reconnectAttempts + ')');
        reconnectTimeout = setTimeout(() => {
          connectWebSocket(sid);
          // Gap fill after reconnect
          handleReconnectGapFill(sid);
        }, delay);
      }
    };

    ws.onerror = (err) => {
      console.error('WebSocket error:', err);
    };
  }

  function handleTranscriptLine(line) {
    if (line.is_partial) {
      partialLine = line;
      updatePartialDisplay();
    } else {
      partialLine = null;
      // Deduplicate
      const exists = transcriptLines.some(l => l.transcript_id === line.transcript_id);
      if (!exists) {
        transcriptLines.push(line);
        appendTranscriptLine(line);
      }
      // Remove partial display
      updatePartialDisplay();
    }

    // Also update retro transcript count
    const countEl = el.querySelector('[data-bind="retroTranscriptCount"]');
    if (countEl) countEl.textContent = transcriptLines.length;
  }

  async function handleReconnectGapFill(sid) {
    const lastTs = transcriptLines.length > 0
      ? transcriptLines[transcriptLines.length - 1].timestamp
      : null;
    try {
      const params = { limit: 100 };
      if (lastTs) params.lastKey = lastTs;
      const res = await sessionsApi.getTranscripts(sid, params);
      const newItems = res.data?.items || [];
      const existingIds = new Set(transcriptLines.map(l => l.transcript_id));
      const unique = newItems.filter(l => !existingIds.has(l.transcript_id));
      if (unique.length > 0) {
        transcriptLines = [...transcriptLines, ...unique].sort(
          (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
        );
        renderAllTranscripts();
      }
    } catch (err) {
      console.error('Gap fill failed:', err);
    }
  }

  function disconnectWebSocket() {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
    if (ws) {
      ws.onclose = null; // Prevent auto-reconnect
      if (ws.readyState === WebSocket.OPEN) {
        ws.close(1000, 'Client disconnecting');
      }
      ws = null;
    }
    isWsConnected = false;
  }

  function updateConnectionUI(connected) {
    const connStatus = el.querySelector('#conn-status');
    const liveBadge = el.querySelector('[data-bind="transcriptLiveBadge"]');

    if (connected) {
      connStatus.className = 'conn ok';
      connStatus.innerHTML = '<span class="conn-dot"></span> Connected';
      if (liveBadge) liveBadge.style.display = '';
    } else {
      connStatus.className = 'conn warn';
      connStatus.innerHTML = '<span class="conn-dot"></span> Reconnecting...';
      if (liveBadge) liveBadge.style.display = 'none';
    }
  }

  // ─── Initialize transcript ───

  async function initTranscript(sid, uiStatus) {
    console.log('[Transcript] init:', { sid, uiStatus, wsUrl: WEBSOCKET_URL });
    try {
      // Fetch historical transcripts
      const historical = await fetchAllTranscripts(sid);
      transcriptLines = historical.sort(
        (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
      );
      renderAllTranscripts();

      // Also render retro transcript
      renderRetroTranscript();

      // Connect WebSocket if session is live
      if (uiStatus === 'live' || uiStatus === 'starting') {
        connectWebSocket(sid);
      } else if (uiStatus !== 'finished' && uiStatus !== 'failed' && uiStatus !== 'none') {
        // Not yet live — poll bot status until it becomes live
        startStatusPolling(sid);
      }
    } catch (err) {
      console.error('Failed to init transcripts:', err);
    }
  }

  // ─── Status polling (wait for bot to go live) ───

  function startStatusPolling(sid) {
    if (statusPollInterval) return; // Already polling
    statusPollInterval = setInterval(async () => {
      try {
        const res = await sessionsApi.getBotStatus(sid);
        const botStatus = res.data?.bot_status || res.data?.status;
        if (!botStatus) return;

        const newUiStatus = getUIStatus(botStatus);
        session.bot_status = botStatus;

        // Update UI
        el.querySelector('[data-bind="statusBadge"]').innerHTML = getStatusBadge(newUiStatus);
        updateDuration();

        if (newUiStatus === 'live') {
          // Bot is now live — stop polling, connect WebSocket
          stopStatusPolling();
          connectWebSocket(sid);

          // Show live controls
          const connStatus = el.querySelector('#conn-status');
          const endBtn = el.querySelector('#btn-end-session');
          connStatus.style.display = '';
          endBtn.style.display = '';

          // Start duration timer
          if (!durationInterval) startDurationTimer();
        } else if (newUiStatus === 'finished' || newUiStatus === 'failed') {
          // Session ended — stop polling
          stopStatusPolling();
        }
      } catch (err) {
        console.warn('Status poll failed:', err);
      }
    }, 5000); // Poll every 5 seconds
  }

  function stopStatusPolling() {
    if (statusPollInterval) {
      clearInterval(statusPollInterval);
      statusPollInterval = null;
    }
  }

  function renderRetroTranscript() {
    const retroContainer = el.querySelector('[data-bind="retroTranscript"]');
    const countEl = el.querySelector('[data-bind="retroTranscriptCount"]');
    if (!retroContainer) return;

    if (transcriptLines.length === 0) {
      retroContainer.innerHTML = '<div class="empty"><div class="empty-icon">📝</div><div class="empty-title">No transcript available</div><div class="empty-desc">Transcript will be available after the meeting</div></div>';
    } else {
      retroContainer.innerHTML = transcriptLines.map(l => renderTranscriptLine(l, false)).join('');
    }
    if (countEl) countEl.textContent = transcriptLines.length;
  }

  // ─── Session data ───

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
      setupScrollDetection();
      startDurationTimer();

      // Init transcript (historical + WebSocket)
      const uiStatus = getUIStatus(session.bot_status);
      initTranscript(sessionId, uiStatus);
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

    el.querySelector('[data-bind="sessionName"]').textContent = session.name || 'Untitled Session';
    el.querySelector('[data-bind="projectName"]').textContent = projectName;
    el.querySelector('[data-bind="backLink"]').textContent = projectName;

    el.querySelector('[data-bind="metaProject"]').textContent = projectName;
    el.querySelector('[data-bind="metaQA"]').textContent = '—';
    el.querySelector('[data-bind="metaStarted"]').textContent = session.start_time
      ? formatDate(session.start_time, { hour: '2-digit', minute: '2-digit' })
      : '—';

    const meetLinkEl = el.querySelector('[data-bind="metaMeetLink"]');
    if (session.meeting_link) {
      meetLinkEl.href = session.meeting_link;
      meetLinkEl.textContent = session.meeting_link.replace('https://', '');
    } else {
      meetLinkEl.textContent = '—';
      meetLinkEl.removeAttribute('href');
    }

    updateDuration();
    el.querySelector('[data-bind="statusBadge"]').innerHTML = getStatusBadge(uiStatus);

    const connStatus = el.querySelector('#conn-status');
    const endBtn = el.querySelector('#btn-end-session');

    if (!isLive) {
      connStatus.style.display = 'none';
      endBtn.style.display = 'none';
      const retroBtn = el.querySelector('.mode-btn[data-mode="retro"]');
      if (retroBtn) retroBtn.click();
    }

    renderQAList();
  }

  function updateDuration() {
    const uiStatus = getUIStatus(session.bot_status);
    const isLive = uiStatus === 'live';
    const duration = calculateDuration(session.start_time);
    const text = isLive ? duration + ' (ongoing)' : duration;
    el.querySelector('[data-bind="metaDuration"]').textContent = session.start_time ? text : '—';
  }

  function startDurationTimer() {
    if (getUIStatus(session.bot_status) === 'live') {
      durationInterval = setInterval(updateDuration, 60000);
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

  function setupEventListeners() {
    // Breadcrumb back
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

        const connStatus = el.querySelector('#conn-status');
        const endBtn = el.querySelector('#btn-end-session');
        if (btn.dataset.mode === 'retro') {
          connStatus.style.display = 'none';
          endBtn.style.display = 'none';
          // Refresh retro transcript with latest data
          renderRetroTranscript();
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

        // Auto-scroll when switching to live transcript tab
        if (tab.dataset.tab === 'live-transcript') {
          setTimeout(autoScrollTranscript, 50);
        }
      });
    });

    // End session button
    el.querySelector('#btn-end-session').addEventListener('click', () => {
      ConfirmDialog({
        title: 'End Session',
        message: 'Are you sure you want to end this session? The bot will leave the meeting and stop recording.',
        warning: 'You can still review the session data after ending.',
        confirmText: 'End Session',
        confirmingText: 'Ending...',
        loadingMessage: 'Ending session...',
        onConfirm: async () => {
          await sessionsApi.stopBot(sessionId);
          if (durationInterval) clearInterval(durationInterval);
          disconnectWebSocket();
        },
        onSuccess: () => {
          const projectId = session?.project_id;
          navigate(projectId ? 'project/' + projectId : '');
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
    if (durationInterval) clearInterval(durationInterval);
    stopStatusPolling();
    disconnectWebSocket();
  };

  loadSession();
  return el;
}
