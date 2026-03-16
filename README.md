# MeetAgent Design System

> Frontend design system and page scaffold for the Google Meet Agent System.
> Provides reusable tokens, components, layouts, and page templates for both Admin and User portals.

---

## Quick Start

```bash
# 1. Copy the meetagent-ds/ folder into your project
# 2. Import styles in order:
#    tokens.css → base.css → utilities.css → layouts.css → components.css
# 3. Reference page templates in src/pages/ for structure
# 4. Use mock data from src/data/mockData.js for development
# 5. Read STEERING.md before writing any new code
```

### Font Dependencies

Load these from Google Fonts (or host locally):
```html
<link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
```

---

## Frontend Architecture

The system is a **static HTML + CSS** design system, not a framework-specific implementation. It is designed to be consumed by any frontend framework (React, Vue, plain HTML) or converted into framework-specific components.

### Architecture pattern
```
Design Tokens (CSS variables)
    ↓
Base Styles (reset, typography)
    ↓
Utility Classes (flex, spacing, text)
    ↓
Layout Patterns (app shell, sidebar, topbar, page)
    ↓
Components (buttons, badges, cards, tables, forms, chat)
    ↓
Page Templates (composed from the above)
    ↓
Mock Data (JSON-shaped JS for development)
```

### Key decisions
- **CSS-only design system** — no JS framework dependency, easily portable.
- **BEM-ish naming** — `.component__element--modifier` for clarity.
- **Token-driven** — all colors, spacing, radii, shadows come from `tokens.css`.
- **Two portals, shared design system** — Admin and User portals use the same tokens and components, differentiated by context (logo color, portal badge, sidebar nav items).

---

## Folder Tree

```
meetagent-ds/
├── README.md                          # This file
├── STEERING.md                        # Engineer guide (read first!)
├── src/
│   ├── styles/
│   │   ├── tokens.css                 # Design tokens (colors, spacing, typography, status)
│   │   ├── base.css                   # Reset, typography, animations
│   │   ├── utilities.css              # Single-purpose helpers
│   │   ├── layouts.css                # App shell, sidebar, topbar, page, right panel
│   │   └── components.css             # All reusable UI components
│   ├── components/                    # (Empty — for framework-specific components later)
│   ├── pages/
│   │   ├── admin/
│   │   │   ├── dashboard.html         # Admin dashboard
│   │   │   ├── projects.html          # Projects list
│   │   │   ├── project-detail.html    # Project detail (full page)
│   │   │   ├── agents.html            # Agents list
│   │   │   ├── agent-detail.html      # Agent detail/edit (full page) + test prompt chat
│   │   │   ├── knowledge-base.html    # Knowledge base (categorized by project prefix)
│   │   │   ├── sessions.html          # Sessions list
│   │   │   ├── qna-pairs.html         # QnA pairs list with filters
│   │   │   └── gmail-credentials.html # Gmail creds list + edit page
│   │   └── user/
│   │       ├── dashboard.html         # User dashboard (project selector, live widget)
│   │       ├── sessions.html          # Session history with search/filter
│   │       ├── session-detail.html    # Session detail (live/retro toggle + AI chat)
│   │       ├── qna-pairs.html         # QnA pairs with search/filter
│   │       └── new-session.html       # New session form (auto-generated meet link)
│   ├── data/
│   │   └── mockData.js                # Mock data for all entities
│   └── assets/                        # (Empty — for icons, images later)
└── docs/                              # (Empty — for additional documentation)
```

---

## Page Map

### Admin Portal

| Sidebar Menu       | Page              | Description                                      |
|--------------------|-------------------|--------------------------------------------------|
| Dashboard          | dashboard         | Stats, recent sessions, recent QnA pairs         |
| Projects           | projects          | List → click to project-detail                   |
| —                  | project-detail    | Full page: settings, agents, KB, sessions tabs   |
| —                  | project-create    | Full page: create new project form               |
| Agents             | agents            | List → click to agent-detail                     |
| —                  | agent-detail      | Full page: config, system prompt, KB, test chat  |
| —                  | agent-create      | Full page: create new agent form                 |
| Knowledge Base     | knowledge-base    | Documents categorized by project prefix/tag      |
| Sessions           | sessions          | All sessions, monitor-only (no live/retro)       |
| QnA Pairs          | qna-pairs         | Chronological, with project column + filters     |
| Gmail Credentials  | gmail-credentials | List → edit on full page                         |
| —                  | gmail-edit        | Full page: edit credential form                  |
| —                  | gmail-add         | Full page: add new credential form               |

### User Portal

| Sidebar Menu       | Page              | Description                                      |
|--------------------|-------------------|--------------------------------------------------|
| Dashboard          | user-dashboard    | Project selector, live widget, stats, sessions   |
| Sessions           | user-sessions     | History with search/filter; live first            |
| — New Session      | user-new-session  | Create session (meet link auto-generated)        |
| — Session Detail   | user-session      | Live/Retro toggle + AI chat sidebar              |
| QnA Pairs          | user-qna          | Search/filter historical QnA pairs               |

#### Sidebar Session Listing (User Portal)
The user sidebar also shows:
- **Active Sessions** (with red pulsing dot)
- **Previous Sessions** (with green dot) — listed below active ones

---

## Design System Summary

### Tokens (tokens.css)
- **15 gray** shades from gray-25 to gray-900
- **7 primary** blue shades (pri-25 to pri-700)
- **4 status** color families: ok (green), warn (amber), err (red), info (cyan)
- **Semantic status tokens**: session states (live/completed/scheduled/idle), agent states (active/disabled), connection quality (good/fair/poor)
- **Typography**: Outfit (sans), DM Mono (mono), 8 font sizes, 5 weights
- **Spacing**: 12-step scale from 0 to 64px
- **Radius**: 6 levels from 4px to 9999px
- **Shadow**: 5 levels + 2 focus rings
- **Z-index**: 5 layers (topbar, sidebar, dropdown, modal, toast)

### Components (components.css)
- **Buttons**: primary, secondary, danger, ghost, icon; small variant
- **Stat card**: with clickable variant for dashboard navigation
- **Status badge**: live, completed, scheduled, idle, active, disabled, connection quality
- **Live widget**: animated, eye-catching dashboard card for in-progress sessions
- **Data table**: with header, clickable rows, and aligned action buttons
- **Filter bar**: search input + select dropdowns
- **Form controls**: input, textarea, select, toggle switch, labels, hints, errors
- **Tab switcher**: horizontal tab navigation
- **QnA card**: question + answer + audio action row + project tag
- **Audio action row**: play button, waveform placeholder, duration
- **Transcript list**: timestamped, speaker-labeled, with question highlighting
- **Document item**: icon, name, metadata, project tag, assignment info
- **Upload zone**: dashed border drop area
- **Modal**: overlay + card (confirmation only, NOT for forms)
- **Chat bubbles**: user (blue, right-aligned) + AI (gray, left-aligned) + chat input
- **Project tag**: mono font, colored badge for prefix display
- **Connection indicator**: signal bars with latency quality
- **Mode toggle**: live/retro pill toggle
- **Card**: generic white container with header/body/footer
- **Timestamp label**: mono font with optional "last updated" indicator
- **Empty, loading, error states**: standardized patterns

---

## Backend Integration Notes

When connecting to the real backend (AWS), replace mock data with API calls. Here is the data → storage mapping:

| Data Entity       | Storage             | Notes                                    |
|-------------------|---------------------|------------------------------------------|
| QnA Pairs         | DynamoDB            | Include `lastUpdated` timestamp          |
| Retrospectives    | S3 (markdown)       | Saved after session ends                 |
| Raw Transcripts   | DynamoDB            | Full speech-to-text output               |
| Knowledge Base    | OpenSearch           | Single index, differentiated by prefix   |
| KB Documents      | S3                   | One bucket per project                   |
| Gmail Credentials | Encrypted storage    | AWS Secrets Manager or similar           |
| Session Meet Links| Auto-generated       | Created when bot joins via ECS Fargate   |
| Agent Config      | DynamoDB             | System prompt, personality, tone, KB IDs |
| Projects          | DynamoDB             | Prefix used as OpenSearch tag            |
| Users             | Cognito (or similar) | Admin creates users; users set password  |

### API endpoints to implement (suggested)

```
# Auth
POST   /auth/login
POST   /auth/change-password

# Projects
GET    /projects
POST   /projects
GET    /projects/:id
PUT    /projects/:id
DELETE /projects/:id

# Agents
GET    /agents
POST   /agents
GET    /agents/:id
PUT    /agents/:id
DELETE /agents/:id
POST   /agents/:id/test    ← test prompt

# Sessions
GET    /sessions
POST   /sessions            ← creates session + triggers bot join
GET    /sessions/:id
GET    /sessions/:id/transcript
GET    /sessions/:id/retro

# QnA Pairs
GET    /qna-pairs
GET    /qna-pairs?project=AXR&session=ses_001

# Knowledge Base
GET    /knowledge-base
POST   /knowledge-base/upload
DELETE /knowledge-base/:id

# Gmail Credentials
GET    /credentials
POST   /credentials
PUT    /credentials/:id
DELETE /credentials/:id

# WebSocket (live session)
WS     /ws/session/:id      ← real-time transcript + QnA stream
```

### Key technical notes
- **Email credentials** are assigned per agent, not per project.
- **Question detection** uses Amazon Comprehend (Lambda processes transcript).
- **Bot joins via ECS Fargate** on Firefox (Chrome blocks bots).
- **Response delivery** is audio (Amazon Polly) in the meeting + text in portal.
- **User login**: admin creates the account, user gets an email to set password.
- **Scheduled sessions**: on hold for now. Only on-demand sessions.
- **Product name**: placeholder "MeetAgent" — to be confirmed.

---

## Needs Confirmation

These items remain ambiguous from the requirements and scope documents:

1. **Retrospective knowledge base**: Should retro summaries also be indexed in OpenSearch as a second knowledge base type, or just stored in S3 for viewing? The scope doc mentions "Knowledge base retrospective" as a separate consideration.

2. **Agent-to-project cardinality**: Can one agent serve multiple projects, or is it strictly 1:1? The current mock data has TechBot Alpha assigned to AXR but also used in HLT sessions.

3. **User project assignment**: How are users assigned to projects? Through admin invitation, or self-enrollment? Affects the user portal's project selector behavior.

4. **Audio response toggle**: The scope doc says "for now only text for the AI, but if users want voice response too, it could be a future discussion." Should the UI include a placeholder for this toggle, or omit it entirely?

5. **Session scheduling**: The scope doc says "for scheduled, hold for now." The current design excludes scheduled session creation. Confirm this remains deferred.

6. **Transcription speaker tags**: The scope doc says "does not need user tag in the transcription." Does this mean no speaker labels at all, or just no labels for the user specifically? Current design shows speaker names.

7. **Knowledge base prefix vs. type**: The scope doc mentions "pemecahan knowledge base berdasarkan prefix (kalo bisa berdasarkan type mending itu)." Current design uses project prefix tags. Confirm if type-based categorization should also be explored.
