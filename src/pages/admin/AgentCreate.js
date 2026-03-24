import { navigate } from '../../router.js';

export default function AgentCreatePage() {
  const el = document.createElement('div');
  el.className = 'page';

  el.innerHTML = `
    <div class="bc">
      <a href="#" class="nav-back" data-to="agents">Agents</a>
      <span class="sep">›</span>
      <span class="cur">New Agent</span>
    </div>
    <div class="pg-hdr">
      <div>
        <h1>Create New Agent</h1>
        <div class="pg-sub">Configure a new meeting agent instance</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:start">
      <div class="card">
        <div class="card-hdr"><div class="text-md fw-sb">Agent Configuration</div></div>
        <div class="card-body">
          <div class="form-g">
            <label class="form-l">Agent Name <span class="req">*</span></label>
            <input class="form-i" placeholder="e.g. TechSales Bot">
          </div>
          <div class="divider"></div>
          <div class="form-g">
            <label class="form-l">Agent Objectives</label>
            <textarea class="form-ta" rows="3" placeholder="e.g. Answer technical questions accurately, focus on product capabilities and pricing..."></textarea>
          </div>
          <div class="form-g">
            <label class="form-l">Behavioral Guidelines</label>
            <textarea class="form-ta" rows="3" placeholder="e.g. Always be professional. Do not speculate. Cite sources when possible..."></textarea>
          </div>
          <div class="form-g">
            <label class="form-l">Personality Traits</label>
            <input class="form-i" placeholder="e.g. Professional, concise, confident">
          </div>
          <div class="form-g">
            <label class="form-l">Answering Tone</label>
            <select class="form-sel">
              <option>Professional and neutral</option>
              <option>Friendly and approachable</option>
              <option>Concise and direct</option>
              <option>Detailed and thorough</option>
            </select>
          </div>
          <div class="form-g">
            <label class="form-l">Role</label>
            <textarea class="form-ta" rows="6" placeholder="Describe the agent's role and how it should behave in meetings..."></textarea>
            <div class="form-h">Defines who the agent is and how it behaves. Auto-generated from the fields above, or write manually.</div>
          </div>
          <div class="divider"></div>
          <div class="form-g">
            <label class="form-l">Skill Buckets <span style="font-weight:400;color:var(--gray-400)">(optional)</span></label>
            <div style="border:1px solid var(--gray-200);border-radius:8px;overflow:hidden">
              <div style="padding:8px 12px;background:var(--gray-25);border-bottom:1px solid var(--gray-100);font-size:11px;color:var(--gray-500)">Hold Ctrl / Cmd to select multiple</div>
              <select class="form-sel" multiple size="4" style="border:none;border-radius:0;padding:0;background:var(--white);height:auto;appearance:auto;background-image:none">
                <option value="sales-skills" style="padding:10px 14px;font-size:13px">⚡ Sales Skills · real-time · prefix: sales-skills</option>
                <option value="summary-skills" style="padding:10px 14px;font-size:13px">⚡ Meeting Summary Skills · post-session · prefix: summary-skills</option>
              </select>
            </div>
            <div class="form-h">Skill bucket instructions will be injected alongside this agent's role during sessions.</div>
          </div>
        </div>
      </div>
      <div>
        <div class="card mb-4">
          <div class="card-hdr">
            <div class="text-md fw-sb">Test Prompt (Preview)</div>
            <div class="text-xs text-t">Chat as if you're the client</div>
          </div>
          <div class="chat-test-panel" style="border:none;border-radius:0">
            <div class="chat-test-msgs" id="test-msgs">
              <div class="chat-test-item ai"><div class="agent-lbl">New Agent</div>Hello! I'm your meeting assistant. Ask me a technical question to test my configuration.</div>
            </div>
            <div class="chat-test-input">
              <input type="text" placeholder="Type a test question..." id="test-input">
              <button id="test-send">Send</button>
            </div>
          </div>
        </div>
        <div class="flex gap-3 jc-end">
          <button class="btn btn-s btn-lg" id="cancel-btn">Cancel</button>
          <button class="btn btn-p btn-lg" id="create-btn">Create Agent →</button>
        </div>
      </div>
    </div>
  `;

  el.querySelectorAll('.nav-back').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      navigate(link.dataset.to);
    });
  });

  el.querySelector('#cancel-btn').addEventListener('click', () => navigate('agents'));
  el.querySelector('#create-btn').addEventListener('click', () => navigate('agent-detail'));

  // Test chat
  const testInput = el.querySelector('#test-input');
  const testMsgs = el.querySelector('#test-msgs');
  el.querySelector('#test-send').addEventListener('click', () => {
    if (!testInput.value.trim()) return;
    testMsgs.innerHTML += `<div class="chat-test-item user">${testInput.value}</div>`;
    testMsgs.innerHTML += `<div class="chat-test-item ai"><div class="agent-lbl">New Agent</div>Based on the configured knowledge base, I can help you with that question...</div>`;
    testInput.value = '';
    testMsgs.scrollTop = testMsgs.scrollHeight;
  });

  return el;
}
