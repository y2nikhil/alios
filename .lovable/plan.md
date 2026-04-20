
# ALIOS — Big Update: Landing Page, Mind Map Polish, Admin/Teams, Schedule Adherence

A lot to unpack. I'll tackle it in **two waves** to keep things stable. Wave 1 ships the visible UX changes you called out. Wave 2 adds the heavier Admin/Teams/Adherence platform work.

---

## Wave 1 — UX & Mind Map (this build)

### 1. Marketing landing page at `/`
- Move authenticated app from `/` → `/app` (so `/app`, `/app/timeline`, `/app/mindmap`, etc.)
- Build a new public landing page at `/` based on your reference image:
  - Hero: ALIOS logo + tagline "The All-In-One Productivity & Management App"
  - Feature checklist (Track day in real-time, Mind map, Insights, AI focus, Team-ready)
  - Mocked product screenshots/cards collage with glow
  - "Get Started" / "Sign in" CTAs in **top-right corner**
  - Footer
- Logged-in users hitting `/` get auto-redirected to `/app`
- Logged-out users hitting any `/app/*` route get sent to `/login`

### 2. Don't reset timer on same-status click
Fix in `aux-store`: if `statusId === activeSession.status_id`, no-op (toast: "Already in this status").

### 3. Manager Notes / Comments (replaces AI Insight on home)
- New `manager_notes` table (author, recipient, body, color, created_at)
- Card on Command Center with:
  - Scrollable list of notes (newest first)
  - "+ Add note" inline composer (admins / self-notes for now)
  - "View all" link → opens full notes drawer/page
- AI Insight feature isn't deleted — it moves to a smaller spot on the Analytics page

### 4. Mind Map — major polish & bug fixes
- **Double-click on empty canvas** → creates a node with the text input **already focused and editable** (auto-edit mode for first 5s or until blur)
- **Double-click inside a node** → enters rename/edit mode only; does NOT bubble up to create a new node (stop propagation)
- **Reposition controls**: move React Flow `Controls` panel to `bottom-left` (currently default cut off); MiniMap to `bottom-right` with proper padding so nothing clips
- **Three-dot menu on every node** (visible on hover, top-right corner of node):
  - Rename
  - Change color (palette swatches)
  - Assign to team member (dropdown of team — placeholder list now, real list in Wave 2)
  - Add tag
  - Delete
- **Delete key** on selected node(s) removes them (with edges cleanup)
- **Performance**: memoize `nodeTypes` correctly, debounce position persistence (500ms), batch edge cleanup on delete
- **Visual polish**: tighter spacing, refined glow, smoother edges (bezier instead of smoothstep), softer background grid

### 5. Schedule Adherence Score widget on home
Placeholder ring (alongside the daily goal ring) showing "Adherence: —" until Wave 2 lights it up. Keeps the visual slot in place.

---

## Wave 2 — Admin Panel, Teams & Schedules (next build, after you approve Wave 1)

### Admin role system (RLS-safe)
- `app_role` enum (`admin`, `member`)
- `user_roles` table (user_id, role) — separate table per security best practice
- `has_role(user_id, role)` security-definer function
- First user to sign up auto-promoted to admin; future admins promoted via panel

### Teams
- `teams` (id, name, owner_id)
- `team_members` (team_id, user_id, invited_email, status)
- Admin can invite by email; if email matches an existing user → instant link, else pending invite

### Schedules
- `schedules` (team_id, day_of_week, start_time, end_time, required_status, break_window_start, break_window_end, break_max_minutes)
- Admin defines per-team weekly schedule
- Members view their schedule on a new `/app/schedule` page

### Task assignments
- `tasks` (id, team_id, assigned_to, title, description, due_at, status)
- Admin assigns tasks; members see them on dashboard

### Schedule Adherence Score (0–100)
Computed daily per user from `aux_sessions` vs `schedules`:
- Penalty for being off the required status during scheduled hours
- Penalty for break overruns
- Penalty for missing scheduled hours
- Score surfaced in: home dashboard ring, admin team monitor, analytics

### Admin Panel (`/app/admin`, gated by `has_role('admin')`)
- **Teams** tab — create teams, invite members
- **Schedules** tab — define weekly schedules per team
- **Tasks** tab — assign and monitor
- **Live Monitor** tab — real-time view of every member's current AUX, today's adherence, recent activity (uses Supabase Realtime)
- **Members** tab — promote/demote admins

### Member vs Admin separation
- Sidebar shows "Admin" section only when `has_role('admin')`
- All schedule/task tables: members SELECT only their own rows; admins SELECT all in their teams (via RLS using `has_role` + team membership)

---

## Visual direction
Stays premium dark-first. Landing page leans into the cosmic/glow aesthetic from your reference image. Admin panel gets a slightly denser, data-heavy layout (more like a console).

---

## What I'd like you to confirm
I'll proceed with **Wave 1 first** unless you say otherwise — it's already a big build (landing page + mind map overhaul + manager notes + active-status fix). Wave 2 is queued and ready to go right after.
