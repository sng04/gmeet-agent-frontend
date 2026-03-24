import { authStore } from './stores/auth.js';

// Public routes (no auth required)
const publicRoutes = {
  'login': () => import('./pages/user/Login.js'),
  'change-password': () => import('./pages/user/ChangePassword.js'),
  'admin/login': () => import('./pages/admin/Login.js'),
  'admin/change-password': () => import('./pages/admin/ChangePassword.js'),
};

const adminRoutes = {
  '': () => import('./pages/admin/Dashboard.js'),
  'projects': () => import('./pages/admin/Projects.js'),
  'project-create': () => import('./pages/admin/ProjectCreate.js'),
  'project-detail': () => import('./pages/admin/ProjectDetail.js'),
  'project-edit': () => import('./pages/admin/ProjectEdit.js'),
  'projects/:id': () => import('./pages/admin/ProjectDetail.js'),
  'agents': () => import('./pages/admin/Agents.js'),
  'agent-create': () => import('./pages/admin/AgentCreate.js'),
  'agent-detail': () => import('./pages/admin/AgentDetail.js'),
  'agent-edit': () => import('./pages/admin/AgentEdit.js'),
  'agents/:id': () => import('./pages/admin/AgentDetail.js'),
  'skills': () => import('./pages/admin/Skills.js'),
  'skill-create': () => import('./pages/admin/SkillCreate.js'),
  'gmail': () => import('./pages/admin/GmailCredentials.js'),
  'gmail-create': () => import('./pages/admin/GmailCreate.js'),
  'gmail-edit': () => import('./pages/admin/GmailEdit.js'),
  'qa': () => import('./pages/admin/QAMonitor.js'),
  'tokens': () => import('./pages/admin/TokenUsage.js'),
  'logs': () => import('./pages/admin/AuditLogs.js'),
  'users': () => import('./pages/admin/Users.js'),
};

const userRoutes = {
  '': () => import('./pages/user/Dashboard.js'),
  'project-detail': () => import('./pages/user/ProjectDetail.js'),
  'project/:id': () => import('./pages/user/ProjectDetail.js'),
  'live-session': () => import('./pages/user/LiveSession.js'),
  'live': () => import('./pages/user/LiveSession.js'),
  'retro-session': () => import('./pages/user/RetroSession.js'),
  'session/:id': () => import('./pages/user/RetroSession.js'),
  'session-create': () => import('./pages/user/SessionCreate.js'),
  'session/create': () => import('./pages/user/SessionCreate.js'),
  'session-history': () => import('./pages/user/SessionHistory.js'),
  'kb': () => import('./pages/user/KnowledgeBase.js'),
};

let currentPath = null;
let appContainer = null;
let layoutRendered = false;

function parsePath() {
  // Get pathname without leading slash
  const path = window.location.pathname.slice(1);
  return path;
}

function matchRoute(path, routes) {
  for (const [pattern, loader] of Object.entries(routes)) {
    const paramNames = [];
    const regexPattern = pattern.replace(/:([^/]+)/g, (_, name) => {
      paramNames.push(name);
      return '([^/]+)';
    });
    const regex = new RegExp(`^${regexPattern}$`);
    const match = path.match(regex);
    if (match) {
      const params = {};
      paramNames.forEach((name, i) => { params[name] = match[i + 1]; });
      return { loader, params };
    }
  }
  return null;
}

export async function render() {
  const path = parsePath();
  
  // Skip if same path
  if (path === currentPath && currentPath !== null) return;
  currentPath = path;

  const state = authStore.getState();
  const { isAuthenticated, isAdmin, challenge } = state;
  const hasToken = !!localStorage.getItem('access_token');
  
  console.log('Router state:', { path, isAuthenticated, isAdmin, challenge, hasToken });

  // Check if it's a public route
  const publicMatch = matchRoute(path, publicRoutes);
  
  if (publicMatch) {
    // Special handling for change-password routes - need active challenge
    if ((path === 'change-password' || path === 'admin/change-password') && challenge !== 'NEW_PASSWORD_REQUIRED') {
      console.log('No active password challenge, redirecting');
      navigate(hasToken ? '' : (path.startsWith('admin') ? 'admin/login' : 'login'));
      return;
    }
    
    // If already authenticated (and no challenge), redirect to dashboard
    if (isAuthenticated && !challenge && hasToken) {
      console.log('Already authenticated, redirecting to dashboard');
      navigate('');
      return;
    }
    
    // Render public page without layout
    layoutRendered = false;
    try {
      const module = await publicMatch.loader();
      const Page = module.default || module[Object.keys(module)[0]];
      appContainer.innerHTML = '';
      const pageEl = await Page(publicMatch.params);
      appContainer.appendChild(pageEl);
    } catch (err) {
      console.error('Route error:', err);
      appContainer.innerHTML = `<div class="login-page"><div class="login-card"><h1>Error</h1><p>${err.message}</p></div></div>`;
    }
    return;
  }

  // Protected routes - check authentication
  if (!hasToken) {
    console.log('No token, redirecting to login');
    const isAdminPath = path.startsWith('admin') || (path === '' && localStorage.getItem('user_role') === 'admin');
    navigate(isAdminPath ? 'admin/login' : 'login');
    return;
  }

  // If has challenge, redirect to change password
  if (challenge === 'NEW_PASSWORD_REQUIRED') {
    console.log('Has challenge, redirecting to change password');
    navigate(isAdmin ? 'admin/change-password' : 'change-password');
    return;
  }

  // Determine if current path is for admin portal
  // Note: '' (dashboard) exists in both routes, so check admin-specific routes
  const isAdminOnlyPath = path.startsWith('admin/') || 
    (path !== '' && matchRoute(path, adminRoutes) !== null && matchRoute(path, userRoutes) === null);
  
  // Role-based access control - only redirect for admin-only routes
  if (!isAdmin && isAdminOnlyPath) {
    // User trying to access admin-only routes - redirect to user dashboard
    console.log('User accessing admin route, redirecting to user dashboard');
    navigate('');
    return;
  }

  // Check if route exists before rendering layout
  const routes = isAdmin ? adminRoutes : userRoutes;
  const matched = matchRoute(path, routes);

  // Handle 404 - redirect to dashboard instead of showing error
  if (!matched) {
    console.log('Route not found, redirecting to dashboard');
    navigate('');
    return;
  }

  // Ensure layout is rendered
  if (!layoutRendered) {
    const { Layout } = await import('./components/layout/Layout.js');
    const { el, main } = Layout();
    appContainer.innerHTML = '';
    appContainer.appendChild(el);
    appContainer._mainContainer = main;
    layoutRendered = true;
  }

  const mainContainer = appContainer._mainContainer;

  try {
    const module = await matched.loader();
    const Page = module.default || module[Object.keys(module)[0]];
    mainContainer.innerHTML = '';
    const pageEl = await Page(matched.params);
    mainContainer.appendChild(pageEl);
  } catch (err) {
    console.error('Route error:', err);
    mainContainer.innerHTML = `<div class="page"><h1>Error loading page</h1><p>${err.message}</p></div>`;
  }
}export function navigate(path) {
  currentPath = null;
  layoutRendered = false;
  window.history.pushState({}, '', '/' + path);
  render();
}

export function initRouter(container) {
  appContainer = container;
  window.addEventListener('popstate', render);
  
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (link && link.href.startsWith(window.location.origin) && !link.hasAttribute('data-external')) {
      e.preventDefault();
      const path = link.pathname.slice(1);
      navigate(path);
    }
  });
  
  render();
}
