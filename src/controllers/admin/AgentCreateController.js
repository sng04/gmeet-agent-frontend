import { loadTemplate } from '../../utils/template.js';
import { navigate } from '../../router.js';

export default async function AgentCreateController(params) {
  const el = await loadTemplate('/templates/admin/agent-create.html', 'agent-create');

  // Breadcrumb nav-back
  el.querySelectorAll('[data-action="navBack"]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      navigate(link.dataset.to);
    });
  });

  // Cancel → agents
  el.querySelector('[data-action="cancel"]').addEventListener('click', () => navigate('agents'));

  // Create → agent-detail
  el.querySelector('[data-action="create"]').addEventListener('click', () => navigate('agent-detail'));

  // Test chat
  const testInput = el.querySelector('[data-bind="testInput"]');
  const testMsgs = el.querySelector('[data-bind="testMsgs"]');
  el.querySelector('[data-action="testSend"]').addEventListener('click', () => {
    if (!testInput.value.trim()) return;
    testMsgs.innerHTML += `<div class="chat-test-item user">${testInput.value}</div>`;
    testMsgs.innerHTML += `<div class="chat-test-item ai"><div class="agent-lbl">New Agent</div>Based on the configured knowledge base, I can help you with that question...</div>`;
    testInput.value = '';
    testMsgs.scrollTop = testMsgs.scrollHeight;
  });

  return el;
}
