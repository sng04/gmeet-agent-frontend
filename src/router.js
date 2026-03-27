import { authStore } from './stores/auth.js';

// Public routes (no auth required)
const publicRoutes = {
  'login': () => import('./controllers/user/UserLoginController.js'),
  'change-password': () => import('./controllers/user/UserChangePasswordController.js'),
  'admin/login': () => import('./controllers/admin/AdminLoginController.js'),
  'admin/change-password': () => import('./controllers/admin/AdminChangePasswordController.js'),
};

const adminRoutes = {
  '': () => import('./controllers/admin/DashboardController.js'),
  'projects': () => import('./controllers/admin/ProjectsController.js'),
  'project-create': () => import('./controllers/admin/ProjectCreateController.js'),
  'project-detail': () => import('./controllers/admin/ProjectDetailController.js'),
  'project-edit': () => import('./controllers/admin/ProjectEditController.js'),
  'projects/:id': () => import('./controllers/admin/ProjectDetailController.js'),
  'agents': () => import('./controllers/admin/AgentsController.js'),
  'agent-create': () => import('./controllers/admin/AgentCreateController.js'),
  'agent-detail': () => import('./controllers/admin/AgentDetailController.js'),
  'agent-edit': () => import('./controllers/admin/AgentEditController.js'),
  'agents/:id': () => import('./controllers/admin/AgentDetailController.js'),
  'personalities': () => import('./controllers/admin/PersonalitiesController.js'),
  'skills': () => import('./controllers/admin/SkillsController.js'),
  'skill-create': () => import('./controllers/admin/SkillCreateController.js'),
  'gmail': () => import('./controllers/admin/GmailCredentialsController.js'),
  'gmail-create': () => import('./controllers/admin/GmailCreateController.js'),
  'gmail-edit': () => import('./controllers/admin/GmailEditController.js'),
  'sessions': () => import('./controllers/admin/SessionsController.js'),
  'qa': () => import('./controllers/admin/QAMonitorController.js'),
  'tokens': () => import('./controllers/admin/TokenUsageController.js'),
  'logs': () => import('./controllers/admin/AuditLogsController.js'),
  'users': () => import('./controllers/admin/UsersController.js'),
  // Session routes (reuse user controllers)
  'live': () => import('./controllers/user/LiveSessionController.js'),
  'session/:id': () => import('./controllers/user/RetroSessionController.js'),
};

const userRoutes = {
  '': () => import('./controllers/user/DashboardController.js'),
  'project-detail': () => import('./controllers/user/ProjectDetailController.js'),
  'project/:id': () => import('./controllers/user/ProjectDetailController.js'),
  'live-session': () => import('./controllers/user/LiveSessionController.js'),
  'live': () => import('./controllers/user/LiveSessionController.js'),
  'retro-session': () => import('./controllers/user/RetroSessionController.js'),
  'session/:id': () => import('./controllers/user/RetroSessionController.js'),
  'session-create': () => import('./controllers/user/SessionCreateController.js'),
  'session/create': () => import('./controllers/user/SessionCreateController.js'),
  'session-history': () => import('./controllers/user/SessionHistoryController.js'),
  'kb': () => import('./controllers/user/KnowledgeBaseController.js'),
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
  // Remove query string for route matching
  const pathWithoutQuery = path.split('?')[0];
  
  // First try exact match (routes without params)
  for (const [pattern, loader] of Object.entries(routes)) {
    if (!pattern.includes(':') && pattern === pathWithoutQuery) {
      return { loader, params: {} };
    }
  }
  
  // Then try pattern match (routes with params)
  for (const [pattern, loader] of Object.entries(routes)) {
    if (!pattern.includes(':')) continue;
    
    const paramNames = [];
    const regexPattern = pattern.replace(/:([^/]+)/g, (_, name) => {
      paramNames.push(name);
      return '([^/]+)';
    });
    const regex = new RegExp('^' + regexPattern + '$');
    const match = pathWithoutQuery.match(regex);
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
  
  // Skip if same path (compare without query string for caching)
  const pathWithoutQuery = path.split('?')[0];
  if (pathWithoutQuery === currentPath && currentPath !== null) return;
  currentPath = pathWithoutQuery;

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
    const LayoutCtrl = await import('./controllers/layout/LayoutController.js');
    const { el, main } = await LayoutCtrl.default();
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
