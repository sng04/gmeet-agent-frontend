# STEERING.md — MeetAgent Design System Guide

> This document tells engineers how to use, extend, and maintain the MeetAgent design system.
> Read this before writing any frontend code.

---

## 1. Design Principles

1. **Consistency over cleverness.** Use tokens. Don't invent colors, spacing, or shadows.
2. **Full pages over popups.** All CRUD forms (create agent, edit project, add credential) open as full pages with breadcrumb navigation. Modals are ONLY for confirmations ("Are you sure you want to delete?").
3. **Clickable stat cards.** Dashboard stat cards link to their respective menu pages.
4. **Status colors are semantic.** Live = red (urgent). Completed = green (success). Scheduled = blue (informational). Idle = gray. Never use "failed" for sessions.
5. **Never show secrets.** Gmail passwords are always `type="password"` with dot masking. No plain text, no toggle-to-reveal.
6. **Chat-style for AI interactions.** Test prompt (admin) and AI chat (user retro) use WhatsApp-style bubbles, not forms or text areas.
7. **Connection quality, not just "connected."** Show latency in ms with a quality badge (good/fair/poor) using signal bars.

---

## 2. How to Use Tokens

All design primitives live in `src/styles/tokens.css`. Import it first.

```css
@import './tokens.css';
@import './base.css';
@import './utilities.css';
@import './layouts.css';
@import './components.css';
```

### Color usage

| Context               | Token                     |
|-----------------------|---------------------------|
| Body text             | `var(--gray-900)`         |
| Muted/secondary text  | `var(--gray-500)`         |
| Subtle text           | `var(--gray-400)`         |
| Borders               | `var(--bc-default)`       |
| Dividers              | `var(--bc-divider)`       |
| Primary action        | `var(--pri-500)`          |
| Error/danger          | `var(--err-500)`          |
| Success               | `var(--ok-500)`           |
| Warning               | `var(--warn-500)`         |
| Live session          | `var(--status-live-*)`    |
| Completed session     | `var(--status-completed-*)` |

### Spacing scale

Use `var(--sp-N)` where N ∈ {0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16}.
- sp-1 = 4px (tight inner padding)
- sp-3 = 12px (standard inner gap)
- sp-4 = 16px (card gap)
- sp-6 = 24px (section gap / page padding)

### Don't

- Don't use raw hex. Always use token variables.
- Don't use `px` for spacing if a token exists.
- Don't add new colors without updating tokens.css.

---

## 3. How to Create New Components

1. Check if a component already exists in `components.css`.
2. If not, add it to `components.css` under a new section header:
   ```css
   /* ══════════════════════════════════════
      YOUR_COMPONENT_NAME
      ══════════════════════════════════════ */
   ```
3. Prefix with a descriptive BEM-ish name: `.component-name`, `.component-name__child`, `.component-name--variant`.
4. Use tokens for all values.
5. Document the component's purpose in a comment.

---

## 4. Naming Conventions

| What             | Convention           | Example                      |
|------------------|----------------------|------------------------------|
| CSS class        | BEM-ish, kebab-case  | `.qna-card__meta`            |
| CSS variable     | `--category-name`    | `--pri-500`, `--sp-4`        |
| Page ID          | `page-{name}`        | `page-dashboard`             |
| Data attribute   | `data-nav="{page}"`  | `data-nav="agent-detail"`    |
| JS mock data     | UPPER_SNAKE_CASE     | `QNA_PAIRS`, `AGENTS`        |

---

## 5. Layout Rules

### App shell
```
┌─────────────────────────────┐
│           TOPBAR            │ ← 56px fixed
├──────┬──────────────────────┤
│      │                      │
│ SIDE │       MAIN           │
│ BAR  │    (scrollable)      │
│      │                      │
│      │   [RIGHT PANEL]      │ ← optional, for retro AI chat
└──────┴──────────────────────┘
```

- Topbar: logo, portal badge, avatar (with dropdown for login/logout).
- Sidebar: collapsible (toggle icon), nav items, session listing (user portal), user card at bottom.
- Main: scrollable content area. Pages use `.page` class with `display:none/block`.
- Right panel: only on user session detail in retro mode, for AI chat.

### Page structure
Every page follows:
1. Breadcrumb (if nested, e.g., Agents → Agent Detail)
2. Page header (`.pg-hdr` with title, subtitle, action buttons)
3. Content (cards, tables, forms)

---

## 6. Page Composition Rules

### Dashboard pages
```
pg-hdr → stat cards (grid) → live widget (user only) → tables
```

### List pages (Agents, Projects, Sessions, QnA)
```
pg-hdr (with Create button) → filter-bar → tbl-wrap with table
```

### Detail/Edit pages (Agent Detail, Project Detail, Gmail Edit)
```
breadcrumb → pg-hdr (with Save/Delete) → cards with form groups
```
These are ALWAYS full pages. NEVER popups or modals.

### Session detail (user)
```
breadcrumb → pg-hdr (with mode toggle + connection indicator) → [content + right panel]
```

---

## 7. Status Badge Rules

| Status      | Badge class          | Dot animation? | Used for              |
|-------------|----------------------|----------------|-----------------------|
| Live        | `.badge--live`       | Yes (pulse)    | Active sessions       |
| Completed   | `.badge--completed`  | No             | Finished sessions     |
| Scheduled   | `.badge--scheduled`  | No             | Upcoming sessions     |
| Idle        | `.badge--idle`       | No             | Inactive/disconnected |
| Active      | `.badge--active`     | No             | Agent enabled         |
| Disabled    | `.badge--disabled`   | No             | Agent disabled        |

**Never use "Failed" status for sessions.**

---

## 8. Forms Behavior

- All form fields use `.form-group > .form-label + .form-input` pattern.
- Required fields: add `<span class="required">*</span>` in label.
- Hints: `.form-hint` below input.
- Errors: `.form-input--error` on input + `.form-error` message below.
- System prompts / code: use `.form-textarea` with `font-family: var(--font-mono)`.
- Passwords: ALWAYS `type="password"`. No toggle-to-reveal.
- Toggles: use `.toggle` component for enable/disable switches.

---

## 9. Table Rules

- Wrap in `.tbl-wrap` for border/radius.
- Optional `.tbl-header` for title + actions.
- Clickable rows: add `.clickable` class + `data-nav` attribute.
- Align action buttons to the right with `text-align:right` on th/td.
- Review buttons use light gray background: `background:var(--gray-50)`.
- Sort live sessions before completed in all session tables.

---

## 10. Modal Rules

Modals are ONLY for:
- Delete confirmations ("Are you sure?")
- Quick one-field prompts

Modals are NEVER for:
- Create forms
- Edit forms
- Multi-field entry

Use `.modal-overlay.open` to show, remove `.open` to hide.

---

## 11. Empty / Loading / Error Standards

| State   | Class          | Content                                 |
|---------|----------------|-----------------------------------------|
| Empty   | `.empty-state` | Icon + title + description + CTA button |
| Loading | `.loading`     | Spinner + optional text                 |
| Error   | `.error-state` | Icon + title + description + retry btn  |

Every page/section that fetches data should handle all three states.

---

## 12. Accessibility Baseline

- All interactive elements are keyboard-accessible.
- `:focus-visible` outlines on buttons, inputs, links.
- Color alone never conveys meaning (badges combine color + text + dot).
- Form labels are always associated with inputs.
- Use `.sr-only` for screen-reader-only text.
- Ensure 4.5:1 contrast for text (our gray-500 on white = 4.6:1 ✓).

---

## 13. Do / Don't Examples

### ✅ DO
- Use `data-nav="agent-detail"` on table rows to navigate to detail pages.
- Put the project selector where users expect it (in page header area, not hidden in topbar).
- Show connection latency in ms with quality indicator (good/fair/poor).
- Sort sessions: live first, then completed.
- Auto-generate Meet links (don't ask user to paste).
- Use chat bubbles for test prompt and AI follow-up chat.
- Show "Last Updated" timestamps with refresh button on QnA pages.
- Categorize knowledge base by project prefix/tag.

### ❌ DON'T
- Don't use modals/popups for create or edit forms.
- Don't show Gmail passwords in plain text, ever.
- Don't display "Failed" session status.
- Don't put a random search button in the topbar.
- Don't include a Documents menu in the user portal.
- Don't let users upload to the knowledge base (admin only).
- Don't make the live widget look boring — use `livePulse` animation.
- Don't separate "Active Sessions" and "Total Sessions" into two stat cards — combine them.

---

## 14. Maintaining Consistency

When adding a new page:
1. Copy an existing page of the same type (list, detail, or dashboard).
2. Use existing components. If you need a new one, add it to `components.css`.
3. Follow the naming conventions exactly.
4. Test the three states (empty, loading, data).
5. Make table rows clickable if they lead to detail pages.
6. Add breadcrumbs for any page deeper than the sidebar nav.

When updating tokens:
1. Update `tokens.css` only.
2. Grep for any hardcoded values that should use the new token.
3. Test both portals — they share the same token file.

---

## 15. Portal Differences Quick Reference

| Feature                  | Admin Portal | User Portal |
|--------------------------|:------------:|:-----------:|
| Dashboard                | ✓            | ✓           |
| Projects (manage)        | ✓            | —           |
| Projects (view/switch)   | —            | ✓           |
| Agents (full CRUD)       | ✓            | —           |
| Knowledge Base           | ✓            | —           |
| Gmail Credentials        | ✓            | —           |
| Sessions (monitor)       | ✓            | ✓           |
| Sessions (live/retro)    | —            | ✓           |
| QnA Pairs (view)         | ✓            | ✓           |
| AI Chat (retro)          | —            | ✓           |
| Test Prompt (agent)      | ✓            | —           |
| Documents (view)         | ✓ (KB)       | —           |
| New Session              | —            | ✓           |

---

## 16. Backend / API Integration Notes

See README.md § "Backend Integration Notes" for the full mapping.
Key points:
- QnA pairs → DynamoDB. Include `lastUpdated` timestamp.
- Retrospectives → S3 (saved as markdown).
- Transcripts → DynamoDB (raw).
- Knowledge base → OpenSearch (single index, differentiated by project prefix).
- Gmail passwords → encrypted at rest, decrypted in memory only.
- Session meet links → auto-generated by backend when bot joins.
- Each project → S3 bucket.
- Email credentials → per agent, not per project.
