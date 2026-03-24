import { authStore } from '../../stores/auth.js';
import { appStore } from '../../stores/app.js';
import { navigate } from '../../router.js';

const adminMenu = [
  { group: 'Overview', items: [
    { id: '', icon: '📊', label: 'Dashboard' },
  ]},
  { group: 'Management', items: [
    { id: 'users', icon: '👥', label: 'Users' },
    { id: 'projects', icon: '📁', label: 'Projects', badge: '3' },
    { id: 'agents', icon: '🤖', label: 'Agents', badge: '3' },
    { id: 'skills', icon: '⚡', label: 'Skills' },
    { id: 'gmail', icon: '📧', label: 'Gmail Credentials' },
  ]},
  { group: 'Monitoring', items: [
    { id: 'qa', icon: '💬', label: 'Q&A Monitor' },
    { id: 'tokens', icon: '🪙', label: 'Token Usage' },
    { id: 'logs', icon: '📋', label: 'Audit Logs' },
  ]},
];

const userMenu = [
  { group: 'Navigation', items: [
    { id: '', icon: '📊', label: 'Dashboard' },
  ]},
  { group: 'Active Now', items: [
    { id: 'live-session', icon: '🔴', label: 'Live Session', badge: '1', live: true },
  ]},
];

export function Sidebar() {
  const { user, isAdmin } = authStore.getState();
  const { sidebarCollapsed } = appStore.getState();
  const menu = isAdmin ? adminMenu : userMenu;
  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';

  const el = document.createElement('nav');
  el.className = `sidebar${sidebarCollapsed ? ' collapsed' : ''}`;
  el.id = 'sidebar';

  const currentPath = (window.location.hash.slice(2) || '').split('/')[0];

  el.innerHTML = `
    ${menu.map(group => `
      <div class="nav-group">
        <div class="nav-label">${group.group}</div>
        ${group.items.map(item => `
          <div class="nav-item${item.id === currentPath ? ' active' : ''}" data-page="${item.id}">
            <span class="nav-icon">${item.icon}</span>${item.label}
            ${item.badge ? `<span class="nav-badge${item.live ? ' live-badge' : ''}">${item.badge}</span>` : ''}
          </div>
        `).join('')}
      </div>
    `).join('')}
    <div class="sidebar-footer">
      <div class="user-card">
        <div class="avatar" style="cursor:default">${initials}</div>
        <div>
          <div class="name">${user?.name || 'User'}</div>
          <div class="role">${isAdmin ? 'Administrator' : 'User'}</div>
        </div>
      </div>
    </div>
  `;

  el.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      el.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      navigate(item.dataset.page);
    });
  });

  appStore.subscribe((state) => {
    el.classList.toggle('collapsed', state.sidebarCollapsed);
  });

  return el;
}
