import { loadTemplate } from '../../utils/template.js';
import { authStore } from '../../stores/auth.js';
import { appStore } from '../../stores/app.js';
import { authApi } from '../../api/auth.js';
import { api } from '../../api/client.js';
import { navigate } from '../../router.js';

const adminMenu = [
  { group: 'Overview', items: [
    { id: '', icon: '📊', label: 'Dashboard' },
  ]},
  { group: 'Management', items: [
    { id: 'users', icon: '👥', label: 'Users' },
    { id: 'projects', icon: '📁', label: 'Projects', badge: '3' },
    { id: 'agents', icon: '🤖', label: 'Agents', badge: '3' },
    { id: 'personalities', icon: '🎭', label: 'Personalities' },
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

export default async function LayoutController() {
  const el = await loadTemplate('/templates/layout/layout.html', 'layout');
  const { user, isAdmin } = authStore.getState();
  const { sidebarCollapsed } = appStore.getState();

  // --- Topbar population ---
  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() ||
                   user?.email?.charAt(0).toUpperCase() ||
                   user?.username?.charAt(0).toUpperCase() || 'U';

  const topbarInitials = el.querySelector('[data-bind="topbarInitials"]');
  if (topbarInitials) topbarInitials.textContent = initials;

  const logoIcon = el.querySelector('[data-bind="logoClass"]');
  if (logoIcon) logoIcon.classList.add(isAdmin ? 'admin' : 'user');

  const portalBadge = el.querySelector('[data-bind="portalBadge"]');
  if (portalBadge) {
    portalBadge.textContent = isAdmin ? 'Admin Portal' : 'User Portal';
    portalBadge.classList.add(isAdmin ? 'admin' : 'user');
  }

  const avatarEl = el.querySelector('[data-bind="avatarClass"]');
  if (avatarEl && !isAdmin) avatarEl.classList.add('user-avatar');

  const sidebarToggleEl = el.querySelector('[data-bind="sidebarToggle"]');
  if (sidebarToggleEl && isAdmin) sidebarToggleEl.style.display = 'none';

  const topbarUserName = el.querySelector('[data-bind="topbarUserName"]');
  if (topbarUserName) topbarUserName.textContent = user?.name || user?.username || 'User';

  const topbarUserEmail = el.querySelector('[data-bind="topbarUserEmail"]');
  if (topbarUserEmail) {
    if (user?.email && user.email.includes('@')) {
      topbarUserEmail.textContent = user.email;
    } else {
      topbarUserEmail.style.display = 'none';
    }
  }

  // Topbar events
  const avatarMenu = el.querySelector('.avatar-menu');
  const avatarBtn = el.querySelector('[data-action="avatarToggle"]');
  if (avatarBtn) {
    avatarBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      avatarMenu.classList.toggle('open');
    });
  }
  document.addEventListener('click', () => {
    if (avatarMenu) avatarMenu.classList.remove('open');
  });

  const logoutEl = el.querySelector('[data-action="logout"]');
  if (logoutEl) {
    logoutEl.addEventListener('click', async () => {
      const wasAdmin = isAdmin;
      try { await authApi.logout(); } catch (err) { console.error('Logout error:', err); }
      authStore.logout();
      api.clearTokens();
      navigate(wasAdmin ? 'admin/login' : 'login');
    });
  }

  if (sidebarToggleEl) {
    sidebarToggleEl.addEventListener('click', () => appStore.toggleSidebar());
  }

  // --- Sidebar population ---
  const sidebar = el.querySelector('#sidebar');
  const menu = isAdmin ? adminMenu : userMenu;

  if (sidebarCollapsed) sidebar.classList.add('collapsed');

  const currentPath = window.location.pathname.slice(1).split('/')[0];
  const navContainer = el.querySelector('[data-bind="navContainer"]');
  if (navContainer) {
    navContainer.innerHTML = menu.map(group => `
      <div class="nav-group">
        <div class="nav-label">${group.group}</div>
        ${group.items.map(item => `
          <div class="nav-item${item.id === currentPath ? ' active' : ''}" data-page="${item.id}">
            <span class="nav-icon">${item.icon}</span>${item.label}
            ${item.badge ? `<span class="nav-badge${item.live ? ' live-badge' : ''}">${item.badge}</span>` : ''}
          </div>
        `).join('')}
      </div>
    `).join('');
  }

  el.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      el.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      navigate(item.dataset.page);
    });
  });

  appStore.subscribe((state) => {
    sidebar.classList.toggle('collapsed', state.sidebarCollapsed);
  });

  const sidebarInitials = el.querySelector('[data-bind="sidebarInitials"]');
  if (sidebarInitials) sidebarInitials.textContent = initials;

  const sidebarUserName = el.querySelector('[data-bind="sidebarUserName"]');
  if (sidebarUserName) sidebarUserName.textContent = user?.name || 'User';

  const sidebarUserRole = el.querySelector('[data-bind="sidebarUserRole"]');
  if (sidebarUserRole) sidebarUserRole.textContent = isAdmin ? 'Administrator' : 'User';

  const main = el.querySelector('#main-content');
  return { el, main };
}
