# MeetAgent Frontend

A vanilla JavaScript Single Page Application for the MeetAgent platform — an AI-powered Google Meet assistant that joins meetings, transcribes audio, detects questions, and generates answers from a knowledge base.

## Quick Start

```bash
# Serve the src/ directory with any static file server
npx serve src

# Or use Python
cd src && python3 -m http.server 8080
```

Open `http://localhost:8080` (or whatever port your server uses). The app will redirect to the login page.

## Architecture

This SPA uses an **HTML Template + Controller** pattern:

- **Templates** (`src/templates/`) — `.html` files containing browser-native `<template>` elements with page markup. Dynamic content slots use `data-bind` attributes; event targets use `data-action` attributes.
- **Controllers** (`src/controllers/`) — `.js` files that load a template via the Template Loader, populate dynamic data, attach event listeners, and return a DOM element for the router to mount.
- **Router** (`src/router.js`) — History API router with separate route maps for public, admin, and user routes. Handles auth guards, role-based access, and challenge flow.
- **UI Components** (`src/components/ui/`) — Reusable JS functions (`Button`, `Table`, `Modal`, etc.) that create DOM elements. Called by controllers to populate template containers.

### Why this pattern?

HTML lives in `.html` files (full IDE support, linting, Emmet), behavior lives in `.js` files. No frameworks, no build tools, no virtual DOM. The browser-native `<template>` element is cloned on each render, which is faster than `innerHTML` parsing.

## Project Structure

```
src/
├── index.html                  # Entry point
├── main.js                     # App init (restore auth, start router)
├── router.js                   # Client-side routing
├── api/                        # API client modules
├── templates/                  # HTML template files
│   ├── layout/layout.html      # App shell (topbar + sidebar + main)
│   ├── admin/                  # 20 admin page templates
│   └── user/                   # 9 user page templates
├── controllers/                # Controller JS files
│   ├── layout/LayoutController.js
│   ├── admin/                  # 20 admin controllers
│   └── user/                   # 9 user controllers
├── components/ui/              # Reusable UI components
├── stores/                     # State management (observer pattern)
├── utils/                      # Utilities (template loader, DOM helpers, formatting)
└── styles/                     # CSS (variables, base, layout, components, pages)
```

## Key Concepts

### Template Loader

```javascript
import { loadTemplate } from './utils/template.js';

// Fetches the .html file, parses it, caches the Document,
// clones the <template> by ID, returns the firstElementChild
const el = await loadTemplate('/templates/admin/dashboard.html', 'dashboard');
```

The loader caches parsed documents in a `Map` — subsequent calls for the same file skip the network fetch.

### Controller Pattern

Every page follows this pattern:

```javascript
import { loadTemplate } from '../../utils/template.js';
import { navigate } from '../../router.js';

export default async function MyPageController(params) {
  const el = await loadTemplate('/templates/area/my-page.html', 'my-page');

  // 1. Populate data-bind elements
  el.querySelector('[data-bind="title"]').textContent = 'Hello';

  // 2. Attach data-action event listeners
  el.querySelector('[data-action="save"]').addEventListener('click', () => {
    navigate('somewhere');
  });

  // 3. Use UI components for dynamic sections
  el.querySelector('[data-bind="table"]').appendChild(Table({ ... }));

  return el;
}
```

### data-bind / data-action Conventions

In templates:
```html
<h1 data-bind="title">Placeholder</h1>
<div data-bind="tableContainer"></div>
<button data-action="cancel">Cancel</button>
<a href="#" data-action="navBack" data-to="projects">Back</a>
```

In controllers:
```javascript
el.querySelector('[data-bind="title"]').textContent = 'Actual Title';
el.querySelector('[data-action="cancel"]').addEventListener('click', () => navigate('list'));
```

### Routing

Routes map URL paths to controller imports:

```javascript
const adminRoutes = {
  '': () => import('./controllers/admin/DashboardController.js'),
  'projects': () => import('./controllers/admin/ProjectsController.js'),
  'projects/:id': () => import('./controllers/admin/ProjectDetailController.js'),
  // ...
};
```

Navigate programmatically:
```javascript
import { navigate } from './router.js';
navigate('projects');        // → /projects
navigate('project-detail');  // → /project-detail
```

### State Management

Two stores using the observer pattern:

```javascript
import { authStore } from './stores/auth.js';

// Read state
const { user, isAdmin } = authStore.getState();

// Subscribe to changes
authStore.subscribe((state) => {
  console.log('Auth changed:', state);
});

// Mutate
authStore.setUser({ role: 'admin', name: 'Admin' });
authStore.logout();
```

## Adding a New Page

1. Create the template: `src/templates/admin/my-page.html`
```html
<template id="my-page">
  <div class="page">
    <div class="pg-hdr">
      <div><h1>My Page</h1></div>
    </div>
    <div data-bind="content"></div>
  </div>
</template>
```

2. Create the controller: `src/controllers/admin/MyPageController.js`
```javascript
import { loadTemplate } from '../../utils/template.js';

export default async function MyPageController(params) {
  const el = await loadTemplate('/templates/admin/my-page.html', 'my-page');
  el.querySelector('[data-bind="content"]').textContent = 'Hello world';
  return el;
}
```

3. Add the route in `src/router.js`:
```javascript
const adminRoutes = {
  // ...existing routes...
  'my-page': () => import('./controllers/admin/MyPageController.js'),
};
```

4. Add a nav item in `src/controllers/layout/LayoutController.js` (in the `adminMenu` array).

## Portals

### Admin Portal
- Blue branding (`--pri-500`)
- Full CRUD for projects, agents, skills, gmail credentials, users
- Monitoring: Q&A, token usage, audit logs
- Login at `/admin/login`

### User Portal
- Green branding (`--ok-500`)
- Session management: create, live view, retrospective review
- AI chat for session analysis
- Collapsible sidebar
- Login at `/login`

## API Integration

Pages with real API calls (not mock data):
- Gmail Credentials — `botCredentialApi` (list, create, update, delete, pool management)
- Users — `usersApi` (list, create, delete)
- Auth — `authApi` (admin login, user login, change password, logout)

All other pages currently use hardcoded mock data. To connect a page to a real API, replace the mock data constants in the controller with API calls.

## Design System

CSS is in `src/styles/` with variables defined in `variables.css`. Key class conventions:

| Element | Classes |
|---------|---------|
| Buttons | `.btn .btn-p` (primary), `.btn-s` (secondary), `.btn-g` (ghost), `.btn-d` (danger) |
| Badges | `.badge .b-ok`, `.b-warn`, `.b-err`, `.b-live`, `.b-summary`, `.b-ended` |
| Cards | `.card`, `.stat`, `.card-hdr`, `.card-body` |
| Tables | `.tbl-wrap`, `.tbl-hdr`, `.tbl-foot` |
| Forms | `.form-g`, `.form-l`, `.form-i`, `.form-sel`, `.form-ta` |
| Layout | `.topbar`, `.sidebar`, `.main`, `.page` |

## Reference Templates

Static HTML mockups of the full UI are in `example/`:
- `example/admin-portal-revised.html` — all admin pages
- `example/user-portal-revised.html` — all user pages
