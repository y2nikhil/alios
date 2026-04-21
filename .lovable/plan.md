

# ALIOS — Wave 3 (Single Build): Tracking, YouTube, Chat, Mind Map Collab, Notifications, Theme

Shipping everything in one go. Here's the full scope and build order so nothing is missed.

---

## 1. Super Admin tracking & audit log

- **`account_events`** table — every signup writes a row via trigger on `auth.users` (event_type, email, created_at, ip best-effort)
- **`audit_log`** table — `actor_id`, `action`, `target_user_id`, `target_id`, `metadata`, `created_at`. Every approve/reject/grant/revoke/task-delete/mindmap-share writes a row
- **Super Admin Panel** gets new tabs:
  - **Accounts** — full user list (email, signup date, role, last AUX, weekly hours, current status) with realtime updates and **Revoke account** action (sets `auth.users.banned_until` via secure RPC)
  - **Activity Log** — filterable feed of every admin action
  - **All Teams**, **All Tasks**, **All Chats**, **All Mind Maps** — read-only oversight of everything across the platform
- **Admin Panel** gets a scoped **Activity Log** for their teams only

## 2. Light/Dark theme toggle

- `ThemeProvider` persisted to `localStorage` + `profiles.theme`
- Refined light palette in `styles.css` with proper contrast (off-white surface, slate cards, vibrant accents, glass effect that works in both modes)
- Sun/moon toggle inside the **ProfileMenu** dropdown (top-right, under account section)
- Tighter typography scale and smoother transitions across the app

## 3. Manager Notes upgrade

- Extend `manager_notes`: add `team_id` (nullable) + `pinned` boolean
- Admin can assign a note to a **specific user** OR a **whole team**
- New **`note_comments`** table — threaded replies under each note
- "View All" drawer with filters (mine, my team's, pinned)
- Notification fired to recipients on note creation

## 4. Tasks: statuses, self-assign, comments, edit/delete

- Status dropdown with full set: `todo`, `in_progress`, `pending`, `overdue`, `completed` (auto-mark overdue when `due_at < now()` in UI)
- Members can **create tasks for themselves**; admin sees them in the team view
- New **`task_comments`** table — threaded comments
- Admin can edit/delete any task in their team (writes to audit log)
- Task status changes notify the assigner

## 5. YouTube playlist tasks (distraction-free player)

- Extend `tasks` with `task_type` (`standard`, `youtube_checklist`)
- New **`task_videos`** table: `task_id`, `video_id`, `title`, `thumbnail`, `duration`, `order_index`
- New **`task_video_progress`** table: per-user completion of each video in the checklist
- Server function parses YouTube URLs (single video → oEmbed; playlist → fetch playlist HTML and extract video IDs/titles — no API key needed)
- Embedded player uses `youtube-nocookie.com` with params `rel=0&modestbranding=1&iv_load_policy=3&showinfo=0` to kill end screens, related videos, and annotations
- Checklist UI: video list with ✓ Done toggles, progress bar, auto-queue next video

## 6. Collaborate hub (team chat)

- New **Collaborate** sidebar item (`/app/collaborate`)
- **`chat_channels`** (one per team, auto-created with team) + **`chat_messages`** (`channel_id`, `user_id`, `body`, `attachments`, `reply_to`)
- Realtime via Supabase Realtime — messages appear live
- @mention parsing (`@email`) → fires notification to mentioned user
- Page layout: left = teams I'm in, right = active channel, composer at bottom
- Super admin sees all channels (read-only) in the Super Panel

## 7. Notifications (bell icon in header)

- New **`notifications`** table: `user_id`, `type`, `title`, `body`, `link`, `read_at`, `created_at`
- Bell icon in top header next to ProfileMenu with unread badge
- Dropdown shows last 10 + "Mark all read" + "View all" → `/app/notifications`
- Triggers fire on: task assigned, manager note assigned, mindmap shared, @mention in chat, request approved/rejected, comment reply
- Realtime so notifications pop in with a soft toast

## 8. Mind Map collaboration

- New **`mindmap_collaborators`** table: `board_id`, `user_id` (or `team_id`), `role` (`viewer`/`editor`)
- RLS update: owner OR collaborator OR member of shared team can SELECT; editors can write nodes/edges
- **Share** button on each board: pick a user (email lookup) or whole team → fires notification
- **"Shared with me"** section on `/app/mindmap` boards list
- Create-board flow: option to **start as collaborative** with team picker
- Realtime sync of nodes/edges (debounced 300ms) so co-editors see live changes
- New dashboard widget: "Shared mind maps"

## 9. Mind Map polish

- **Persistent color outline** — node keeps a 2px ring of its color even when deselected (currently disappears on blur)
- **Modern connectors** — bezier curves with gradient stroke, subtle animated dash flow, glow on hover, larger handles
- **Mini-map** node colors match node colors
- **Three-dot menu refinement** — replace `prompt()` with proper inline popovers; Assign uses real team dropdown now that teams exist; add "Open in collaboration mode"
- **Performance** — memoize edge components, virtualize when count > 50

## 10. Profile menu enhancements

- Already has Apply for Admin, Request Time Off, Logout
- Add: **Theme toggle**, **My Profile** link, **My Notifications** link

---

## Data model additions (summary)

| Table | Purpose |
|---|---|
| `account_events` | Signup tracking for super admin |
| `audit_log` | Every approval/rejection/role change/deletion |
| `note_comments` | Comments on manager notes |
| `task_comments` | Comments on tasks |
| `task_videos` | YouTube videos attached to a task |
| `task_video_progress` | Per-user video completion |
| `chat_channels`, `chat_messages` | Team chat |
| `notifications` | Bell-icon feed |
| `mindmap_collaborators` | Mind map sharing |

Plus column additions: `manager_notes.team_id`, `manager_notes.pinned`, `tasks.task_type`, `profiles.theme`.

All RLS-protected:
- Super admin SELECT all everywhere
- Admins SELECT within their teams
- Members SELECT own / team-scoped rows

---

## Build order (one continuous build)

1. **Migration** — all new tables, columns, enums, triggers, RPCs (`revoke_account`, `parse_youtube_url`, audit-log helpers)
2. **Theme system** — ThemeProvider, light palette, ProfileMenu toggle
3. **Tracking & audit** — Super Admin Accounts/Activity tabs, audit-log writers in existing approve/reject flows
4. **Notifications infrastructure** — bell, dropdown, page, realtime hook
5. **Manager Notes v2** — team assignment, comments, View All drawer
6. **Tasks v2** — statuses, self-assign, comments, edit/delete, YouTube task type + player
7. **Collaborate hub** — chat channels, messages, realtime, @mentions
8. **Mind Map collab + polish** — sharing, realtime sync, persistent color outline, modern connectors, popover menu

---

## Visual direction

Premium SaaS, dark by default with a clean professional light option. Notification toasts use Sonner with branded styling. Admin/Super panels gain a slightly denser console layout. Chat and mind map get tight micro-animations.

