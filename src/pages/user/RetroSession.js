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

export default function RetroSessionPage() {
  const el = document.createElement('div');
  el.className = 'page';

  el.innerHTML = `
    <div class="bc">
      <a href="#" id="back-project">Acme Corp Sales</a>
      <span class="sep">›</span>
      <a href="#" id="back-sessions">Sessions</a>
      <span class="sep">›</span>
      <span class="cur">Retrospective</span>
    </div>
    <div class="pg-hdr">
      <div>
        <h1>${mockSession.purpose}</h1>
        <div class="pg-sub">Project: ${mockSession.project} · Completed ${mockSession.date}</div>
      </div>
      <div class="pg-actions">
        <span class="badge b-summary"><span class="dot"></span> Finished</span>
      </div>
    </div>
    <div class="sess-meta mb-5">
      <div class="sess-meta-item"><span>🤖</span><strong>Agent:</strong> ${mockSession.agent}</div><div class="sess-meta-div"></div>
      <div class="sess-meta-item"><span>📁</span><strong>Project:</strong> ${mockSession.project}</div><div class="sess-meta-div"></div>
      <div class="sess-meta-item"><span>⏱️</span><strong>Duration:</strong> ${mockSession.duration}</div><div class="sess-meta-div"></div>
      <div class="sess-meta-item"><span>💬</span><strong>Q&A:</strong> ${mockSession.qaCount} pairs</div><div class="sess-meta-div"></div>
      <div class="sess-meta-item"><span>👥</span><strong>Participants:</strong> ${mockSession.participants}</div><div class="sess-meta-div"></div>
      <div class="sess-meta-item"><span>📅</span><strong>Started:</strong> ${mockSession.startTime}</div><div class="sess-meta-div"></div>
      <div class="sess-meta-item"><span>🏁</span><strong>Ended:</strong> ${mockSession.endTime}</div><div class="sess-meta-div"></div>
      <div class="sess-meta-item"><span>📊</span><strong>Score:</strong> ${mockSession.score}</div>
    </div>
    <div class="retro-layout">
      <div>
        <div class="tabs" id="tabs">
          <div class="tab active" data-tab="summary">📋 Summary</div>
          <div class="tab" data-tab="qa">💬 Q&A Pairs</div>
          <div class="tab" data-tab="transcript">📝 Full Transcript</div>
        </div>
        <div class="tab-c active" id="tab-summary">
          <div class="retro-s">
            <div class="retro-s-hdr">
              <div class="retro-s-icon" style="background:var(--pri-50);color:var(--pri-500)">📋</div>
              <div class="retro-s-title">Meeting Summary</div>
            </div>
            <div class="retro-s-body">
              <p style="font-size:13px;color:var(--gray-600);line-height:1.6">The Q3 Architecture Review covered encryption standards, scalability, and compliance. The team handled technical questions well, with the agent providing accurate supplemental information on AES-256 encryption and auto-scaling. Client expressed satisfaction with the security approach.</p>
            </div>
          </div>
          <div class="retro-s">
            <div class="retro-s-hdr">
              <div class="retro-s-icon" style="background:var(--warn-50);color:var(--warn-500)">💡</div>
              <div class="retro-s-title">Areas for Improvement</div>
            </div>
            <div class="retro-s-body">
              <ul>
                <li>Prepare a one-pager on compliance certifications for future meetings</li>
                <li>Include latency benchmarks in the demo materials</li>
                <li>Consider adding a live architecture diagram walkthrough</li>
              </ul>
            </div>
          </div>
          <div class="retro-s">
            <div class="retro-s-hdr">
              <div class="retro-s-icon" style="background:var(--err-50);color:var(--err-500)">⚠️</div>
              <div class="retro-s-title">Missed Agenda Items</div>
            </div>
            <div class="retro-s-body">
              <ul>
                <li>Disaster recovery and failover strategy was not discussed</li>
                <li>SLA terms were mentioned briefly but not covered in detail</li>
              </ul>
            </div>
          </div>
          <div class="retro-s">
            <div class="retro-s-hdr">
              <div class="retro-s-icon" style="background:var(--ok-50);color:var(--ok-500)">✅</div>
              <div class="retro-s-title">Action Items / Next Steps</div>
            </div>
            <div class="retro-s-body">
              <ul>
                <li><strong>Sarah:</strong> Send compliance certification documents to Acme by Friday</li>
                <li><strong>Mike:</strong> Schedule follow-up demo for integration team</li>
                <li><strong>Sarah:</strong> Prepare SLA proposal document</li>
              </ul>
            </div>
          </div>
          <div class="retro-s">
            <div class="retro-s-hdr">
              <div class="retro-s-icon" style="background:var(--info-50);color:var(--info-500)">📊</div>
              <div class="retro-s-title">Session Insights</div>
            </div>
            <div class="retro-s-body">
              <p style="font-size:13px;color:var(--gray-600);line-height:1.6">Overall meeting effectiveness: <strong>${mockSession.score}</strong>. Question response accuracy was high. Client engagement was strong throughout with ${mockSession.qaCount} detected questions. ${mockSession.participants} participants joined the session.</p>
            </div>
          </div>
        </div>
        <div class="tab-c" id="tab-qa">
          <div id="qa-list"></div>
          <div class="text-xs text-t" style="text-align:center;padding:12px">Showing 2 of ${mockSession.qaCount} pairs</div>
        </div>
        <div class="tab-c" id="tab-transcript">
          <div class="card">
            <div class="card-hdr">
              <div class="text-md fw-sb">Full Transcript</div>
              <div class="text-xs text-t">Raw speech-to-text output</div>
            </div>
            <div class="card-body">
              <div class="tscript" id="transcript"></div>
            </div>
          </div>
        </div>
      </div>
      <div class="ai-chat-panel">
        <div class="ai-chat-hdr">
          <div style="background:var(--pri-50);color:var(--pri-500);width:30px;height:30px;border-radius:6px;display:grid;place-items:center;font-size:14px;flex-shrink:0">🤖</div>
          <div>
            <div class="ai-chat-title">AI Chat</div>
            <div class="ai-chat-sub">Ask about this meeting</div>
          </div>
        </div>
        <div class="ai-chat-msgs" id="chat-msgs">
          <div class="chat-msg ai"><div class="chat-label">MeetAgent AI</div>Hi Sarah! I've analyzed the Q3 Architecture Review session. You can ask me about key themes, missed points, or anything from the transcript.</div>
        </div>
        <div class="ai-chat-suggested">
          <button class="ai-chip">Key themes?</button>
          <button class="ai-chip">Draft follow-up email</button>
          <button class="ai-chip">What was missed?</button>
        </div>
        <div class="ai-chat-input">
          <input placeholder="Ask about this meeting..." id="chat-input">
          <button id="chat-send">➤</button>
        </div>
      </div>
    </div>
  `;

  el.querySelector('#back-project').addEventListener('click', (e) => {
    e.preventDefault();
    navigate('project-detail');
  });

  el.querySelector('#back-sessions').addEventListener('click', (e) => {
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

  // Q&A list
  const qaList = el.querySelector('#qa-list');
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
  const transcript = el.querySelector('#transcript');
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

  el.querySelector('#chat-send').addEventListener('click', sendChat);
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
