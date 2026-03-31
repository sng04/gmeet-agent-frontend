import { loadTemplate } from '../../utils/template.js';
import { Button } from '../../components/ui/Button.js';
import { Modal } from '../../components/ui/Modal.js';
import { navigate } from '../../router.js';
import { agentsApi } from '../../api/agents.js';
import { personalitiesApi } from '../../api/personalities.js';
import { skillsApi } from '../../api/skills.js';
import { formatDate } from '../../utils/format.js';
import { extractList, extractItem } from '../../utils/api-helpers.js';
import { renderMarkdown } from '../../utils/markdown.js';
import { Alert } from '../../components/ui/Alert.js';
import { sanitize } from '../../utils/sanitize.js';

export default async function AgentDetailController(params) {
  var el = await loadTemplate('/templates/admin/agent-detail.html', 'agent-detail');
  var agentId = params?.id;
  var loadingEl = el.querySelector('[data-bind="loading"]');
  var errorEl = el.querySelector('[data-bind="error"]');
  var contentEl = el.querySelector('[data-bind="content"]');
  var formErrorEl = el.querySelector('[data-bind="formError"]');
  var viewMode = el.querySelector('[data-bind="viewMode"]');
  var editMode = el.querySelector('[data-bind="editMode"]');

  el.querySelectorAll('[data-action="navBack"]').forEach(function(link) {
    link.addEventListener('click', function(e) { e.preventDefault(); navigate(link.dataset.to); });
  });

  if (!agentId) {
    errorEl.style.display = '';
    errorEl.innerHTML = '<div class="empty"><div class="empty-icon">⚠️</div><div class="empty-title">No agent ID</div></div>';
    return el;
  }

  loadingEl.style.display = '';
  var agent, skills, allSkills, personalities, personalityName;

  try {
    var results = await Promise.all([
      agentsApi.get(agentId),
      agentsApi.listSkills(agentId),
      skillsApi.list(),
      personalitiesApi.list(),
    ]);
    agent = extractItem(results[0]);
    skills = extractList(results[1]);
    allSkills = extractList(results[2]);
    personalities = extractList(results[3]);
    var matched = personalities.find(function(p) { return p.personality_id === agent.personality_id; });
    personalityName = matched ? matched.personality_name : agent.personality_id;
  } catch (err) {
    loadingEl.style.display = 'none';
    errorEl.style.display = '';
    errorEl.innerHTML = '<div class="empty"><div class="empty-icon">⚠️</div><div class="empty-title">Failed to load</div><div class="empty-desc">' + err.message + '</div></div>';
    return el;
  }

  loadingEl.style.display = 'none';
  contentEl.style.display = '';

  // View mode
  el.querySelector('[data-bind="agentName"]').textContent = agent.agent_name;
  el.querySelector('[data-bind="agentTitle"]').textContent = agent.agent_name;
  el.querySelector('[data-bind="agentMeta"]').textContent = agent.updated_at ? 'Updated: ' + formatDate(agent.updated_at) : '';
  el.querySelector('[data-bind="roleText"]').textContent = agent.role_prompt || '—';
  el.querySelector('[data-bind="guidelinesText"]').textContent = agent.behavior_guidelines || agent.task_prompt || '—';
  el.querySelector('[data-bind="configPersonality"]').textContent = personalityName;
  renderViewSkills(skills);
  renderAgentHistory();

  // Actions
  var actionsEl = el.querySelector('[data-bind="actions"]');
  var editBtn = Button({ text: 'Edit', variant: 's', onClick: enterEditMode });
  var deleteBtn = Button({ text: 'Delete', variant: 'd', onClick: async function() {
    if (!confirm('Delete this agent?')) return;
    try { await agentsApi.delete(agentId); navigate('agents'); } catch (err) { alert(err.message); }
  }});
  actionsEl.appendChild(editBtn);
  actionsEl.appendChild(deleteBtn);

  // Edit mode form
  var form = el.querySelector('#agent-form');
  var pSelect = el.querySelector('[data-bind="personalitySelect"]');
  pSelect.innerHTML = '<option value="">Select personality...</option>';
  personalities.forEach(function(p) {
    var opt = document.createElement('option');
    opt.value = p.personality_id;
    opt.textContent = p.personality_name;
    if (p.personality_id === agent.personality_id) opt.selected = true;
    pSelect.appendChild(opt);
  });

  function enterEditMode() {
    form.querySelector('[name="agent_name"]').value = agent.agent_name || '';
    form.querySelector('[name="role_prompt"]').value = agent.role_prompt || '';
    form.querySelector('[name="behavior_guidelines"]').value = agent.behavior_guidelines || agent.task_prompt || '';
    viewMode.style.display = 'none';
    editMode.style.display = '';
    renderEditSkills(skills);
    // Swap Edit button to Back button
    editBtn.textContent = '← Back';
    editBtn.onclick = exitEditMode;
    deleteBtn.style.display = 'none';
  }

  function exitEditMode() {
    editMode.style.display = 'none';
    viewMode.style.display = '';
    formErrorEl.style.display = 'none';
    // Swap Back button to Edit button
    editBtn.textContent = 'Edit';
    editBtn.onclick = enterEditMode;
    deleteBtn.style.display = '';
  }

  el.querySelector('[data-action="cancelEdit"]').addEventListener('click', exitEditMode);

  // Save
  el.querySelector('[data-action="save"]').addEventListener('click', async function() {
    var data = Object.fromEntries(new FormData(form));
    data.agent_name = (data.agent_name || '').trim();
    data.role_prompt = (data.role_prompt || '').trim();
    data.behavior_guidelines = (data.behavior_guidelines || '').trim();
    if (!data.agent_name || !data.role_prompt || !data.behavior_guidelines || !data.personality_id) {
      formErrorEl.style.display = '';
      formErrorEl.innerHTML = '';
      formErrorEl.appendChild(Alert({ message: 'Fill in all required fields.', variant: 'error', icon: '⚠️' }));
      return;
    }
    data.use_case = 'general';
    data.model_id = 'amazon.nova-pro-v1:0';
    var btn = el.querySelector('[data-action="save"]');
    btn.disabled = true; btn.textContent = 'Saving...'; formErrorEl.style.display = 'none';
    try {
      await agentsApi.update(agentId, data);
      var res = await agentsApi.get(agentId);
      agent = extractItem(res);
      el.querySelector('[data-bind="agentTitle"]').textContent = agent.agent_name;
      el.querySelector('[data-bind="agentName"]').textContent = agent.agent_name;
      el.querySelector('[data-bind="agentMeta"]').textContent = agent.updated_at ? 'Updated: ' + formatDate(agent.updated_at) : '';
      el.querySelector('[data-bind="roleText"]').textContent = agent.role_prompt || '—';
      el.querySelector('[data-bind="guidelinesText"]').textContent = agent.behavior_guidelines || agent.task_prompt || '—';
      var mp = personalities.find(function(p) { return p.personality_id === agent.personality_id; });
      el.querySelector('[data-bind="configPersonality"]').textContent = mp ? mp.personality_name : agent.personality_id;
      exitEditMode();
    } catch (err) {
      formErrorEl.style.display = '';
      formErrorEl.innerHTML = '';
      formErrorEl.appendChild(Alert({ message: err.message, variant: 'error', icon: '⚠️' }));
    } finally { btn.disabled = false; btn.textContent = 'Save Changes'; }
  });

  // View skills
  function renderViewSkills(list) {
    var c = el.querySelector('[data-bind="viewSkillsList"]');
    if (!list.length) { c.innerHTML = '<div class="card-body text-xs text-t">No skills attached.</div>'; return; }
    c.innerHTML = '';
    list.forEach(function(s) {
      var r = document.createElement('div');
      r.style.cssText = 'display:flex;align-items:center;gap:12px;padding:12px 20px;border-bottom:1px solid var(--gray-100)';
      r.innerHTML = '<span style="font-size:18px">📄</span><div style="flex:1"><div class="text-sm fw-m">' + sanitize(s.skill_name) + '</div><div class="text-xs text-t mt-1">' + sanitize(s.file_name || '') + (s.description ? ' · ' + sanitize(s.description) : '') + '</div></div>';
      c.appendChild(r);
    });
  }

  // Edit skills
  function renderEditSkills(list) {
    var c = el.querySelector('[data-bind="editSkillsList"]');
    if (!list.length) { c.innerHTML = '<div class="card-body text-xs text-t">No skills attached.</div>'; return; }
    c.innerHTML = '';
    list.forEach(function(s) {
      var r = document.createElement('div');
      r.style.cssText = 'display:flex;align-items:center;gap:12px;padding:12px 20px;border-bottom:1px solid var(--gray-100)';
      r.innerHTML = '<span style="font-size:18px">📄</span><div style="flex:1"><div class="text-sm fw-m">' + sanitize(s.skill_name) + '</div><div class="text-xs text-t mt-1">' + sanitize(s.file_name || '') + '</div></div><button class="btn btn-d btn-sm" data-detach-skill="' + s.skill_id + '">Detach</button>';
      c.appendChild(r);
    });
  }

  async function refreshSkills() {
    var res = await agentsApi.listSkills(agentId);
    skills = extractList(res);
    renderEditSkills(skills);
    renderViewSkills(skills);
  }

  // Detach
  el.addEventListener('click', async function(e) {
    var btn = e.target.closest('[data-detach-skill]');
    if (!btn) return;
    if (!confirm('Detach this skill?')) return;
    try {
      await agentsApi.detachSkill(agentId, btn.dataset.detachSkill);
      await refreshSkills();
    } catch (err) { alert(err.message); }
  });

  // Attach modal
  el.querySelector('[data-action="addSkill"]').addEventListener('click', function() {
    var attachedIds = skills.map(function(s) { return s.skill_id; });
    var available = allSkills.filter(function(s) { return !attachedIds.includes(s.skill_id); });
    var body = document.createElement('div');
    if (!available.length) {
      body.innerHTML = '<div class="text-sm text-t">No unattached skills available. Create skills from the Skills page first.</div>';
    } else {
      body.innerHTML = '<div class="form-g"><label class="form-l">Select skills to attach</label><div id="skill-cbs"></div></div><div id="attach-err" style="display:none;color:var(--err-600);font-size:13px;margin-top:8px"></div>';
      var cbs = body.querySelector('#skill-cbs');
      available.forEach(function(s) {
        var lbl = document.createElement('label');
        lbl.style.cssText = 'display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--gray-100);cursor:pointer;font-size:13px';
        lbl.innerHTML = '<input type="checkbox" value="' + s.skill_id + '" style="width:16px;height:16px"> <div><div class="fw-m">' + sanitize(s.skill_name) + '</div><div class="text-xs text-t">' + sanitize(s.file_name || '') + '</div></div>';
        cbs.appendChild(lbl);
      });
    }
    var footer = document.createElement('div');
    footer.style.cssText = 'display:flex;gap:12px;justify-content:flex-end';
    var modal;
    var cancelBtn = Button({ text: 'Cancel', variant: 's', onClick: function() { modal.close(); } });
    var attachBtn = Button({ text: 'Attach Selected', variant: 'p', onClick: async function() {
      var checked = body.querySelectorAll('input[type="checkbox"]:checked');
      if (!checked.length) { var e = body.querySelector('#attach-err'); if (e) { e.textContent = 'Select at least one.'; e.style.display = ''; } return; }
      attachBtn.disabled = true; attachBtn.textContent = 'Attaching...';
      try {
        var promises = [];
        checked.forEach(function(cb) { promises.push(agentsApi.attachSkill(agentId, cb.value)); });
        await Promise.all(promises);
        modal.close();
        await refreshSkills();
        var allRes = await skillsApi.list();
        allSkills = extractList(allRes);
      } catch (err) { alert(err.message); }
      finally { attachBtn.disabled = false; attachBtn.textContent = 'Attach Selected'; }
    }});
    footer.appendChild(cancelBtn);
    if (available.length) footer.appendChild(attachBtn);
    modal = Modal({ title: 'Attach Skills', body: body, footer: footer });
  });

  // Test chat
  var conversationHistory = [];
  var chatMsgs = el.querySelector('[data-bind="chatMsgs"]');
  var chatInput = el.querySelector('[data-bind="chatInput"]');
  var chatStatus = el.querySelector('[data-bind="chatStatus"]');
  var chatDirty = false;
  var lastFormSnapshot = '';

  function getFormSnapshot() {
    var fd = Object.fromEntries(new FormData(form));
    return fd.role_prompt + '|' + fd.behavior_guidelines + '|' + fd.personality_id;
  }

  function checkConfigChanged() {
    if (!conversationHistory.length) return; // No conversation yet, nothing to invalidate
    var current = getFormSnapshot();
    if (current !== lastFormSnapshot && !chatDirty) {
      chatDirty = true;
      chatInput.disabled = true;
      chatInput.placeholder = 'Config changed — refresh to continue testing';
      var sendBtn = el.querySelector('[data-action="chatSend"]');
      if (sendBtn) {
        sendBtn.textContent = '🔄 Refresh';
        sendBtn.dataset.action = 'chatRefresh';
      }
      chatStatus.textContent = '⚠️ Config changed — refresh to apply';
    }
  }

  function resetChat() {
    conversationHistory = [];
    chatDirty = false;
    lastFormSnapshot = getFormSnapshot();
    chatMsgs.innerHTML = '<div class="chat-test-row"><div class="chat-test-bubble ai-bubble" style="color:var(--gray-400)">Type a message below to test.</div></div>';
    chatInput.disabled = false;
    chatInput.placeholder = 'Type a test message...';
    chatInput.value = '';
    var sendBtn = el.querySelector('[data-action="chatRefresh"]');
    if (sendBtn) {
      sendBtn.textContent = 'Send';
      sendBtn.dataset.action = 'chatSend';
    }
    chatStatus.textContent = 'Test how the agent responds';
  }

  // Listen for form changes
  form.addEventListener('input', checkConfigChanged);
  form.addEventListener('change', checkConfigChanged);

  function addMsg(text, type) {
    var row = document.createElement('div');
    row.className = 'chat-test-row' + (type === 'user' ? ' right' : '');
    var bubble = document.createElement('div');
    bubble.className = 'chat-test-bubble ' + (type === 'user' ? 'user-bubble' : 'ai-bubble');
    if (type === 'ai') {
      bubble.innerHTML = '<div class="agent-lbl">Agent</div><div class="chat-test-body">' + renderMarkdown(text) + '</div>';
    } else { bubble.textContent = text; }
    row.appendChild(bubble);
    chatMsgs.appendChild(row);
    chatMsgs.scrollTop = chatMsgs.scrollHeight;
  }

  var sendChat = async function() {
    var msg = chatInput.value.trim();
    if (!msg) return;
    var fd = Object.fromEntries(new FormData(form));
    fd.role_prompt = (fd.role_prompt || '').trim();
    fd.behavior_guidelines = (fd.behavior_guidelines || '').trim();
    if (!fd.role_prompt || !fd.behavior_guidelines || !fd.personality_id) {
      formErrorEl.style.display = '';
      formErrorEl.innerHTML = '';
      formErrorEl.appendChild(Alert({ message: 'Fill in all prompt fields first.', variant: 'error', icon: '⚠️' }));
      return;
    }
    if (!conversationHistory.length) {
      chatMsgs.innerHTML = '';
      lastFormSnapshot = getFormSnapshot();
    }
    addMsg(msg, 'user');
    chatInput.value = '';
    chatInput.disabled = true;
    chatStatus.textContent = '⏳ Thinking...';
    try {
      var payload = { role_prompt: fd.role_prompt, behavior_guidelines: fd.behavior_guidelines, personality_id: fd.personality_id, message: msg };
      if (conversationHistory.length) payload.conversation_history = conversationHistory;
      if (skills.length) payload.skill_ids = skills.map(function(s) { return s.skill_id; });
      var res = await agentsApi.testPrompt(payload);
      var reply = extractItem(res)?.response || res.data?.response || 'No response';
      addMsg(reply, 'ai');
      conversationHistory.push({ role: 'user', content: msg });
      conversationHistory.push({ role: 'assistant', content: reply });
      chatStatus.textContent = (conversationHistory.length / 2) + ' turns · Ready';
    } catch (err) {
      addMsg('Error: ' + err.message, 'ai');
      chatStatus.textContent = 'Error — try again';
    } finally { chatInput.disabled = false; chatInput.focus(); }
  };
  el.querySelector('[data-action="chatSend"]').addEventListener('click', sendChat);
  chatInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') sendChat(); });

  // Delegated click for both send and refresh
  el.addEventListener('click', function(e) {
    var btn = e.target.closest('[data-action="chatRefresh"]');
    if (btn) resetChat();
  });

  return el;
}
