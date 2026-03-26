import { loadTemplate } from '../../utils/template.js';
import { navigate } from '../../router.js';

const mockSession = {
  id: '2',
  purpose: 'Q3 Technical Architecture Review',
  project: 'Acme Corp Sales',
  agent: 'TechSales Bot',
  duration: '47 min',
  date: 'Mar 15, 2026',
  qaCount: 8,
  participants: 5,
  startTime: 'Mar 15, 2026 · 09:00 AM',
  endTime: 'Mar 15, 2026 · 09:47 AM',
  score: '8.2/10',
};

const mockQA = [
  {
    question: 'What kind of encryption do you use for data at rest?',
    hostAnswer: 'We use AES-256 via AWS KMS, keys rotated annually.',
    aiAnswer: 'We use AES-256 encryption for all data at rest, managed through AWS KMS. All keys are rotated annually.',
    confidence: 92,
    time: '09:05:32',
    author: 'David Wu · Acme Corp'
  },
  {
    question: 'How does the system handle concurrent users at scale?',
    hostAnswer: 'Through ECS Fargate auto-scaling. We support up to 500 concurrent sessions.',
    aiAnswer: 'Our system uses auto-scaling through ECS Fargate, supporting up to 500 concurrent sessions with sub-3-second latency.',
    confidence: 88,
    time: '09:12:18',
    author: 'Linda Zhao · Acme Corp'
  },
];

const mockTranscript = [
  { time: '09:00:15', author: 'Sarah Chen (Host)', text: 'Welcome everyone, thanks for joining. Let\'s get started with the Q3 architecture review.' },
  { time: '09:00:42', author: 'Sarah Chen (Host)', text: 'I wanted to go through the authentication flow first.' },
  { time: '09:05:32', author: 'David Wu (Acme Corp)', text: 'What kind of encryption do you use for data at rest?', isQuestion: true },
  { time: '09:05:55', author: 'Sarah Chen (Host)', text: 'We use AES-256 via AWS KMS, keys rotated annually.' },
  { time: '09:12:18', author: 'Linda Zhao (Acme Corp)', text: 'How does the system handle concurrent users at scale?', isQuestion: true },
  { time: '09:13:00', author: 'Sarah Chen (Host)', text: 'Through ECS Fargate auto-scaling. We support up to 500 concurrent sessions.' },
];

export default async function RetroSessionController(params) {
  const el = await loadTemplate('/templates/user/retro-session.html', 'retro-session');

  // Populate data-bind elements
  el.querySelector('[data-bind="purpose"]').textContent = mockSession.purpose;
  el.querySelector('[data-bind="project"]').textContent = mockSession.project;
  el.querySelector('[data-bind="date"]').textContent = mockSession.date;
  el.querySelector('[data-bind="metaAgent"]').textContent = mockSession.agent;
  el.querySelector('[data-bind="metaProject"]').textContent = mockSession.project;
  el.querySelector('[data-bind="metaDuration"]').textContent = mockSession.duration;
  el.querySelector('[data-bind="metaQA"]').textContent = mockSession.qaCount;
  el.querySelector('[data-bind="metaParticipants"]').textContent = mockSession.participants;
  el.querySelector('[data-bind="metaStarted"]').textContent = mockSession.startTime;
  el.querySelector('[data-bind="metaEnded"]').textContent = mockSession.endTime;
  el.querySelector('[data-bind="metaScore"]').textContent = mockSession.score;
  el.querySelector('[data-bind="summaryBody"]').textContent = `The Q3 Architecture Review covered encryption standards, scalability, and compliance. The team handled technical questions well, with the agent providing accurate supplemental information on AES-256 encryption and auto-scaling. Client expressed satisfaction with the security approach.`;
  el.querySelector('[data-bind="insightsBody"]').innerHTML = `Overall meeting effectiveness: <strong>${mockSession.score}</strong>. Question response accuracy was high. Client engagement was strong throughout with ${mockSession.qaCount} detected questions. ${mockSession.participants} participants joined the session.`;
  el.querySelector('[data-bind="qaCountText"]').textContent = `Showing ${mockQA.length} of ${mockSession.qaCount} pairs`;

  // Q&A list
  const qaList = el.querySelector('[data-bind="qaList"]');
  mockQA.forEach(qa => {
    const item = document.createElement('div');
    item.className = 'qa';
    item.innerHTML = `
      <div class="flex jc-b items-s mb-4">
        <div class="text-xs text-t mono">${qa.time}</div>
        <span class="badge ${qa.confidence >= 90 ? 'b-ok' : 'b-warn'}">${qa.confidence}%</span>
      </div>
      <div class="qa-q"><div class="qi">Q</div><div class="qa-txt q"><span class="qna-author client" style="font-size:10px;margin-right:6px">${qa.author}</span>${qa.question}</div></div>
      <div class="qa-a mt-2"><div class="ai">A</div><div class="qa-txt"><span class="qna-author" style="font-size:10px;margin-right:6px;background:var(--pri-50);color:var(--pri-700)">Sarah Chen</span>${qa.hostAnswer}</div></div>
      <div class="qa-a mt-2"><div class="ai" style="background:var(--gray-100);color:var(--gray-600)">AI</div><div class="qa-txt" style="color:var(--gray-500)">${qa.aiAnswer}</div></div>
      <div class="audio-row"><button class="audio-btn">🔊 Listen</button><span class="audio-status">Audio available</span></div>
    `;
    qaList.appendChild(item);
  });

  // Transcript
  const transcript = el.querySelector('[data-bind="transcript"]');
  mockTranscript.forEach(item => {
    const div = document.createElement('div');
    div.className = `tscript-item${item.isQuestion ? ' question' : ''}`;
    div.innerHTML = `
      <div class="ts-author">${item.author}</div>
      <div class="ts">${item.time}</div>
      ${item.text}
      ${item.isQuestion ? '<div class="text-xs fw-m mt-1" style="color:var(--warn-600)">⚡ Question detected</div>' : ''}
    `;
    transcript.appendChild(div);
  });

  // Breadcrumb navigation
  el.querySelector('[data-action="backProject"]').addEventListener('click', (e) => {
    e.preventDefault();
    navigate('project-detail');
  });
  el.querySelector('[data-action="backSessions"]').addEventListener('click', (e) => {
    e.preventDefault();
    navigate('project-detail');
  });

  // Tabs
  el.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      el.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      el.querySelectorAll('.tab-c').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      el.querySelector(`#tab-${tab.dataset.tab}`).classList.add('active');
    });
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

  const aiResponses = {
    'Key themes?': 'The main themes were: encryption standards (AES-256), scalability architecture (ECS Fargate), and compliance requirements. The client showed strong interest in data residency.',
    'Draft follow-up email': 'Subject: Follow-up from Q3 Architecture Review\n\nHi Team,\n\nThank you for the productive session today. Key next steps: (1) Share compliance certs by Friday, (2) Schedule integration demo, (3) Prepare SLA proposal.\n\nBest, Sarah',
    'What was missed?': 'Two key items were not fully covered: (1) Disaster recovery and failover strategy, and (2) SLA terms — these should be addressed in the follow-up meeting.'
  };

  const sendChat = () => {
    if (!chatInput.value.trim()) return;
    chatMsgs.innerHTML += `<div class="chat-msg user">${chatInput.value}</div>`;
    const q = chatInput.value;
    chatInput.value = '';
    setTimeout(() => {
      chatMsgs.innerHTML += `<div class="chat-msg ai"><div class="chat-label">MeetAgent AI</div>Based on the transcript, ${q.toLowerCase()} — I can see several relevant points from the session. The agent captured ${mockSession.qaCount} Q&A pairs with an average confidence of 88%.</div>`;
      chatMsgs.scrollTop = chatMsgs.scrollHeight;
    }, 700);
  };

  el.querySelector('[data-action="chatSend"]').addEventListener('click', sendChat);
  chatInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendChat(); });

  el.querySelectorAll('.ai-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const text = chip.textContent;
      chatMsgs.innerHTML += `<div class="chat-msg user">${text}</div>`;
      setTimeout(() => {
        chatMsgs.innerHTML += `<div class="chat-msg ai"><div class="chat-label">MeetAgent AI</div>${(aiResponses[text] || 'Analyzing the session data...').replace(/\n/g, '<br>')}</div>`;
        chatMsgs.scrollTop = chatMsgs.scrollHeight;
      }, 600);
    });
  });

  return el;
}
