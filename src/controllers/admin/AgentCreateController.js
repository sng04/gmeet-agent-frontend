import { loadTemplate } from '../../utils/template.js';
import { navigate } from '../../router.js';
import { agentsApi } from '../../api/agents.js';
import { personalitiesApi } from '../../api/personalities.js';
import { Alert } from '../../components/ui/Alert.js';
import { extractList, extractItem } from '../../utils/api-helpers.js';
import { renderMarkdown } from '../../utils/markdown.js';

export default async function AgentCreateController(params) {
  const el = await loadTemplate('/templates/admin/agent-create.html', 'agent-create');

  const conversationHistory = [];

  // Breadcrumb
  el.querySelectorAll('[data-action="navBack"]').forEach(link => {
    link.addEventListener('click', (e) => { e.preventDefault(); navigate(link.dataset.to); });
  });

  // Load personalities
  const personalitySelect = el.querySelector('[data-bind="personalitySelect"]');
  try {
    const res = await personalitiesApi.list();
    const personalities = extractList(res);
    personalitySelect.innerHTML = '<option value="">Select personality...</option>';
    personalities.forEach(p => {
      personalitySelect.innerHTML += `<option value="${p.personality_id}">${p.personality_name}</option>`;
    });
  } catch { personalitySelect.innerHTML = '<option value="">Failed to load</option>'; }

  const errorContainer = el.querySelector('[data-bind="formError"]');
  const chatMsgs = el.querySelector('[data-bind="chatMsgs"]');
  const chatInput = el.querySelector('[data-bind="chatInput"]');
  const chatStatus = el.querySelector('[data-bind="chatStatus"]');

  function showError(msg) {
    errorContainer.style.display = '';
    errorContainer.innerHTML = '';
    errorContainer.appendChild(Alert({ message: msg, variant: 'error', icon: '⚠️' }));
  }

  function getFormData() {
    return Object.fromEntries(new FormData(el.querySelector('#agent-form')));
  }

  function addMsg(text, type) {
    const row = document.createElement('div');
    row.className = 'chat-test-row' + (type === 'user' ? ' right' : '');
    const bubble = document.createElement('div');
    bubble.className = 'chat-test-bubble ' + (type === 'user' ? 'user-bubble' : 'ai-bubble');
    if (type === 'ai') {
      bubble.innerHTML = '<div class="agent-lbl">Agent</div><div class="chat-test-body">' + renderMarkdown(text) + '</div>';
    } else {
      bubble.textContent = text;
    }
    row.appendChild(bubble);
    chatMsgs.appendChild(row);
    chatMsgs.scrollTop = chatMsgs.scrollHeight;
  }

  // Cancel
  el.querySelector('[data-action="cancel"]').addEventListener('click', () => navigate('agents'));

  // Create Agent
  el.querySelector('[data-action="create"]').addEventListener('click', async () => {
    const data = getFormData();
    if (!data.agent_name || !data.role_prompt || !data.behavior_guidelines || !data.personality_id) {
      showError('Please fill in all required fields.'); return;
    }
    data.use_case = 'general';
    data.model_id = 'amazon.nova-pro-v1:0';
    const btn = el.querySelector('[data-action="create"]');
    btn.disabled = true; btn.textContent = 'Creating...'; errorContainer.style.display = 'none';
    try {
      const res = await agentsApi.create(data);
      const id = extractItem(res)?.agent_id;
      navigate(id ? `agents/${id}` : 'agents');
    } catch (err) { showError(err.message); }
    finally { btn.disabled = false; btn.textContent = 'Create Agent →'; }
  });

  // Test chat via REST
  const sendChat = async () => {
    const msg = chatInput.value.trim();
    if (!msg) return;

    const data = getFormData();
    if (!data.role_prompt || !data.behavior_guidelines || !data.personality_id) {
      showError('Fill in role prompt, behavior guidelines, and personality before testing.');
      return;
    }

    // Clear placeholder on first message
    if (!conversationHistory.length) chatMsgs.innerHTML = '';

    addMsg(msg, 'user');
    chatInput.value = '';
    chatInput.disabled = true;
    chatStatus.textContent = '⏳ Thinking...';

    try {
      const res = await agentsApi.testPrompt({
        role_prompt: data.role_prompt,
        behavior_guidelines: data.behavior_guidelines,
        personality_id: data.personality_id,
        message: msg,
        conversation_history: conversationHistory.length ? conversationHistory : undefined,
      });

      const reply = extractItem(res)?.response || res.data?.response || 'No response';
      addMsg(reply, 'ai');

      // Track history for multi-turn
      conversationHistory.push({ role: 'user', content: msg });
      conversationHistory.push({ role: 'assistant', content: reply });

      chatStatus.textContent = `${conversationHistory.length / 2} turn${conversationHistory.length > 2 ? 's' : ''} · Ready`;
    } catch (err) {
      addMsg(`Error: ${err.message}`, 'ai');
      chatStatus.textContent = 'Error — try again';
    } finally {
      chatInput.disabled = false;
      chatInput.focus();
    }
  };

  el.querySelector('[data-action="chatSend"]').addEventListener('click', sendChat);
  chatInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendChat(); });

  return el;
}
