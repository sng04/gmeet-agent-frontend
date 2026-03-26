# MeetAgent SPA - Vanilla JS Architecture

## Overview
Single Page Application using Vanilla JavaScript with an HTML Template + Controller pattern for Admin and User portals. Page markup lives in `.html` template files using browser-native `<template>` elements; behavior lives in controller `.js` files that load templates, populate data, and attach events.

## Tech Stack
- **Vanilla JavaScript** (ES6+ modules)
- **Browser-native `<template>` elements** for HTML markup
- **Template Loader utility** (`src/utils/template.js`) for fetching, parsing, caching templates
- **History API router** with auth guards and role-based access
- **CSS Variables** for theming
- **Fetch API** for HTTP requests

## Architecture Rules
- **Separate template + controller only when the view is a distinct route** (each page gets its own pair)
- **Inline subcomponents into their parent** when they're only used in one place and don't need independent refresh
- **Layout is a single consolidated file** — topbar, sidebar, and shell are all in `layout.html` + `LayoutController.js`
- **UI components** (`Button`, `Table`, `Modal`, etc.) stay as JS functions since they're genuinely reusable across many controllers

## Folder Structure

```
src/
├── index.html              # Entry point HTML
├── main.js                 # App initialization
├── router.js               # Client-side router (History API)
├── api/                    # API client modules (unchanged)
│   ├── client.js           # Base fetch wrapper with auth
│   ├── auth.js             # Login, logout, token refresh
│   ├── projects.js         # Projects CRUD
│   ├── agents.js           # Agents endpoints
│   ├── sessions.js         # Sessions & Q&A endpoints
│   ├── users.js            # Users CRUD
│   ├── botCredential.js    # Gmail/bot credentials
│   └── botPool.js          # Bot pool management
├── templates/
│   ├── layout/
│   │   └── layout.html     # Consolidated layout (topbar + sidebar + main)
│   ├── admin/              # 20 admin page templates
│   │   ├── dashboard.html
│   │   ├── projects.html
│   │   ├── project-detail.html
│   │   ├── project-create.html
│   │   ├── project-edit.html
│   │   ├── agents.html
│   │   ├── agent-create.html
│   │   ├── agent-detail.html
│   │   ├── agent-edit.html
│   │   ├── skills.html
│   │   ├── skill-create.html
│   │   ├── gmail-credentials.html
│   │   ├── gmail-create.html
│   │   ├── gmail-edit.html
│   │   ├── qa-monitor.html
│   │   ├── token-usage.html
│   │   ├── audit-logs.html
│   │   ├── users.html
│   │   ├── login.html
│   │   └── change-password.html
│   └── user/               # 9 user page templates
│       ├── dashboard.html
│       ├── project-detail.html
│       ├── live-session.html
│       ├── retro-session.html
│       ├── session-create.html
│       ├── session-history.html
│       ├── knowledge-base.html
│       ├── login.html
│       └── change-password.html
├── controllers/
│   ├── layout/
│   │   └── LayoutController.js   # Consolidated (topbar + sidebar + shell)
│   ├── admin/              # 20 admin page controllers
│   │   ├── DashboardController.js
│   │   ├── ProjectsController.js
│   │   ├── ProjectDetailController.js
│   │   ├── ProjectCreateController.js
│   │   ├── ProjectEditController.js
│   │   ├── AgentsController.js
│   │   ├── AgentCreateController.js
│   │   ├── AgentDetailController.js
│   │   ├── AgentEditController.js
│   │   ├── SkillsController.js
│   │   ├── SkillCreateController.js
│   │   ├── GmailCredentialsController.js
│   │   ├── GmailCreateController.js
│   │   ├── GmailEditController.js
│   │   ├── QAMonitorController.js
│   │   ├── TokenUsageController.js
│   │   ├── AuditLogsController.js
│   │   ├── UsersController.js
│   │   ├── AdminLoginController.js
│   │   └── AdminChangePasswordController.js
│   └── user/               # 9 user page controllers
│       ├── DashboardController.js
│       ├── ProjectDetailController.js
│       ├── LiveSessionController.js
│       ├── RetroSessionController.js
│       ├── SessionCreateController.js
│       ├── SessionHistoryController.js
│       ├── KnowledgeBaseController.js
│       ├── UserLoginController.js
│       └── UserChangePasswordController.js
├── components/
│   └── ui/                 # Reusable UI component functions
│       ├── Button.js
│       ├── Badge.js
│       ├── Card.js
│       ├── Table.js
│       ├── Form.js
│       ├── Modal.js
│       ├── Alert.js
│       └── Toggle.js
├── stores/                 # State management (observer pattern)
│   ├── auth.js
│   └── app.js
├── utils/
│   ├── template.js         # Template Loader (fetch, parse, cache, clone)
│   ├── dom.js
│   ├── format.js
│   └── storage.js
└── styles/                 # CSS (unchanged)
    ├── variables.css
    ├── base.css
    ├── layout.css
    ├── components.css
    └── pages.css
```

## Patterns

### Template + Controller Pattern
```html
<!-- templates/admin/projects.html -->
<template id="projects">
  <div class="page">
    <div class="pg-hdr">
      <div><h1>Projects</h1><div class="pg-sub">Manage projects</div></div>
      <div class="pg-actions" data-bind="actions"></div>
    </div>
    <div class="filters" data-bind="filters"></div>
    <div data-bind="table"></div>
  </div>
</template>
```

```javascript
// controllers/admin/ProjectsController.js
import { loadTemplate } from '../../utils/template.js';
import { Table } from '../../components/ui/Table.js';
import { Button } from '../../components/ui/Button.js';
import { navigate } from '../../router.js';

export default async function ProjectsController(params) {
  const el = await loadTemplate('/templates/admin/projects.html', 'projects');
  el.querySelector('[data-bind="actions"]').appendChild(
    Button({ text: '+ New Project', variant: 'p', onClick: () => navigate('project-create') })
  );
  // ... populate table, filters
  return el;
}
```

### Conventions
- `data-bind="name"` — marks elements for dynamic content population
- `data-action="cancel"` — marks elements for event listener attachment
- `data-action="navBack"` with `data-to="route"` — breadcrumb back navigation
- Templates use `loadTemplate('/templates/area/page.html', 'template-id')`

## Design System
Same CSS variables and component classes as before. See `src/styles/variables.css` for the full set.

### Key Classes
- Buttons: `.btn`, `.btn-p`, `.btn-s`, `.btn-g`, `.btn-d`, `.btn-ok`, `.btn-live`
- Badges: `.badge`, `.b-ok`, `.b-warn`, `.b-err`, `.b-live`, `.b-summary`, `.b-ended`
- Cards: `.card`, `.stat`, `.card-hdr`, `.card-body`
- Tables: `.tbl-wrap`, `.tbl-hdr`, `.tbl-foot`
- Forms: `.form-g`, `.form-l`, `.form-i`, `.form-sel`, `.form-ta`
- Layout: `.topbar`, `.sidebar`, `.main`, `.page`, `.layout`

## File References
- Admin UI template: #[[file:example/admin-portal-revised.html]]
- User UI template: #[[file:example/user-portal-revised.html]]
