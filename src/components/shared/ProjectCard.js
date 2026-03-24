import { navigate } from '../../router.js';

export function ProjectCard({ id, name, description, agent, sessions, users }) {
  const el = document.createElement('div');
  el.className = 'proj-card';

  el.innerHTML = `
    <div class="proj-card-name">${name}</div>
    <div class="proj-card-desc">${description}</div>
    <div class="proj-card-meta">
      <span>🤖 ${agent}</span>
      <span>📋 ${sessions} sessions</span>
      <span>👥 ${users} users</span>
    </div>
  `;

  el.addEventListener('click', () => navigate('project-detail'));

  return el;
}
