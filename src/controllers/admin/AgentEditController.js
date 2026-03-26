import { loadTemplate } from '../../utils/template.js';
import { navigate } from '../../router.js';

export default async function AgentEditController(params) {
  const el = await loadTemplate('/templates/admin/agent-edit.html', 'agent-edit');

  // Breadcrumb nav-back
  el.querySelectorAll('[data-action="navBack"]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      navigate(link.dataset.to);
    });
  });

  // Cancel → agent-detail
  el.querySelector('[data-action="cancel"]').addEventListener('click', () => navigate('agent-detail'));

  // Discard → agent-detail
  el.querySelector('[data-action="discard"]').addEventListener('click', () => navigate('agent-detail'));

  // Save → agent-detail
  el.querySelector('[data-action="save"]').addEventListener('click', () => navigate('agent-detail'));

  // Test chat
  const testInput = el.querySelector('[data-bind="testInput"]');
  const testMsgs = el.querySelector('[data-bind="testMsgs"]');
  el.querySelector('[data-action="testSend"]').addEventListener('click', () => {
    if (!testInput.value.trim()) return;
    testMsgs.innerHTML += `<div class="chat-test-item user">${testInput.value}</div>`;
    testMsgs.innerHTML += `<div class="chat-test-item ai"><div class="agent-lbl">TechSales Bot</div>Based on the configured knowledge base, I can confirm that our platform uses AES-256 encryption at rest via AWS KMS.</div>`;
    testInput.value = '';
    testMsgs.scrollTop = testMsgs.scrollHeight;
  });

  return el;
}
