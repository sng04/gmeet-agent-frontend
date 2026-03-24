import { navigate } from '../../router.js';

export default function AgentEditPage() {
  const el = document.createElement('div');
  el.className = 'page';

  el.innerHTML = `
    <div class="bc">
      <a href="#" class="nav-back" data-to="agents">Agents</a>
      <span class="sep">›</span>
      <a href="#" class="nav-back" data-to="agent-detail">TechSales Bot</a>
      <span class="sep">›</span>
      <span class="cur">Edit</span>
    </div>
    <div class="pg-hdr">
      <div>
        <h1>Edit Agent</h1>
        <div class="pg-sub">TechSales Bot</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:start">
      <div class="card">
        <div class="card-hdr"><div class="text-md fw-sb">Configuration</div></div>
        <div class="card-body">
          <div class="form-g">
            <label class="form-l">Agent Name</label>
            <input class="form-i" value="TechSales Bot">
          </div>
          <div class="divider"></div>
          <div class="form-g">
            <label class="form-l">Agent Objectives</label>
            <textarea class="form-ta" rows="3">Answer technical questions about product capabilities, pricing, and integrations accurately and concisely.</textarea>
          </div>
          <div class="form-g">
            <label class="form-l">Behavioral Guidelines</label>
            <textarea class="form-ta" rows="3">Always be professional. Do not speculate outside the knowledge base. Cite source documents when applicable.</textarea>
          </div>
          <div class="form-g">
            <label class="form-l">Personality Traits</label>
            <input class="form-i" value="Professional, concise, confident">
          </div>
          <div class="form-g">
            <label class="form-l">Answering Tone</label>
            <select class="form-sel">
              <option selected>Professional and neutral</option>
              <option>Friendly and approachable</option>
              <option>Concise and direct</option>
            </select>
          </div>
          <div class="form-g">
            <label class="form-l">Role</label>
            <textarea class="form-ta" rows="6">You are TechSales Bot, a professional AI meeting assistant. Your objective is to answer technical questions accurately using the provided knowledge base. Always respond concisely and professionally. Reference specific documentation when possible. Do not speculate beyond provided context.</textarea>
            <div class="form-h">Defines who the agent is and how it behaves. Changes apply within 5 seconds of saving.</div>
          </div>
          <div class="divider"></div>
          <div class="form-g">
            <label class="form-l">Skill Buckets <span style="font-weight:400;color:var(--gray-400)">(optional)</span></label>
            <div style="border:1px solid var(--gray-200);border-radius:8px;overflow:hidden">
              <div style="padding:8px 12px;background:var(--gray-25);border-bottom:1px solid var(--gray-100);font-size:11px;color:var(--gray-500)">Hold Ctrl / Cmd to select multiple</div>
              <select class="form-sel" multiple size="4" style="border:none;border-radius:0;padding:0;background:var(--white);height:auto;appearance:auto;background-image:none">
                <option value="sales-skills" selected style="padding:10px 14px;font-size:13px">⚡ Sales Skills · real-time · prefix: sales-skills</option>
                <option value="summary-skills" style="padding:10px 14px;font-size:13px">⚡ Meeting Summary Skills · post-session · prefix: summary-skills</option>
              </select>
            </div>
            <div class="form-h">Skill bucket instructions will be injected alongside this agent's role during sessions.</div>
          </div>
          <div class="flex gap-3 jc-b mt-4">
            <button class="btn btn-s" id="cancel-btn">Cancel</button>
            <button class="btn btn-warn" id="load-test-btn">Load to Test →</button>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-hdr">
          <div class="text-md fw-sb">Test Prompt</div>
          <div class="text-xs text-t">Loaded from draft — not saved yet</div>
        </div>
        <div class="chat-test-panel" style="border:none;border-radius:0">
          <div class="chat-test-msgs" id="test-msgs">
            <div class="chat-test-item ai"><div class="agent-lbl">TechSales Bot</div>Hello! I'm TechSales Bot. Click "Load to Test" after editing the role to preview changes here.</div>
          </div>
          <div class="chat-test-input">
            <input type="text" placeholder="Type a test question..." id="test-input">
            <button id="test-send">Send</button>
          </div>
        </div>
        <div class="card-foot" style="display:flex;justify-content:flex-end;gap:12px">
          <button class="btn btn-s" id="discard-btn">Discard</button>
          <button class="btn btn-p" id="save-btn">Save Changes</button>
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

  el.querySelector('#cancel-btn').addEventListener('click', () => navigate('agent-detail'));
  el.querySelector('#discard-btn').addEventListener('click', () => navigate('agent-detail'));
  el.querySelector('#save-btn').addEventListener('click', () => navigate('agent-detail'));

  // Test chat
  const testInput = el.querySelector('#test-input');
  const testMsgs = el.querySelector('#test-msgs');
  el.querySelector('#test-send').addEventListener('click', () => {
    if (!testInput.value.trim()) return;
    testMsgs.innerHTML += `<div class="chat-test-item user">${testInput.value}</div>`;
    testMsgs.innerHTML += `<div class="chat-test-item ai"><div class="agent-lbl">TechSales Bot</div>Based on the configured knowledge base, I can confirm that our platform uses AES-256 encryption at rest via AWS KMS.</div>`;
    testInput.value = '';
    testMsgs.scrollTop = testMsgs.scrollHeight;
  });

  return el;
}
