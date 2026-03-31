import { loadTemplate } from '../../utils/template.js';
import { navigate } from '../../router.js';
import { sessionsApi } from '../../api/sessions.js';
import { projectsApi } from '../../api/projects.js';
import { qaPairsApi } from '../../api/qaPairs.js';
import { formatDate } from '../../utils/format.js';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.js';
import { MeetingSocket } from '../../api/websocket.js';
import { renderMarkdown } from '../../utils/markdown.js';
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

export function parseSummaryChapters(markdown) {
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
  let transcriptPollInterval = null;
  let qaPollInterval = null;

  // Transcript state
  let transcriptLines = [];   // Final lines
  let partialLine = null;     // Current partial
  let isUserScrolledUp = false;

  // MeetingSocket instance
  let socket = null;

  // Q&A state (replaces mockQA)
  let qaCards = [];

  // Suggested questions state
  let suggestedQuestions = [];

  // Connection state: 'disconnected' | 'connected' | 'reconnecting' | 'lost'
  let connectionState = 'disconnected';
  let consecutiveCloses = 0;

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

  // ─── MeetingSocket setup ───

  function createSocket(sid) {
    socket = new MeetingSocket({
      sessionId: sid,
      agentId: session.agent_id,
      onMessage: handleWSMessage,
      onOpen: () => {
        consecutiveCloses = 0;
        connectionState = 'connected';
        updateConnectionUI();
        // Auto-trigger gap analysis and send suggested questions on first connect
        autoTriggerOnConnect();
        // Re-fetch QA pairs on reconnect to catch any missed during disconnect
        refreshQAPairsFromREST();
      },
      onClose: () => {
        consecutiveCloses++;
        if (consecutiveCloses > 5) {
          connectionState = 'lost';
        } else {
          connectionState = 'reconnecting';
        }
        updateConnectionUI();
      },
      onError: (e) => console.error('WS error:', e),
    });
  }

  let hasAutoTriggered = false;

  function autoTriggerOnConnect() {
    if (hasAutoTriggered) return;
    hasAutoTriggered = true;

    // Send suggested questions if we have any pre-loaded from the API
    if (suggestedQuestions.length > 0 && socket && socket.connected) {
      socket.setSuggestedQuestions(sessionId, suggestedQuestions);
    }

    // Auto-trigger gap analysis
    if (socket && socket.connected) {
      const gapContainer = el.querySelector('[data-bind="gapCards"]');
      if (gapContainer) {
        gapContainer.innerHTML = '<div class="loading"><div class="loading-spinner"></div><div class="loading-text">Analyzing knowledge gaps...</div></div>';
      }
      socket.analyzeGaps(sessionId);
    }
  }

  // ─── Central message router ───

  function handleWSMessage(data) {
    switch (data.type) {
      case 'transcriptLine':
        if (data.line) {
          handleTranscriptLine(data.line);
        } else if (data.transcript_id) {
          handleTranscriptLine(data);
        }
        break;
      case 'transcriptProcessed':
        handleTranscriptProcessed(data);
        break;
      case 'questionDetected':
        handleQuestionDetected(data);
        break;
      case 'suggestedResponse':
        handleSuggestedResponse(data);
        break;
      case 'questionMatched':
        handleQuestionMatched(data);
        break;
      case 'qaPairAutoSaved':
        handleQAPairAutoSaved(data);
        break;
      case 'questionUnanswered':
        handleQuestionUnanswered(data);
        break;
      case 'suggestedQuestionsSet':
        handleSuggestedQuestionsSet(data);
        break;
      case 'gapAnalysis':
        handleGapAnalysis(data);
        break;
      case 'status':
        handleStatusMessage(data);
        break;
      case 'meetingSummary':
        handleMeetingSummary(data);
        break;
      case 'response':
        handleChatResponse(data);
        break;
      case 'retroResponse':
        handleChatResponse(data);
        break;
      case 'retroFeedback':
        handleRetroFeedback(data);
        break;
      case 'error':
        handleErrorMessage(data);
        break;
      default:
        // Handle messages without a type field (legacy backend patterns)
        if (data.line) {
          handleTranscriptLine(data.line);
        } else if (data.transcript_id) {
          handleTranscriptLine(data);
        }
        break;
    }
  }

  // ─── Transcript processing ───

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

        // Send non-partial final line for Q&A detection
        if (socket && socket.connected) {
          socket.processTranscript(sessionId, [line]);
        }
      }
      // Remove partial display
      updatePartialDisplay();
    }

    // Also update retro transcript count
    const countEl = el.querySelector('[data-bind="retroTranscriptCount"]');
    if (countEl) countEl.textContent = transcriptLines.length;
  }

  function handleTranscriptProcessed(data) {
    const qaCountEl = el.querySelector('[data-bind="metaQA"]');
    if (qaCountEl && data.qa_count != null) {
      qaCountEl.textContent = data.qa_count;
    }
  }

  // ─── Q&A event handlers ───

  function handleQuestionDetected(data) {
    // Avoid duplicates
    const exists = qaCards.find(c => c.question === data.question);
    if (exists) return;
    qaCards.unshift({
      question: data.question,
      aiAnswer: null,
      participantAnswer: null,
      speaker: data.speaker || null,
      speakerRole: data.speaker_role || null,
      detectionMethod: data.detection_method || null,
      status: 'detecting',
      timestamp: data.detected_at || data.timestamp || new Date().toISOString(),
    });
    updateQACount();
    renderQAList();
  }

  function handleSuggestedResponse(data) {
    const card = qaCards.find(c => c.question === data.question);
    if (card) {
      card.aiAnswer = data.suggested_answer;
      if (card.status === 'detecting') card.status = 'suggested';
      renderQAList();
    }
  }

  function handleQAPairAutoSaved(data) {
    let card = qaCards.find(c => c.question === data.question);
    if (card) {
      card.participantAnswer = data.answer;
      card.source = data.source || 'participant';
      card.status = 'answered';
    } else {
      // QA pair arrived without a prior questionDetected (e.g. page loaded mid-session)
      qaCards.unshift({
        question: data.question || '',
        aiAnswer: null,
        participantAnswer: data.answer || '',
        source: data.source || 'participant',
        status: 'answered',
        timestamp: new Date().toISOString(),
      });
    }
    updateQACount();
    renderQAList();
  }

  function handleQuestionUnanswered(data) {
    const card = qaCards.find(c => c.question === data.question);
    if (card) {
      card.status = 'unanswered';
      renderQAList();
    }
  }

  function updateQACount() {
    const countEl = el.querySelector('[data-bind="metaQA"]');
    if (countEl) countEl.textContent = qaCards.length || '—';
  }

  async function refreshQAPairsFromREST() {
    try {
      const qaRes = await qaPairsApi.listBySession(sessionId);
      const pairs = qaRes.data?.items || qaRes.data || [];
      if (!Array.isArray(pairs)) return;
      let added = false;
      for (const qa of pairs) {
        const q = qa.question || '';
        if (!q || qaCards.find(c => c.question === q)) continue;
        qaCards.push({
          question: q,
          aiAnswer: qa.ai_answer || qa.suggested_answer || null,
          participantAnswer: qa.host_answer || qa.answer || null,
          source: qa.source || 'participant',
          status: 'answered',
          timestamp: qa.detected_at || qa.timestamp || qa.created_at || new Date().toISOString(),
        });
        added = true;
      }
      if (added) {
        updateQACount();
        renderQAList();
      }
    } catch (err) {
      console.warn('Failed to refresh QA pairs:', err);
    }
  }

  function handleQuestionMatched(data) {
    const notifContainer = el.querySelector('[data-bind="questionMatchNotifications"]');
    const container = notifContainer || el.querySelector('#tab-live-suggest');
    if (!container) return;
    const notification = document.createElement('div');
    notification.className = 'card mb-4';
    notification.style.cssText = 'border-color:var(--ok-200);background:var(--ok-50)';
    notification.innerHTML = '<div class="card-body" style="padding:12px 16px">'
      + '<div class="text-xs mono fw-m" style="color:var(--ok-700);margin-bottom:4px">✅ QUESTION MATCHED</div>'
      + '<div class="text-sm fw-m text-p mb-2">Suggested: ' + sanitize(data.question_text || '') + '</div>'
      + '<div class="text-sm text-s mb-2">Spoken: "' + sanitize(data.spoken_text || '') + '"</div>'
      + '<div class="text-xs text-t">Similarity: ' + (data.similarity != null ? (data.similarity * 100).toFixed(0) + '%' : '—') + '</div>'
      + '</div>';
    container.prepend(notification);
  }

  function handleSuggestedQuestionsSet(data) {
    const confirmEl = el.querySelector('[data-bind="suggestedQuestionsConfirmation"]');
    if (!confirmEl) return;
    const count = data.count ?? suggestedQuestions.length;
    confirmEl.style.display = '';
    confirmEl.innerHTML = '<div class="text-xs" style="color:var(--ok-600);padding:4px 0">✅ ' + count + ' question' + (count !== 1 ? 's' : '') + ' sent to agent</div>';
    setTimeout(() => { confirmEl.style.display = 'none'; }, 5000);
  }

  // ─── Gap Analysis ───

  function handleGapAnalysis(data) {
    const container = el.querySelector('[data-bind="gapCards"]');
    if (!container) return;

    const gaps = data.gaps || [];
    const suggestedQs = data.suggested_questions || [];

    if (gaps.length === 0 && suggestedQs.length === 0) {
      container.innerHTML = '<div class="text-sm text-t" style="padding:8px 0">No knowledge gaps detected</div>';
      return;
    }

    const confidenceBadge = (level) => {
      const map = { high: 'b-err', medium: 'b-warn', low: 'b-gray' };
      return '<span class="badge ' + (map[level] || 'b-gray') + '">' + (level || 'unknown') + '</span>';
    };

    let html = gaps.map(gap =>
      '<div class="card mb-4" style="border-color:var(--warn-100);background:var(--warn-50)">'
      + '<div class="card-body" style="padding:12px 16px">'
      + '<div class="flex jc-b items-c mb-2">'
      + '<div class="text-xs mono fw-m" style="color:var(--warn-700)">⚠️ KNOWLEDGE GAP</div>'
      + confidenceBadge(gap.confidence)
      + '</div>'
      + '<div class="text-sm fw-m text-p mb-2">' + sanitize(gap.topic || '') + '</div>'
      + '<div class="text-xs text-t">' + sanitize(gap.description || '') + '</div>'
      + '</div></div>'
    ).join('');

    if (suggestedQs.length > 0) {
      html += '<div class="card mb-4" style="border-color:var(--pri-200);background:var(--pri-25)">'
        + '<div class="card-body" style="padding:12px 16px">'
        + '<div class="text-xs mono fw-m" style="color:var(--pri-600);margin-bottom:8px">💡 SUGGESTED FROM ANALYSIS</div>'
        + suggestedQs.map(q => '<div class="text-sm text-p" style="padding:4px 0;border-bottom:1px solid var(--pri-100)">' + sanitize(q) + '</div>').join('')
        + '</div></div>';
    }

    container.innerHTML = html;
  }

  // ─── End Meeting Handlers ───

  function handleStatusMessage(data) {
    const message = data.message || '';
    // Show a loading overlay on the page content
    const overlay = document.createElement('div');
    overlay.id = 'summary-loading-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(255,255,255,0.85);display:flex;align-items:center;justify-content:center;z-index:1000';
    overlay.innerHTML = '<div style="text-align:center"><div class="loading-spinner" style="margin:0 auto 12px"></div><div class="text-md fw-sb">' + sanitize(message) + '</div></div>';
    document.body.appendChild(overlay);
  }

  function handleMeetingSummary(data) {
    // Remove loading overlay
    const overlay = document.getElementById('summary-loading-overlay');
    if (overlay) overlay.remove();

    // Clean up resources before navigating
    stopTranscriptPolling();
    stopStatusPolling();
    if (durationInterval) {
      clearInterval(durationInterval);
      durationInterval = null;
    }
    if (socket) {
      socket.disconnect();
      socket = null;
    }

    // Navigate to the session review page
    navigate('session/' + sessionId);
  }

  function handleErrorMessage(data) {
    // Remove loading overlay if present
    const overlay = document.getElementById('summary-loading-overlay');
    if (overlay) overlay.remove();

    const message = data.message || data.error || 'An error occurred';
    // Show a temporary error notification
    const notif = document.createElement('div');
    notif.style.cssText = 'position:fixed;top:20px;right:20px;background:var(--err-50);border:1px solid var(--err-200);color:var(--err-700);padding:12px 16px;border-radius:8px;z-index:1001;max-width:400px;font-size:14px';
    notif.textContent = message;
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 6000);
  }

  // ─── Chat response handlers ───

  function handleChatResponse(data) {
    const chatMsgs = el.querySelector('[data-bind="chatMsgs"]');
    if (!chatMsgs) return;
    const typing = chatMsgs.querySelector('.chat-test-row.typing');
    if (typing) typing.remove();
    chatMsgs.innerHTML += '<div class="chat-test-row"><div class="chat-test-bubble ai-bubble"><div class="agent-lbl">MeetAgent AI</div><div class="chat-test-body">' + renderMarkdown(data.message || '') + '</div></div></div>';
    chatMsgs.scrollTop = chatMsgs.scrollHeight;
  }

  function handleRetroFeedback(data) {
    // Retro feedback in LiveSessionController — render into retro summary area if available
    const feedbackEl = el.querySelector('[data-bind="retroFeedback"]');
    if (feedbackEl) {
      feedbackEl.innerHTML = renderMarkdown(data.feedback || '');
    }
  }

  function showTypingIndicator() {
    const chatMsgs = el.querySelector('[data-bind="chatMsgs"]');
    if (!chatMsgs) return;
    if (!chatMsgs.querySelector('.chat-test-row.typing')) {
      chatMsgs.innerHTML += '<div class="chat-test-row typing"><div class="chat-test-bubble ai-bubble"><div class="agent-lbl">MeetAgent AI</div><div class="chat-test-body" style="color:var(--gray-400)">Thinking...</div></div></div>';
      chatMsgs.scrollTop = chatMsgs.scrollHeight;
    }
  }

  // ─── Connection UI ───

  function showNotConnectedNotification() {
    const notif = document.createElement('div');
    notif.style.cssText = 'position:fixed;top:20px;right:20px;background:var(--warn-50);border:1px solid var(--warn-200);color:var(--warn-700);padding:12px 16px;border-radius:8px;z-index:1001;max-width:400px;font-size:14px';
    notif.textContent = 'Not connected — please wait for reconnection or click Reconnect.';
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 4000);
  }

  function ensureConnected() {
    if (socket && socket.connected) return true;
    showNotConnectedNotification();
    return false;
  }

  function updateConnectionUI() {
    const connStatus = el.querySelector('#conn-status');
    const liveBadge = el.querySelector('[data-bind="transcriptLiveBadge"]');

    switch (connectionState) {
      case 'connected':
        connStatus.className = 'conn ok';
        connStatus.innerHTML = '<span class="conn-dot"></span> Connected';
        if (liveBadge) liveBadge.style.display = '';
        break;
      case 'reconnecting':
        connStatus.className = 'conn warn';
        connStatus.innerHTML = '<span class="conn-dot"></span> Reconnecting...';
        if (liveBadge) liveBadge.style.display = 'none';
        break;
      case 'lost':
        connStatus.className = 'conn err';
        connStatus.innerHTML = '<span class="conn-dot"></span> Connection Lost <button class="btn btn-sm" id="btn-reconnect" style="margin-left:8px;padding:2px 8px;font-size:10px">Reconnect</button>';
        if (liveBadge) liveBadge.style.display = 'none';
        // Attach reconnect handler
        const reconnectBtn = connStatus.querySelector('#btn-reconnect');
        if (reconnectBtn) {
          reconnectBtn.addEventListener('click', () => {
            consecutiveCloses = 0;
            connectionState = 'reconnecting';
            updateConnectionUI();
            if (socket) {
              socket._reconnectAttempts = 0;
              socket.connect();
            }
          });
        }
        break;
      default: // 'disconnected'
        connStatus.className = 'conn';
        connStatus.innerHTML = '<span class="conn-dot"></span> Disconnected';
        if (liveBadge) liveBadge.style.display = 'none';
        break;
    }
  }

  // ─── Initialize transcript ───

  async function initTranscript(sid, uiStatus) {
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
        createSocket(sid);
        socket.connect();
        startTranscriptPolling(sid);
      } else if (uiStatus !== 'finished' && uiStatus !== 'failed' && uiStatus !== 'none') {
        // Not yet live — poll bot status until it becomes live
        startStatusPolling(sid);
      }
    } catch (err) {
      console.error('Failed to init transcripts:', err);
    }
  }

  // ─── Transcript polling fallback (REST API) ───

  function startTranscriptPolling(sid) {
    if (transcriptPollInterval) return;
    transcriptPollInterval = setInterval(async () => {
      try {
        const historical = await fetchAllTranscripts(sid);
        if (historical.length > transcriptLines.length) {
          const existingIds = new Set(transcriptLines.map(l => l.transcript_id));
          const newLines = historical.filter(l => !existingIds.has(l.transcript_id));
          if (newLines.length > 0) {
            transcriptLines = [...transcriptLines, ...newLines].sort(
              (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
            );
            renderAllTranscripts();
            renderRetroTranscript();
          }
        }
      } catch (err) {
        console.warn('Transcript poll failed:', err);
      }
    }, 3000);
    // QA pair fallback poll (every 30s to catch missed WebSocket events)
    if (!qaPollInterval) {
      qaPollInterval = setInterval(async () => {
        try { await refreshQAPairsFromREST(); } catch (err) { console.warn('QA poll failed:', err); }
      }, 30000);
    }
  }

  function stopTranscriptPolling() {
    if (transcriptPollInterval) {
      clearInterval(transcriptPollInterval);
      transcriptPollInterval = null;
    }
    if (qaPollInterval) {
      clearInterval(qaPollInterval);
      qaPollInterval = null;
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
          createSocket(sid);
          socket.connect();
          startTranscriptPolling(sid);

          // Show live controls
          const connStatus = el.querySelector('#conn-status');
          const endBtn = el.querySelector('#btn-end-session');
          connStatus.style.display = '';
          endBtn.style.display = '';

          // Start duration timer
          if (!durationInterval) startDurationTimer();
        } else if (newUiStatus === 'finished' || newUiStatus === 'failed') {
          // Session ended — stop polling, hide live controls, switch to retro
          stopStatusPolling();
          stopTranscriptPolling();

          const connStatus = el.querySelector('#conn-status');
          const endBtn = el.querySelector('#btn-end-session');
          if (connStatus) connStatus.style.display = 'none';
          if (endBtn) endBtn.style.display = 'none';

          if (durationInterval) {
            clearInterval(durationInterval);
            durationInterval = null;
          }

          // Switch to retro mode
          const retroBtn = el.querySelector('.mode-btn[data-mode="retro"]');
          if (retroBtn) retroBtn.click();
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

      // Fetch auto-generated suggested questions from backend
      try {
        const sqRes = await sessionsApi.getSuggestedQuestions(sessionId);
        const questions = sqRes.data?.questions || [];
        if (questions.length > 0) {
          suggestedQuestions = questions.map(q => q.question_text || q);
          renderSuggestedQuestions();
        }
      } catch (err) {
        console.warn('Failed to fetch suggested questions:', err);
      }

      // Fetch existing QA pairs from REST API (for page refresh mid-meeting)
      try {
        const qaRes = await qaPairsApi.listBySession(sessionId);
        const existingPairs = qaRes.data?.items || qaRes.data || [];
        if (existingPairs.length > 0) {
          for (const qa of existingPairs) {
            qaCards.push({
              question: qa.question || '',
              aiAnswer: qa.ai_answer || qa.suggested_answer || null,
              participantAnswer: qa.host_answer || qa.answer || null,
              status: 'saved',
              timestamp: qa.timestamp || qa.created_at || new Date().toISOString(),
            });
          }
          renderQAList();
          el.querySelector('[data-bind="metaQA"]').textContent = qaCards.length;
        }
      } catch (err) {
        console.warn('Failed to fetch QA pairs:', err);
      }

      // Init transcript (historical + WebSocket)
      const uiStatus = getUIStatus(session.bot_status);
      initTranscript(sessionId, uiStatus);
    } catch (err) {
      pageLoading.style.display = 'none';
      pageError.style.display = 'block';
      pageError.innerHTML = '<div class="empty"><div class="empty-icon">⚠️</div><div class="empty-title">Failed to load session</div><div class="empty-desc">' + sanitize(err.message) + '</div></div>';
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
      meetLinkEl.textContent = sanitize(session.meeting_link.replace('https://', ''));
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
    const statusBadges = {
      detecting: '<span class="badge b-pri"><span class="dot"></span> Detecting</span>',
      suggested: '<span class="badge b-ok">AI Suggested</span>',
      answered: '<span class="badge b-summary">Answered</span>',
      unanswered: '<span class="badge b-warn">Unanswered</span>',
      saved: '<span class="badge b-summary">Saved</span>',
    };

    const renderQAItem = (qa) => {
      const time = qa.timestamp ? formatTimestamp(qa.timestamp) : '--:--';
      const badge = statusBadges[qa.status] || '';
      const roleLabel = qa.speakerRole === 'client'
        ? '<span class="qna-author client" style="font-size:10px;margin-right:6px">Client</span>'
        : qa.speakerRole === 'user'
        ? '<span class="qna-author" style="font-size:10px;margin-right:6px;background:var(--pri-50);color:var(--pri-600)">You</span>'
        : '';

      let html = '<div class="qa">'
        + '<div class="flex jc-b items-s mb-4">'
        + '<div class="text-xs text-t mono">' + time + '</div>'
        + badge
        + '</div>'
        + '<div class="qa-q"><div class="qi">Q</div><div class="qa-txt q">' + roleLabel + sanitize(qa.question) + '</div></div>';

      // Show participant answer if available
      if (qa.participantAnswer) {
        html += '<div class="qa-a mt-2"><div class="ai">A</div><div class="qa-txt">' + sanitize(qa.participantAnswer) + '</div></div>';
      }

      // Show AI suggested answer
      if (qa.aiAnswer) {
        html += '<div class="qa-a mt-2" style="border-left:3px solid var(--pri-300);padding-left:10px;margin-left:28px">'
          + '<div class="text-xs mono fw-m" style="color:var(--pri-500);margin-bottom:2px">💡 AI Suggestion</div>'
          + '<div class="text-sm" style="color:var(--gray-600);line-height:1.5">' + sanitize(qa.aiAnswer) + '</div>'
          + '</div>';
      } else if (qa.status === 'detecting' && qa.speakerRole !== 'user') {
        html += '<div class="qa-a mt-2"><div class="ai" style="background:var(--gray-100);color:var(--gray-600)">AI</div><div class="qa-txt" style="color:var(--gray-400);font-style:italic">Generating suggestion...</div></div>';
      }

      // Show unanswered notice
      if (qa.status === 'unanswered' && !qa.participantAnswer) {
        html += '<div class="text-xs" style="color:var(--warn-600);margin-top:6px;margin-left:28px">⚠️ No verbal answer was captured for this question</div>';
      }

      html += '</div>';
      return html;
    };

    const qaHtml = qaCards.length > 0
      ? qaCards.map(renderQAItem).join('')
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
          // Call REST API to stop the bot
          await sessionsApi.stopBot(sessionId);
          // Call WebSocket to trigger summary generation (keep socket open for status/summary messages)
          if (ensureConnected()) {
            socket.endMeeting(sessionId);
          }
          if (durationInterval) clearInterval(durationInterval);
        },
        onSuccess: () => {
          // Don't navigate away — wait for meetingSummary via WebSocket
          // The UI will switch to retro mode when the summary arrives
          const endBtn = el.querySelector('#btn-end-session');
          if (endBtn) endBtn.style.display = 'none';
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
      const message = chatInput.value.trim();
      chatMsgs.innerHTML += '<div class="chat-test-row right"><div class="chat-test-bubble user-bubble">' + message + '</div></div>';
      chatInput.value = '';
      showTypingIndicator();
      if (ensureConnected()) {
        const uiStatus = getUIStatus(session.bot_status);
        if (uiStatus === 'finished') {
          socket.retroChat(sessionId, message);
        } else {
          socket.sendMessage(sessionId, message);
        }
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
          const uiStatus = getUIStatus(session.bot_status);
          if (uiStatus === 'finished') {
            socket.retroChat(sessionId, text);
          } else {
            socket.sendMessage(sessionId, text);
          }
        }
      });
    });
  }

  // Cleanup function
  el._cleanup = () => {
    if (durationInterval) clearInterval(durationInterval);
    stopStatusPolling();
    stopTranscriptPolling();
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  };

  loadSession();
  return el;
}
