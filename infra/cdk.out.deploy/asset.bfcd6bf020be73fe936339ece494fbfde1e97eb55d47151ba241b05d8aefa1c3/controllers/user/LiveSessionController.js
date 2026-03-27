import { loadTemplate } from '../../utils/template.js';
import { navigate } from '../../router.js';

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

export default async function LiveSessionController(params) {
  const el = await loadTemplate('/templates/user/live-session.html', 'live-session');

  // Populate data-bind elements
  el.querySelector('[data-bind="purpose"]').textContent = mockSession.purpose;
  el.querySelector('[data-bind="project"]').textContent = mockSession.project;
  el.querySelector('[data-bind="metaAgent"]').textContent = mockSession.agent;
  el.querySelector('[data-bind="metaProject"]').textContent = mockSession.project;
  el.querySelector('[data-bind="metaDuration"]').textContent = `${mockSession.duration} (live)`;
  el.querySelector('[data-bind="metaQA"]').textContent = mockSession.qaCount;
  el.querySelector('[data-bind="metaParticipants"]').textContent = mockSession.participants;
  el.querySelector('[data-bind="metaStarted"]').textContent = mockSession.startDate;
  el.querySelector('[data-bind="retroTranscriptCount"]').textContent = mockTranscript.length;

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

  el.querySelector('[data-bind="liveQaList"]').innerHTML = mockQA.map(renderQAItem).join('');
  el.querySelector('[data-bind="retroQaList"]').innerHTML = mockQA.map(renderQAItem).join('');

  // Render transcripts
  const renderTranscriptItem = (item) => `
    <div class="tscript-item${item.isQuestion ? ' question' : ''}">
      <div class="ts-author">${item.author}</div>
      <div class="ts">${item.time}</div>
      ${item.text}
      ${item.isQuestion ? '<div class="text-xs fw-m mt-1" style="color:var(--warn-600)">⚡ Question detected</div>' : ''}
    </div>
  `;

  el.querySelector('[data-bind="liveTranscript"]').innerHTML = mockTranscript.map(renderTranscriptItem).join('');
  el.querySelector('[data-bind="retroTranscript"]').innerHTML = mockTranscript.map(renderTranscriptItem).join('');

  // Breadcrumb back
  el.querySelector('[data-action="backNav"]').addEventListener('click', (e) => {
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

  // Audio buttons
  el.addEventListener('click', (e) => {
    const btn = e.target.closest('.audio-btn');
    if (!btn) return;
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

  // Chat
  const chatInput = el.querySelector('[data-bind="chatInput"]');
  const chatMsgs = el.querySelector('[data-bind="chatMsgs"]');

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

  el.querySelector('[data-action="chatSend"]').addEventListener('click', sendChat);
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
