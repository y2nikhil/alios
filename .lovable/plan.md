
# ALIOS — Full App Inventory (for UI/UX redesign)

ALIOS ("AI Life Operating System") is a productivity + team‑management OS. Core loop: users "punch" into AUX statuses (Deep Work, Break, Meeting, etc.), live timers accumulate, and everything (analytics, adherence, awards, admin monitoring) is built on that session data. Around that sit a mind map canvas, YouTube learning playlists, watch parties, group/DM chat, friends, notifications, and an admin/super‑admin console.

Below is a page‑by‑page inventory — every tab, button, panel, dialog, and clickable/viewable element per screen — so a designer can redesign each surface in isolation.

---

## 0. Global shell (wraps every `/app/*` page)

File: `AppShell.tsx`.

- Left **drawer sidebar** (hidden by default; opens via Menu button, `\` shortcut, or hover on a 2px hot‑zone on the left edge). Contains:
  - ALIOS logo + tagline "AI Life OS".
  - Primary nav: Command, Timeline, Analytics, Mind Map, Collaborate, Friends, Watch Party, Playlists, Settings.
  - Admin‑only extras: Live Feed, Admin, Moderation. Super‑admin extra: Super (crown icon).
  - Divider, then **AUX status list** (color dot, name, keyboard shortcut key `1–9`). Clicking punches into that status.
  - Footer: user email.
- **Top header bar** (h‑14):
  - Menu toggle button, ALIOS mini‑logo.
  - **CommandBar** (center) — pill‑shaped search input, `⌘K` shortcut.
  - Right cluster: **LiveTimer** (colored pulse dot + status name + running `HH:MM:SS` + "Not responding" pill button that marks user Away), **NotificationBell**, **ProfileMenu** avatar.
- **IdlePrompt** overlay — appears after inactivity, asks user to confirm still working.
- Route‑change fade/slide animation wraps `<Outlet />`.

### CommandBar (⌘K palette)
- Search input with two modes: "Search" and "Ask AI" (toggle pill).
- Search results: people (avatar + name + @username + email + colored status dot), pages (Command/Timeline/Analytics/Mind map/Collaborate/Watch parties/Playlists), groups (emoji + name), live watch parties.
- Ask mode: freeform question → server‑side AI response card, "Ask" button, loading state.

### NotificationBell
- Bell icon with unread count badge, opens a popover feed; "Mark all read"; each item is a clickable row that navigates deep‑link.

### ProfileMenu (top‑right avatar)
- Avatar chip (icon + gradient, or initial fallback) + `@username` + crown if super admin.
- Dropdown items: Account settings, Notifications, Light/Dark toggle, Super Admin Panel (if super), Admin Panel (if admin) OR "Apply to be Admin (Client)" dialog (reason textarea), Request time off (start/end date + reason dialog), Sign out.

---

## 1. Public site

### `/` Landing (`index.tsx`)
- Cosmic animated blob background + dot grid.
- Top nav: logo, "Sign in", gradient "Get started" CTA.
- Hero: badge "v1 — Now in early access", H1 with gradient span, sub‑copy, 4 checkmarked value bullets, primary "Start free" + secondary "I already have an account", hero image.
- Features grid (6 cards): Real‑time tracking, Infinite mind map, AI insights, Schedule adherence, Team‑ready, Premium dark UI.
- Final CTA section + footer (© year, sign in / sign up).

### `/login`, `/signup`
- Email / username + password forms, Google OAuth button, links between them.

---

## 2. `/app` — Command Center (`app.index.tsx`)

Personal dashboard. Sections top→bottom:
- **Greeting** ("Good morning, {name}") + **quick action buttons**: Deep Work, Take Break, Mind Map.
- **Hero live card**: label "Currently", pulsing colored dot, big status name, giant monospace running duration; on the right a pill row of first 6 AUX statuses — click to switch.
- **Today's timeline** mini strip — colored blocks across 24h, white "now" line, "View full →" link.
- **ContinuePlaylistsPanel** — resume in‑progress YouTube learning tasks.
- **LivePartiesPanel** — currently‑live watch parties to jump into.
- **Stats grid (4 cards)**: Focus Score, Longest Streak, Avg. Break, Sessions (with sub‑labels).
- **Workspaces section** — 2–4 gradient tiles: Collaborate, Playlists, Admin Panel (if admin), Super Admin (if super).
- **CountdownCalendar** — upcoming scheduled events with countdowns.
- **AwardsShelf** — earned + locked achievement badges.
- Three‑column grid: **ManagerNotes** panel (notes from managers with comment threads), **MyTasks** (task list with create dialog), **GoalRingCard** (animated SVG ring, % of daily goal minutes) + **AdherenceRing** (schedule adherence 0–100).

---

## 3. `/app/timeline` (`app.timeline.tsx`)

- Date navigator: ‹ prev day / date label / next day ›.
- Zoom toggle: 15min / hour / day.
- Full‑day timeline visualisation of all AUX sessions (colored blocks).
- Session detail side panel when a block is clicked.
- **Replay controls**: Play / Pause / Reset — animates a scrubber through the day.

## 4. `/app/analytics` (`app.analytics.tsx`)

- Range toggle: 7 / 30 / 90 days.
- Download / export button.
- Pie chart of time by status; bar charts of daily productive vs unproductive; heatmap; "reality check" callouts.
- Watch‑party stats block (hosted, joined, total minutes, recent list).

## 5. `/app/mindmap` + `/app/mindmap/$boardId`

- **Board index**: card grid of boards, create board, collaborator counts.
- **Board canvas** (React Flow):
  - Infinite pannable/zoomable canvas, animated gradient edges, minimap, zoom controls, background dots.
  - Node kinds: text, image, link, task, YouTube checklist.
  - Node context menu: edit, change color/palette, assign to user, tag, share, delete, more.
  - Paste‑to‑create (URLs → link node, images → image node).
  - Drag from node handle to connect edges.
  - Top bar: back, editable title, share, invite collaborator, AI (generate/expand suggestions), delete.

## 6. `/app/collaborate` (`app.collaborate.tsx`)

Two‑column app:
- **Left sidebar**: header "Collaborate · Chat · Groups · Hangouts". Sections:
  - **Live now** — pink pulse rows linking to active watch parties.
  - **Everyone** — global public channels.
  - **My groups** — joined groups (emoji + name + 🔒 if private) + "Browse" link opening BrowseDialog.
  - **GroupInvitesPanel** — pending group invites with Accept/Decline.
  - **Team channels** — per team you belong to.
  - Footer buttons: "Start watch party", "New group".
- **Main pane**:
  - Header: lock icon (if private), `#channel` or `emoji Group Name`, subtitle, "Invite friend" button (opens invite dialog), gradient "Watch party" button.
  - **Message list** with grouped avatars, `@mention` highlighting, quick reactions on hover, ReportButton menu.
  - Rendered message kinds: text bubble, image (ChatImage w/ signed URL), file (FileAttachment card with download), poll (PollCard with live vote bars), mindmap share (MindmapShareCard + threaded MindmapCommentsPanel).
  - MessageReactions row under every message with emoji picker + counts.
  - **ChatComposer** (bottom): `+` menu (Attach file/image, Create poll dialog, Share mind map dialog), drag‑and‑drop overlay for images/files, paste‑to‑upload, textarea with Enter‑to‑send, Send button.
- Dialogs: Browse groups, New group (name/emoji/topic/is_public), New watch party, Invite friend.

## 7. `/app/dm/$threadId` (`app.dm.$threadId.tsx`)

1‑to‑1 DM view: back button, other user avatar + name + ReportButton, message list (text/image/file, reactions, mentions), read receipts, drag‑and‑drop file uploads, composer w/ attach + send.

## 8. `/app/friends` (`app.friends.tsx`)

- Search input to find people.
- Search results list with Add Friend / Message buttons.
- Sections: **Pending incoming** (Accept / Decline), **Pending outgoing** (Cancel), **Friends** list (avatar + name + Message DM + View profile).

## 9. `/app/u/$userId` (public profile / shared timeline)

- Header: avatar, display name, @username, friend button (Add / Pending / Friends / self), Message button.
- Stats: total time, session count, active days (last 30d).
- Timeline visual (if visibility allows) or "Locked" state (private / friends‑only gate).
- AwardsShelf.

## 10. `/app/party` (Watch party lobby)

- Horizontal scrolling rail of live parties (poster/title, host, viewers, visibility icon Globe/Link/Lock). Prev/Next scroll buttons.
- "Create party" dialog: URL (YouTube autodetected), title, visibility.

## 11. `/app/hangout/$partyId` (Watch party room)

- Media player pane (YouTube embed or generic iframe/video). Host controls: Play, Pause, seek slider, mute toggle, current time sync.
- Header: back, party title, host crown, participant count, End party.
- Right chat panel (toggleable): messages, composer.
- Fullscreen toggle, sidebar collapse toggle.
- Participants list w/ live join/leave.

## 12. `/app/playlists` (`app.playlists.tsx`)

- Grid of playlist tasks (YouTube checklists). Each card: title, description, badge status (todo/in_progress/pending/overdue/done), progress N/M videos, due date, open button.
- Detail dialog: **YouTubeChecklist** — list of videos, watched checkbox, embedded player, progress bar.
- "New task" dialog (also reachable from admin).

## 13. `/app/notifications`

- Header: gradient bell icon, unread/total count, "Mark all read".
- Feed rows: unread dot + title + body + timestamp; click marks read.

## 14. `/app/settings` (`app.settings.tsx`)

Sections stacked in a max‑w‑4xl column:
- **Profile**: display name, username (validated + availability check), email display.
- **AppearancePanel**: live avatar preview, gradient swatch grid, accent color swatch grid, icon picker grid (lucide icons + initial fallback), Save button.
- **AwardsShelf** (unlocked).
- **Timeline privacy**: 3 cards (Public / Friends only / Private).
- **AUX Statuses table**: rows with color dot, name, category, paid/unpaid, shortcut kbd; Edit / Delete icons; "New" button. **StatusEditor** modal: name, color picker, shortcut key, category radio (productive/neutral/unproductive), Paid time checkbox.

---

## 15. `/app/live` (Admin — Live Feed)

- KPI cards: currently active users, live parties, 24h signups.
- Active sessions table: user email, status name, started at, live duration.
- Live parties list with viewers + End button.

## 16. `/app/admin` (`app.admin.tsx`) — Admin panel

- Team selector (pills of teams user owns/manages) + "Create team" button (dialog: name, description).
- **Tabs**:
  1. **Live monitor** — real-time table of team members' current AUX status + duration.
  2. **Members** — invited/active member list with email; "Invite member" dialog (email + role).
  3. **Schedules** — weekly schedule grid; "Add schedule" dialog: day (dropdown Sun–Sat), user (or "Whole team"), start/end times, required status category, break minutes.
  4. **Tasks** — assigned tasks table; status change Select per row (todo/in_progress/pending/overdue/done/cancelled); "New task" dialog: title, description, task type (Standard | YouTube playlist checklist), assign to member, due date, priority.

## 17. `/app/admin/moderation` (`app.admin.moderation.tsx`)

- Tabs: **Open**, **Actioned**, **Dismissed** reports.
- Report row: target type/id, reason label (Harassment/NSFW/Hate/Spam/Self‑harm/Other), details, reporter, time ago; action buttons: Warn, Mute, Ban, Dismiss.

## 18. `/app/super` (`app.super.tsx`) — Super Admin console

- Top KPI grid: Pending requests, Active admins, Pending time off, Total accounts.
- **Tabs**:
  1. **Accounts** — searchable table of all signups (email, username, display name, event type, created_at).
  2. **Requests** — admin‑role applications with badge count; Approve / Reject with note.
  3. **Roles** — user role management (super_admin / admin / member); grant/revoke.
  4. **Time Off** — pending PTO with badge; Approve / Reject.
  5. **Activity Log** — filterable audit log rows (actor, action, target, metadata, timestamp).
  6. **Oversight** — cross‑team overview / drill‑downs.

---

## 16b. Recurring components (design once, reuse)

- **AvatarIconRender** — gradient bg + lucide icon or initial. Used in ProfileMenu, CommandBar, Friends, DM header, mentions, comments, all message lists.
- **ReportButton** — 3‑dot menu → report dialog with reason radio + optional details.
- **CountdownCalendar**, **AdherenceRing**, **AwardsShelf**, **ManagerNotes**, **MyTasks**, **YouTubeChecklist**, **ContinuePlaylistsPanel**, **LivePartiesPanel**, **GroupInvitesPanel**, **IdlePrompt**, chat sub‑components (ChatComposer, ChatImage, FileAttachment, PollCard, MindmapShareCard, MindmapCommentsPanel, MessageReactions).
- Shadcn primitives everywhere: Button, Input, Textarea, Label, Select, Dialog, Tabs, Badge, Slider, DropdownMenu, Tooltip (via `sonner` for toasts).

---

## 17. Design directions this doc is meant to unlock (for the redesign brief)

Redesign each of these as a standalone screen:

1. Landing/marketing (`/`).
2. Auth (`/login`, `/signup`).
3. Global shell chrome: sidebar + top bar + CommandBar + ProfileMenu + NotificationBell + LiveTimer.
4. Command Center dashboard (`/app`).
5. Timeline (`/app/timeline`).
6. Analytics (`/app/analytics`).
7. Mind Map index + Board canvas.
8. Collaborate (chat) — sidebar, message stream, composer, all message‑kind cards, invite/browse dialogs.
9. DM thread (`/app/dm/$threadId`).
10. Friends (`/app/friends`).
11. Public profile (`/app/u/$userId`).
12. Watch Party lobby (`/app/party`).
13. Hangout room (`/app/hangout/$partyId`).
14. Playlists (`/app/playlists`) + YouTube checklist detail.
15. Notifications (`/app/notifications`).
16. Settings — profile, appearance, awards, privacy, AUX statuses editor.
17. Admin: Live Feed, Admin panel (4 tabs), Moderation (3 tabs).
18. Super Admin (6 tabs).
19. Shared component kit: avatar system, buttons, chips, badges, ring/meter, cards, dialogs, toasts, empty states, loading skeletons, drag‑drop overlay.

This is the complete surface area currently shipping in ALIOS — every route, tab, dialog, and interactive element the user asked to inventory.
