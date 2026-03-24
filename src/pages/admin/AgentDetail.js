import { Button } from '../../components/ui/Button.js';
import { navigate } from '../../router.js';

const mockAgent = {
  id: '1',
  name: 'TechSales Bot',
  status: 'enabled',
  projects: 2,
  lastActive: '1 hour ago',
  lastUpdated: 'Mar 15, 2026 at 16:20',
  updatedBy: 'Richie Tan',
  personality: 'Professional, concise, confident',
  tone: 'Professional and neutral',
  role: `You are TechSales Bot, a professional AI meeting assistant. Your objective is to answer technical questions accurately using the provided knowledge base. Always respond concisely and professionally. Reference specific documentation when possible. Do not speculate beyond provided context.`,
};

const mockRoleHistory = [
  { version: 'v2', date: 'Mar 10, 2026 · 11:05', author: 'Richie Tan', role: 'You are TechSales Bot. Answer questions accurately and professionally based on provided documents. Do not guess.' },
  { version: 'v1', date: 'Mar 5, 2026 · 09:30', author: 'Richie Tan', role: 'You are a helpful meeting assistant. Answer questions based on the knowledge base.' },
];

const mockProjects = [
  { name: 'Acme Corp Sales', sessions: 12, users: 4, status: 'active' },
  { name: 'Global Logistics Demo', sessions: 5, users: 2, status: 'active' },
];

export default function AgentDetailPage() {
  const el = document.createElement('div');
  el.className = 'page';

  el.innerHTML = `
    <div class="bc">
      <a href="#" class="nav-back" data-to="agents">Agents</a>
      <span class="sep">›</span>
      <span class="cur">${mockAgent.name}</span>
    </div>
    <div class="agent-detail-hdr mb-6">
      <div class="agent-avatar">🤖</div>
      <div style="flex:1">
        <div class="flex items-c gap-3 mb-1">
          <h2 style="font-size:22px;font-weight:800">${mockAgent.name}</h2>
          <span class="badge ${mockAgent.status === 'enabled' ? 'b-ok' : 'b-gray'}"><span class="dot"></span> ${mockAgent.status === 'enabled' ? 'Enabled' : 'Disabled'}</span>
        </div>
        <div class="text-xs text-t">Used by ${mockAgent.projects} projects · Last active: ${mockAgent.lastActive}</div>
        <div class="text-xs text-t mt-1">Last updated: <strong>${mockAgent.lastUpdated}</strong> by ${mockAgent.updatedBy}</div>
      </div>
      <div class="flex gap-2" id="actions"></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:start">
      <div>
        <div class="card mb-6">
          <div class="card-hdr">
            <div class="text-md fw-sb">Current Role</div>
            <div class="text-xs text-t mono">${mockAgent.lastUpdated.split(' at ')[0]} · ${mockAgent.lastUpdated.split(' at ')[1] || '16:20'}</div>
          </div>
          <div class="card-body" style="background:var(--gray-25)">
            <p style="font-size:13px;line-height:1.7;color:var(--gray-700);white-space:pre-wrap;font-family:var(--mono)">${mockAgent.role}</p>
          </div>
        </div>
        <div class="card mb-6">
          <div class="card-hdr"><div class="text-md fw-sb">Role History</div></div>
          ${mockRoleHistory.map(h => `
            <div style="border-bottom:1px solid var(--gray-100);padding:14px 20px">
              <div class="flex jc-b items-c mb-2">
                <span class="text-xs fw-sb text-p">${h.version} — ${h.date} by ${h.author}</span>
                <button class="btn btn-g btn-sm">Restore</button>
              </div>
              <p style="font-size:12px;line-height:1.6;color:var(--gray-500);font-family:var(--mono);white-space:pre-wrap">${h.role}</p>
            </div>
          `).join('')}
        </div>
      </div>
      <div>
        <div class="card mb-6">
          <div class="card-hdr"><div class="text-md fw-sb">Configuration</div></div>
          <div class="card-body">
            <div class="flex jc-b items-c" style="padding:6px 0;border-bottom:1px solid var(--gray-100)">
              <span class="text-xs text-t">Agent Name</span>
              <span class="text-sm fw-m">${mockAgent.name}</span>
            </div>
            <div class="flex jc-b items-c" style="padding:6px 0;border-bottom:1px solid var(--gray-100)">
              <span class="text-xs text-t">Personality</span>
              <span class="text-sm fw-m">${mockAgent.personality}</span>
            </div>
            <div class="flex jc-b items-c" style="padding:6px 0">
              <span class="text-xs text-t">Answering Tone</span>
              <span class="text-sm fw-m">${mockAgent.tone}</span>
            </div>
          </div>
        </div>
        <div class="card">
          <div class="card-hdr"><div class="text-md fw-sb">Assigned Projects</div></div>
          <div class="card-body" style="display:flex;flex-direction:column;gap:10px">
            ${mockProjects.map(p => `
              <div style="display:flex;align-items:center;gap:12px;padding:12px;background:var(--gray-25);border:1px solid var(--gray-200);border-radius:8px">
                <span style="font-size:18px">📁</span>
                <div style="flex:1">
                  <div class="text-sm fw-sb">${p.name}</div>
                  <div class="text-xs text-t mt-1">${p.sessions} sessions · ${p.users} users</div>
                </div>
                <span class="badge b-ok"><span class="dot"></span> ${p.status}</span>
              </div>
            `).join('')}
          </div>
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

  el.querySelector('#actions').appendChild(
    Button({ text: 'Edit Agent', variant: 's', onClick: () => navigate('agent-edit') })
  );

  return el;
}
