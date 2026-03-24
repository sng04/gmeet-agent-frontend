import { authStore } from '../../stores/auth.js';
import { appStore } from '../../stores/app.js';
import { authApi } from '../../api/auth.js';
import { api } from '../../api/client.js';

export function Topbar() {
  const { user, isAdmin } = authStore.getState();
  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 
                   user?.email?.charAt(0).toUpperCase() || 
                   user?.username?.charAt(0).toUpperCase() || 'U';

  const el = document.createElement('header');
  el.className = 'topbar';
  el.innerHTML = `
    ${!isAdmin ? '<button class="sidebar-toggle" id="sidebar-toggle">☰</button>' : ''}
    <div class="logo">
      <div class="logo-icon ${isAdmin ? 'admin' : 'user'}">M</div>
      Meet<span class="acc">Agent</span>
    </div>
    <span class="portal-badge ${isAdmin ? 'admin' : 'user'}">${isAdmin ? 'Admin Portal' : 'User Portal'}</span>
    <div class="topbar-right">
      <div class="avatar ${isAdmin ? '' : 'user-avatar'}" id="avatar-btn">${initials}
        <div class="avatar-menu" id="avatar-menu">
          <div class="avatar-menu-hdr">
            <div class="avatar-menu-name">${user?.name || user?.username || 'User'}</div>
            ${user?.email && user.email.includes('@') ? `<div class="avatar-menu-email">${user.email}</div>` : ''}
          </div>
          <div class="avatar-menu-item" data-action="logout">🚪 Sign Out</div>
        </div>
      </div>
    </div>
  `;

  const avatarBtn = el.querySelector('#avatar-btn');
  const avatarMenu = el.querySelector('#avatar-menu');
  const sidebarToggle = el.querySelector('#sidebar-toggle');

  avatarBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    avatarMenu.classList.toggle('open');
  });

  document.addEventListener('click', () => avatarMenu.classList.remove('open'));

  avatarMenu.addEventListener('click', async (e) => {
    const action = e.target.dataset.action;
    if (action === 'logout') {
      try {
        await authApi.logout();
      } catch (err) {
        console.error('Logout error:', err);
      }
      authStore.logout();
      api.clearTokens();
      window.location.hash = isAdmin ? '#/admin/login' : '#/login';
    }
  });

  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', () => appStore.toggleSidebar());
  }

  return el;
}
