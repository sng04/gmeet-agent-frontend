import { navigate } from '../../router.js';
import { Button } from '../../components/ui/Button.js';

const mockSession = {
  id: '1',
  purpose: 'Integration Planning Session',
  project: 'Acme Corp Sales',
  agent: 'TechSales Bot',
  duration: '12 min',
  qaCount: 3,
  participants: 4,
  startDate: 'Mar 17, 2026 · 10:30 AM',
};

const mockQA = [
  { 
    question: 'Can we integrate this with our existing Slack workspace?', 
    hostAnswer: "That's a great question, let me share what our team has prepared — currently Slack isn't in scope but we're exploring webhooks.",
    aiAnswer: 'Currently, the system focuses on Google Meet integration. Slack integration is not in the current scope, but the architecture supports future webhook-based integrations.',
    time: '10:31:05', 
    author: 'James Park · Acme Corp' 
  },
  { 
    question: 'What about the response times we can expect in production?', 
    hostAnswer: 'In production we\'re seeing around 2 to 4 seconds end-to-end, which we think is well within acceptable limits.',
    aiAnswer: 'Our system guarantees sub-3-second question detection and under 10-second response delivery. In production, typical latency is 2–4 seconds end-to-end.',
    time: '10:32:10', 
    author: 'Linda Zhao · Acme Corp' 
  },
  { 
    question: 'Can you confirm which AWS regions you support for APAC customers?', 
    hostAnswer: 'For APAC we\'re on Singapore and Tokyo right now, and Mumbai is available on request.',
    aiAnswer: 'We support ap-southeast-1 (Singapore) and ap-northeast-1 (Tokyo) for APAC customers, with ap-south-1 (Mumbai) available on request.',
    time: '10:38:22', 
    author: 'James Park · Acme Corp' 
  },
];

const mockTranscript = [
  { time: '10:30:15', author: 'Sarah Chen (Host)', text: 'Welcome everyone, thanks for joining. Let\'s get started with the integration review.' },
  { time: '10:30:42', author: 'Sarah Chen (Host)', text: 'I wanted to go through the authentication flow first if that\'s okay.' },
  { time: '10:31:05', author: 'James Park (Acme Corp)', text: 'Sure, sounds good. So my first question is — can we integrate this with our existing Slack workspace?', isQuestion: true },
  { time: '10:31:28', author: 'Sarah Chen (Host)', text: 'That\'s a great question. Let me share what our team has prepared for this.' },
  { time: '10:32:10', author: 'Linda Zhao (Acme Corp)', text: 'Also, what about the response times we can expect in production?', isQuestion: true },
  { time: '10:38:00', author: 'Sarah Chen (Host)', text: 'We also have a question about data residency requirements for APAC region.' },
  { time: '10:38:22', author: 'James Park (Acme Corp)', text: 'Can you confirm which AWS regions you support for APAC customers?', isQuestion: true },
];

export default function LiveSessionPage() {
  const el = document.createElement('div');
  el.className = 'page';

  el.innerHTML = `
    <div class="bc">
      <a href="#" id="back-link">Acme Corp Sales</a>
      <span class="sep">›</span>
      <span class="cur">Live Session</span>
    </div>
    <div class="pg-hdr">
      <div>
        <h1>${mockSession.purpose}</h1>
        <div class="pg-sub">Project: ${mockSession.project}</div>
      </div>
      <div class="pg-actions">
        <div class="mode-toggle" id="session-mode-toggle">
          <button class="mode-btn active" data-mode="live">🔴 Live</button>
          <button class="mode-btn" data-mode="retro">📋 Retro</button>
        </div>
        <div class="conn ok" id="conn-status"><span class="conn-dot"></span> Connected <span class="conn-latency">~42ms · Good</span></div>
        <button class="btn btn-d btn-sm" id="btn-end-session">End Session</button>
      </div>
    </div>
    <div class="sess-meta mb-5">
      <div class="sess-meta-item"><span>🤖</span><strong>Agent:</strong> ${mockSession.agent}</div><div class="sess-meta-div"></div>
      <div class="sess-meta-item"><span>📁</span><strong>Project:</strong> ${mockSession.project}</div><div class="sess-meta-div"></div>
      <div class="sess-meta-item"><span>⏱️</span><strong>Duration:</strong> ${mockSession.duration} (live)</div><div class="sess-meta-div"></div>
      <div class="sess-meta-item"><span>💬</span><strong>Q&A Pairs:</strong> ${mockSession.qaCount}</div><div class="sess-meta-div"></div>
      <div class="sess-meta-item"><span>👥</span><strong>Participants:</strong> ${mockSession.participants}</div><div class="sess-meta-div"></div>
      <div class="sess-meta-item"><span>📅</span><strong>Started:</strong> ${mockSession.startDate}</div><div class="sess-meta-div"></div>
      <div class="sess-meta-item" id="sess-status-badge"><span class="badge b-live"><span class="dot"></span> Live</span></div>
    </div>

    <!-- LIVE MODE -->
    <div class="mode-panel active" id="mode-live">
      <div class="live-layout">
        <div>
          <div class="text-md fw-sb mb-4">Q&amp;A Pairs</div>
          <div id="live-qa-list"></div>
        </div>
        <div>
          <div class="tabs" style="margin-bottom:16px">
            <div class="tab active" data-tab="live-suggest">💡 Suggested Questions</div>
            <div class="tab" data-tab="live-transcript">📝 Live Transcript</div>
          </div>
          <div class="tab-c active" id="tab-live-suggest">
            <div class="card mb-4" style="border-color:var(--pri-200);background:var(--pri-25)">
              <div class="card-body" style="padding:12px 16px">
                <div class="text-xs mono fw-m" style="color:var(--pri-600);margin-bottom:4px">💡 AGENT SUGGESTION</div>
                <div class="text-sm fw-m text-p mb-4">Ask about their disaster recovery requirements — this topic hasn't come up but is likely important for an enterprise client.</div>
                <div class="text-xs text-t">Based on: knowledge gap in <code>Platform Architecture Overview.pdf</code></div>
              </div>
            </div>
            <div class="card mb-4" style="border-color:var(--pri-200);background:var(--pri-25)">
              <div class="card-body" style="padding:12px 16px">
                <div class="text-xs mono fw-m" style="color:var(--pri-600);margin-bottom:4px">💡 AGENT SUGGESTION</div>
                <div class="text-sm fw-m text-p mb-4">Clarify their expected user volume — concurrent session limits haven't been confirmed against their actual scale.</div>
                <div class="text-xs text-t">Based on: session context + <code>API Reference Guide.docx</code></div>
              </div>
            </div>
            <div class="card mb-4" style="border-color:var(--warn-100);background:var(--warn-50)">
              <div class="card-body" style="padding:12px 16px">
                <div class="text-xs mono fw-m" style="color:var(--warn-700);margin-bottom:4px">⚠️ KNOWLEDGE GAP</div>
                <div class="text-sm fw-m text-p mb-4">SLA terms and uptime guarantees are not covered in any document — if asked, the agent cannot answer confidently.</div>
                <div class="text-xs text-t">Missing from: all indexed documents</div>
              </div>
            </div>
            <div class="card" style="border-color:var(--warn-100);background:var(--warn-50)">
              <div class="card-body" style="padding:12px 16px">
                <div class="text-xs mono fw-m" style="color:var(--warn-700);margin-bottom:4px">⚠️ KNOWLEDGE GAP</div>
                <div class="text-sm fw-m text-p mb-4">Pricing and contract terms have not been discussed. No pricing document is indexed for this project.</div>
                <div class="text-xs text-t">Missing from: all indexed documents</div>
              </div>
            </div>
          </div>
          <div class="tab-c" id="tab-live-transcript">
            <div class="card">
              <div class="card-hdr"><div class="text-md fw-sb">Live Transcript</div><div class="text-xs text-t">Speech-to-text · auto-scroll</div></div>
              <div class="card-body" style="max-height:500px;overflow-y:auto">
                <div class="tscript" id="live-transcript"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- RETRO MODE -->
    <div class="mode-panel" id="mode-retro">
      <div class="retro-layout">
        <div>
          <div class="tabs">
            <div class="tab active" data-tab="retro-qna">💬 Q&A Pairs</div>
            <div class="tab" data-tab="retro-transcript">📝 Full Transcript</div>
          </div>
          <div class="tab-c active" id="tab-retro-qna">
            <div id="retro-qa-list"></div>
          </div>
          <div class="tab-c" id="tab-retro-transcript">
            <div class="card">
              <div class="card-hdr"><div class="text-md fw-sb">Full Transcript</div><div class="text-xs text-t">Raw speech-to-text output · ${mockTranscript.length} entries</div></div>
              <div class="card-body">
                <div class="tscript" id="retro-transcript"></div>
              </div>
            </div>
          </div>
        </div>
        <div class="ai-chat-panel">
          <div class="ai-chat-hdr">
            <div style="background:var(--pri-50);color:var(--pri-500);width:30px;height:30px;border-radius:6px;display:grid;place-items:center;font-size:14px;flex-shrink:0">🤖</div>
            <div>
              <div class="ai-chat-title">AI Chat</div>
              <div class="ai-chat-sub">Ask about this session</div>
            </div>
          </div>
          <div class="ai-chat-msgs" id="chat-msgs">
            <div class="chat-msg ai"><div class="chat-label">MeetAgent AI</div>Hi! I've analyzed this session so far. Ask me about the Q&A, what's been covered, or anything from the transcript.</div>
          </div>
          <div class="ai-chat-suggested">
            <button class="ai-chip">Key themes?</button>
            <button class="ai-chip">Draft follow-up email</button>
            <button class="ai-chip">What was missed?</button>
          </div>
          <div class="ai-chat-input">
            <input placeholder="Ask about this session..." id="chat-input">
            <button id="chat-send">➤</button>
          </div>
        </div>
      </div>
    </div>
  `;

  el.querySelector('#back-link').addEventListener('click', (e) => {
    e.preventDefault();
    navigate('project-detail');
  });

  // Session mode toggle (Live/Retro)
  el.querySelectorAll('#session-mode-toggle .mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      el.querySelectorAll('#session-mode-toggle .mode-btn').forEach(b => b.classList.remove('active'));
      el.querySelectorAll('.mode-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      el.querySelector(`#mode-${btn.dataset.mode}`).classList.add('active');
      
      // Update connection status visibility
      const connStatus = el.querySelector('#conn-status');
      const endBtn = el.querySelector('#btn-end-session');
      if (btn.dataset.mode === 'retro') {
        connStatus.style.display = 'none';
        endBtn.style.display = 'none';
      } else {
        connStatus.style.display = '';
        endBtn.style.display = '';
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
      contentContainer.querySelector(`#tab-${tab.dataset.tab}`).classList.add('active');
    });
  });

  // End session button
  el.querySelector('#btn-end-session').addEventListener('click', () => {
    if (confirm('End this session?')) {
      el.querySelector('#session-mode-toggle .mode-btn[data-mode="retro"]').click();
    }
  });

  // Render Q&A lists
  const renderQAItem = (qa) => `
    <div class="qa">
      <div class="flex jc-b items-s mb-4">
        <div class="text-xs text-t mono">${qa.time}</div>
      </div>
      <div class="qa-q"><div class="qi">Q</div><div class="qa-txt q"><span class="qna-author client" style="font-size:10px;margin-right:6px">${qa.author}</span>${qa.question}</div></div>
      <div class="qa-a mt-2"><div class="ai">A</div><div class="qa-txt"><span class="qna-author" style="font-size:10px;margin-right:6px;background:var(--pri-50);color:var(--pri-700)">Sarah Chen</span>${qa.hostAnswer}</div></div>
      <div class="qa-a mt-2"><div class="ai" style="background:var(--gray-100);color:var(--gray-600)">AI</div><div class="qa-txt" style="color:var(--gray-500)">${qa.aiAnswer}</div></div>
      <div class="audio-row"><button class="audio-btn">🔊 Listen</button><span class="audio-status">Audio available</span></div>
    </div>
  `;

  el.querySelector('#live-qa-list').innerHTML = mockQA.map(renderQAItem).join('');
  el.querySelector('#retro-qa-list').innerHTML = mockQA.map(renderQAItem).join('');

  // Render transcripts
  const renderTranscriptItem = (item) => `
    <div class="tscript-item${item.isQuestion ? ' question' : ''}">
      <div class="ts-author">${item.author}</div>
      <div class="ts">${item.time}</div>
      ${item.text}
      ${item.isQuestion ? '<div class="text-xs fw-m mt-1" style="color:var(--warn-600)">⚡ Question detected</div>' : ''}
    </div>
  `;

  el.querySelector('#live-transcript').innerHTML = mockTranscript.map(renderTranscriptItem).join('');
  el.querySelector('#retro-transcript').innerHTML = mockTranscript.map(renderTranscriptItem).join('');

  // Audio buttons
  el.querySelectorAll('.audio-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const isPlaying = btn.classList.contains('playing');
      el.querySelectorAll('.audio-btn').forEach(b => {
        b.classList.remove('playing');
        b.textContent = '🔊 Listen';
        const st = b.closest('.qa')?.querySelector('.audio-status');
        if (st) st.textContent = 'Audio available';
      });
      if (!isPlaying) {
        btn.classList.add('playing');
        btn.textContent = '⏹ Stop';
        const st = btn.closest('.qa')?.querySelector('.audio-status');
        if (st) st.textContent = 'Playing audio...';
      }
    });
  });

  // Chat
  const chatInput = el.querySelector('#chat-input');
  const chatMsgs = el.querySelector('#chat-msgs');
  
  const sendChat = () => {
    if (!chatInput.value.trim()) return;
    chatMsgs.innerHTML += `<div class="chat-msg user">${chatInput.value}</div>`;
    const q = chatInput.value;
    chatInput.value = '';
    setTimeout(() => {
      chatMsgs.innerHTML += `<div class="chat-msg ai"><div class="chat-label">MeetAgent AI</div>Based on the session data for: ${q.toLowerCase()} — the session captured ${mockSession.qaCount} Q&A pairs across the integration planning discussion.</div>`;
      chatMsgs.scrollTop = chatMsgs.scrollHeight;
    }, 700);
  };

  el.querySelector('#chat-send').addEventListener('click', sendChat);
  chatInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendChat(); });

  // Suggested chips
  const aiResponses = {
    'Key themes?': 'The main themes were: Slack integration feasibility, production response times (2–4s), and AWS region support for APAC (Singapore, Tokyo, Mumbai on request).',
    'Draft follow-up email': 'Subject: Follow-up from Integration Planning\n\nHi Team,\n\nThank you for the productive session today. Key topics covered: Slack integration roadmap, latency expectations, and APAC region support.\n\nBest, Sarah',
    'What was missed?': 'Authentication flow — which Sarah mentioned at the start — hasn\'t been fully covered. Also, disaster recovery and SLA terms haven\'t been discussed yet.'
  };

  el.querySelectorAll('.ai-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const text = chip.textContent;
      chatMsgs.innerHTML += `<div class="chat-msg user">${text}</div>`;
      setTimeout(() => {
        chatMsgs.innerHTML += `<div class="chat-msg ai"><div class="chat-label">MeetAgent AI</div>${aiResponses[text] || 'Analyzing the session data...'}</div>`;
        chatMsgs.scrollTop = chatMsgs.scrollHeight;
      }, 600);
    });
  });

  return el;
}
