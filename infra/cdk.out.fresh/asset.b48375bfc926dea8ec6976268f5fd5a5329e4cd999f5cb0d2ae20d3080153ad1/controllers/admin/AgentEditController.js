import { loadTemplate } from '../../utils/template.js';
import { navigate } from '../../router.js';
import { agentsApi } from '../../api/agents.js';
import { personalitiesApi } from '../../api/personalities.js';
import { Alert } from '../../components/ui/Alert.js';
import { extractList, extractItem } from '../../utils/api-helpers.js';
import { renderMarkdown } from '../../utils/markdown.js';

export default async function AgentEditController(params) {
  const el = await loadTemplate('/templates/admin/agent-edit.html', 'agent-edit');

  const urlParams = new URLSearchParams(window.location.search);
  const agentId = params?.id || urlParams.get('id');
  const loadingEl = el.querySelector('[data-bind="loading"]');
  const contentEl = el.querySelector('[data-bind="content"]');
  const errorContainer = el.querySelector('[data-bind="formError"]');

  el.querySelectorAll('[data-action="navBack"]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const to = link.dataset.to;
      if (to === 'agent-detail' && agentId) navigate(`agents/${agentId}`);
      else navigate(to);
    });
  });

  if (!agentId) {
    loadingEl.style.display = 'none';
    errorContainer.style.display = '';
    errorContainer.appendChild(Alert({ message: 'No agent ID provided.', variant: 'error', icon: '⚠️' }));
    return el;
  }

  loadingEl.style.display = '';

  try {
    const [agentRes, persRes] = await Promise.all([
      agentsApi.get(agentId),
      personalitiesApi.list(),
    ]);
    const agent = extractItem(agentRes);
    const personalities = extractList(persRes);

    loadingEl.style.display = 'none';
    contentEl.style.display = '';

    // Breadcrumb + subtitle
    const bcLink = el.querySelector('[data-bind="bcAgentLink"]');
    bcLink.textContent = agent.agent_name;
    el.querySelector('[data-bind="editSubtitle"]').textContent = agent.agent_name;

    // Populate personality dropdown
    const pSelect = el.querySelector('[data-bind="personalitySelect"]');
    pSelect.innerHTML = '<option value="">Select personality...</option>';
    personalities.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.personality_id;
      opt.textContent = p.personality_name;
      if (p.personality_id === agent.personality_id) opt.selected = true;
      pSelect.appendChild(opt);
    });

    // Populate form fields
    const form = el.querySelector('#agent-form');
    form.querySelector('[name="agent_name"]').value = agent.agent_name || '';
    form.querySelector('[name="role_prompt"]').value = agent.role_prompt || '';
    form.querySelector('[name="behavior_guidelines"]').value = agent.behavior_guidelines || agent.task_prompt || '';

    // Test chat
    const conversationHistory = [];
    const chatMsgs = el.querySelector('[data-bind="chatMsgs"]');
    const chatInput = el.querySelector('[data-bind="chatInput"]');
    const chatStatus = el.querySelector('[data-bind="chatStatus"]');

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

    const sendChat = async () => {
      const msg = chatInput.value.trim();
      if (!msg) return;
      const fd = Object.fromEntries(new FormData(form));
      fd.role_prompt = (fd.role_prompt || '').trim();
      fd.behavior_guidelines = (fd.behavior_guidelines || '').trim();
      if (!fd.role_prompt || !fd.behavior_guidelines || !fd.personality_id) {
        errorContainer.style.display = '';
        errorContainer.innerHTML = '';
        errorContainer.appendChild(Alert({ message: 'Fill in all prompt fields before testing.', variant: 'error', icon: '⚠️' }));
        return;
      }
      if (!conversationHistory.length) chatMsgs.innerHTML = '';
      addMsg(msg, 'user');
      chatInput.value = '';
      chatInput.disabled = true;
      chatStatus.textContent = '⏳ Thinking...';
      try {
        const res = await agentsApi.testPrompt({
          role_prompt: fd.role_prompt,
          behavior_guidelines: fd.behavior_guidelines,
          personality_id: fd.personality_id,
          message: msg,
          conversation_history: conversationHistory.length ? conversationHistory : undefined,
        });
        const reply = extractItem(res)?.response || res.data?.response || 'No response';
        addMsg(reply, 'ai');
        conversationHistory.push({ role: 'user', content: msg });
        conversationHistory.push({ role: 'assistant', content: reply });
        chatStatus.textContent = `${conversationHistory.length / 2} turn${conversationHistory.length > 2 ? 's' : ''} · Ready`;
      } catch (err) {
        addMsg(`Error: ${err.message}`, 'ai');
        chatStatus.textContent = 'Error — try again';
      } finally { chatInput.disabled = false; chatInput.focus(); }
    };
    el.querySelector('[data-action="chatSend"]').addEventListener('click', sendChat);
    chatInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendChat(); });

    // Cancel
    el.querySelector('[data-action="cancel"]').addEventListener('click', () => navigate(`agents/${agentId}`));

    // Save
    el.querySelector('[data-action="save"]').addEventListener('click', async () => {
      const data = Object.fromEntries(new FormData(form));
      data.agent_name = (data.agent_name || '').trim();
      data.role_prompt = (data.role_prompt || '').trim();
      data.behavior_guidelines = (data.behavior_guidelines || '').trim();
      if (!data.agent_name || !data.role_prompt || !data.behavior_guidelines || !data.personality_id) {
        errorContainer.style.display = '';
        errorContainer.innerHTML = '';
        errorContainer.appendChild(Alert({ message: 'Please fill in all required fields.', variant: 'error', icon: '⚠️' }));
        return;
      }
      // Hardcode backend-managed fields
      data.use_case = 'general';
      data.model_id = 'amazon.nova-pro-v1:0';
      const btn = el.querySelector('[data-action="save"]');
      btn.disabled = true; btn.textContent = 'Saving...';
      errorContainer.style.display = 'none';
      try {
        await agentsApi.update(agentId, data);
        navigate(`agents/${agentId}`);
      } catch (err) {
        errorContainer.style.display = '';
        errorContainer.innerHTML = '';
        errorContainer.appendChild(Alert({ message: err.message, variant: 'error', icon: '⚠️' }));
      } finally { btn.disabled = false; btn.textContent = 'Save Changes'; }
    });

  } catch (err) {
    loadingEl.style.display = 'none';
    errorContainer.style.display = '';
    errorContainer.appendChild(Alert({ message: `Failed to load agent: ${err.message}`, variant: 'error', icon: '⚠️' }));
  }

  return el;
}
