# MeetAgent SPA - Vanilla JS Architecture

## Overview
Single Page Application using Vanilla JavaScript with a minimal router for Admin and User portals of MeetAgent.

## Tech Stack
- **Vanilla JavaScript** (ES6+ modules)
- **Minimal custom router** (hash-based or History API)
- **CSS Variables** for theming
- **Fetch API** for HTTP requests

## Folder Structure

```
src/
├── index.html              # Entry point HTML
├── main.js                 # App initialization
├── router.js               # Client-side router
├── api/
│   ├── client.js           # Base fetch wrapper with auth
│   ├── auth.js             # Login, logout, token refresh
│   ├── projects.js         # Projects CRUD
│   ├── agents.js           # Agents endpoints
│   ├── sessions.js         # Sessions & Q&A endpoints
│   └── gmail.js            # Gmail credentials
├── components/
│   ├── layout/
│   │   ├── Topbar.js       # Header with logo, avatar
│   │   ├── Sidebar.js      # Navigation sidebar
│   │   └── Layout.js       # Main layout wrapper
│   ├── ui/
│   │   ├── Button.js       # .btn, .btn-p, .btn-s, etc
│   │   ├── Badge.js        # .badge, .b-ok, .b-live, etc
│   │   ├── Card.js         # .card, .stat
│   │   ├── Table.js        # .tbl-wrap with pagination
│   │   ├── Form.js         # .form-g, .form-i, .form-sel
│   │   └── Modal.js        # Dialog/modal component
│   └── shared/
│       ├── QAItem.js       # Q&A pair display
│       ├── LiveWidget.js   # Live session indicator
│       └── ProjectCard.js  # Project card for dashboard
├── pages/
│   ├── admin/
│   │   ├── Dashboard.js
│   │   ├── Projects.js
│   │   ├── ProjectDetail.js
│   │   ├── ProjectCreate.js
│   │   ├── Agents.js
│   │   ├── AgentDetail.js
│   │   ├── Skills.js
│   │   ├── GmailCredentials.js
│   │   ├── QAMonitor.js
│   │   ├── TokenUsage.js
│   │   └── AuditLogs.js
│   └── user/
│       ├── Dashboard.js
│       ├── ProjectDetail.js
│       ├── LiveSession.js
│       ├── RetroSession.js
│       ├── SessionCreate.js
│       └── KnowledgeBase.js
├── stores/
│   ├── auth.js             # Auth state (user, token, role)
│   └── app.js              # Global state (current project, etc)
├── utils/
│   ├── dom.js              # DOM helper functions
│   ├── format.js           # Date, number formatting
│   └── storage.js          # LocalStorage wrapper
└── styles/
    ├── variables.css       # CSS custom properties
    ├── base.css            # Reset, typography, scrollbar
    ├── layout.css          # Topbar, sidebar, main
    ├── components.css      # Buttons, badges, cards, tables
    └── pages.css           # Page-specific styles
```

## Design System (from HTML templates)

### CSS Variables
```css
:root {
  /* Colors */
  --white: #FFFFFF;
  --gray-25: #FCFCFD;
  --gray-50: #F9FAFB;
  --gray-100: #F2F4F7;
  --gray-200: #EAECF0;
  --gray-300: #D0D5DD;
  --gray-400: #98A2B3;
  --gray-500: #667085;
  --gray-600: #475467;
  --gray-700: #344054;
  --gray-800: #1D2939;
  --gray-900: #101828;
  
  --pri-25: #F0F6FF;
  --pri-50: #E0EDFF;
  --pri-100: #C2DBFF;
  --pri-400: #3B82F6;
  --pri-500: #2563EB;
  --pri-600: #1D4ED8;
  --pri-700: #1E40AF;
  
  --ok-50: #ECFDF5;
  --ok-500: #10B981;
  --ok-700: #047857;
  
  --warn-50: #FFFBEB;
  --warn-500: #F59E0B;
  --warn-700: #B45309;
  
  --err-50: #FEF2F2;
  --err-500: #EF4444;
  --err-700: #B91C1C;
  
  /* Typography */
  --font: 'Outfit', sans-serif;
  --mono: 'DM Mono', monospace;
  
  /* Layout */
  --sidebar-w: 248px;
  --topbar-h: 56px;
}
```

### Component Classes
- Buttons: `.btn`, `.btn-p` (primary), `.btn-s` (secondary), `.btn-g` (ghost), `.btn-d` (danger)
- Badges: `.badge`, `.b-ok`, `.b-warn`, `.b-err`, `.b-live`, `.b-pri`
- Cards: `.card`, `.stat`, `.card-hdr`, `.card-body`
- Tables: `.tbl-wrap`, `.tbl-hdr`, `.tbl-foot`
- Forms: `.form-g`, `.form-l`, `.form-i`, `.form-sel`, `.form-ta`
- Layout: `.topbar`, `.sidebar`, `.main`, `.page`

## Patterns & Conventions

### Component Pattern
```javascript
// components/ui/Button.js
export function Button({ text, variant = 'primary', size = 'md', onClick }) {
  const btn = document.createElement('button');
  btn.className = `btn btn-${variant[0]} ${size === 'sm' ? 'btn-sm' : ''}`;
  btn.textContent = text;
  if (onClick) btn.addEventListener('click', onClick);
  return btn;
}
```

### Page Pattern
```javascript
// pages/admin/Dashboard.js
import { api } from '../../api/client.js';
import { StatCard } from '../../components/ui/Card.js';

export async function DashboardPage() {
  const container = document.createElement('div');
  container.className = 'page';
  container.id = 'p-dashboard';
  
  // Fetch data
  const stats = await api.get('/dashboard/stats');
  
  // Render
  container.innerHTML = `
    <div class="pg-hdr">
      <div>
        <h1>Dashboard</h1>
        <div class="pg-sub">Overview of your GMeet Agent system</div>
      </div>
    </div>
    <div class="g g4 mb-6" id="stats-grid"></div>
  `;
  
  // Populate stats
  const grid = container.querySelector('#stats-grid');
  stats.forEach(s => grid.appendChild(StatCard(s)));
  
  return container;
}
```

### Router Pattern
```javascript
// router.js
const routes = {
  '/': () => import('./pages/admin/Dashboard.js'),
  '/projects': () => import('./pages/admin/Projects.js'),
  '/projects/:id': () => import('./pages/admin/ProjectDetail.js'),
  // ...
};

export function navigate(path) {
  window.history.pushState({}, '', path);
  render(path);
}

async function render(path) {
  const main = document.querySelector('.main');
  const { default: Page } = await matchRoute(path);
  main.innerHTML = '';
  main.appendChild(await Page());
}
```

### API Client Pattern
```javascript
// api/client.js
const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

class ApiClient {
  constructor() {
    this.token = localStorage.getItem('token');
  }

  async request(endpoint, options = {}) {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
      },
      ...options,
    });
    
    if (res.status === 401) {
      this.token = null;
      localStorage.removeItem('token');
      navigate('/login');
      throw new Error('Unauthorized');
    }
    
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  get(endpoint) { return this.request(endpoint); }
  post(endpoint, data) { return this.request(endpoint, { method: 'POST', body: JSON.stringify(data) }); }
  put(endpoint, data) { return this.request(endpoint, { method: 'PUT', body: JSON.stringify(data) }); }
  delete(endpoint) { return this.request(endpoint, { method: 'DELETE' }); }
}

export const api = new ApiClient();
```

### State Management Pattern
```javascript
// stores/auth.js
const state = {
  user: null,
  token: localStorage.getItem('token'),
  isAdmin: false,
};

const listeners = new Set();

export const authStore = {
  getState: () => ({ ...state }),
  
  subscribe: (fn) => {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  
  setUser: (user) => {
    state.user = user;
    state.isAdmin = user?.role === 'admin';
    listeners.forEach(fn => fn(state));
  },
  
  logout: () => {
    state.user = null;
    state.token = null;
    localStorage.removeItem('token');
    listeners.forEach(fn => fn(state));
  },
};
```

## API Endpoints (Expected)

### Auth
- `POST /auth/login` - Login
- `POST /auth/logout` - Logout
- `GET /auth/me` - Get current user

### Projects
- `GET /projects` - List projects
- `GET /projects/:id` - Get project detail
- `POST /projects` - Create project
- `PUT /projects/:id` - Update project
- `DELETE /projects/:id` - Delete project

### Agents
- `GET /agents` - List agents
- `GET /agents/:id` - Get agent detail
- `POST /agents` - Create agent
- `PUT /agents/:id` - Update agent

### Sessions
- `GET /sessions` - List sessions
- `GET /sessions/:id` - Get session detail
- `GET /sessions/:id/qa` - Get Q&A pairs
- `POST /sessions` - Create session

### Knowledge Base
- `GET /kb/folders` - List KB folders
- `GET /kb/folders/:id/documents` - List documents
- `POST /kb/documents` - Upload document

## Portal Differences

### Admin Portal
- Logo icon color: `--pri-500` (blue)
- Badge: "Admin Portal"
- Menu: Dashboard, Projects, Agents, Skills, Gmail Credentials, Q&A Monitor, Token Usage, Audit Logs
- Full CRUD access

### User Portal
- Logo icon color: `--ok-500` (green)
- Badge: "User Portal"
- Menu: Dashboard, Live Session (if active)
- Collapsible sidebar
- Read-only for most data
- Focus on session management

## File References
- Admin UI template: #[[file:example/admin-portal-revised.html]]
- User UI template: #[[file:example/user-portal-revised.html]]
