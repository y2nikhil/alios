

# Quick additions: self-serve tasks, personal playlists, global chat, welcome message

Four small changes layered on top of the existing Wave 3 build. No new sections, just unlocking what's already there for non-admin users plus one new global channel.

---

## 1. "New task" button on the dashboard (self-assign)

In `src/components/MyTasks.tsx`, add a `+ New task` button in the header that opens a small dialog with:
- Title (required)
- Optional description
- Task type selector: **Standard** or **YouTube playlist**
- Optional due date

On submit, insert into `tasks` with `assigned_by = assigned_to = user.id`. The existing RLS policy "User creates self task" already permits this — no migration needed for tasks.

If the user picks "YouTube playlist", the created task immediately shows up in `/app/playlists` and the task detail dialog already renders the `YouTubeChecklist` (where `canEdit = user.id === assigned_by`, which is true for self-created tasks). So users can paste YouTube URLs and build their own playlists with zero admin involvement.

## 2. "New playlist" shortcut on the Playlists page

In `src/routes/app.playlists.tsx`, add a `+ New playlist` button in the header. Same dialog as above but task type is locked to `youtube_checklist`. This makes the personal-playlist flow obvious from the dedicated page.

## 3. Global chat room "chat-room"

Currently `chat_channels.team_id` is `NOT NULL` and RLS only lets team members see channels. New migration:

- Allow `chat_channels.team_id` to be nullable.
- Insert one row: `name = 'chat-room'`, `team_id = NULL` (the single global channel).
- Add RLS policies so any authenticated user can SELECT global channels (`team_id IS NULL`) and any authenticated user can INSERT messages into them. Existing team policies are kept untouched.
- Update `chat_messages` SELECT/INSERT policies to also allow channels where `team_id IS NULL` for any authenticated user.

In `src/routes/app.collaborate.tsx`, fetch the global channel alongside team channels and show it in a "General" group at the top of the sidebar. Auto-select it if no team channel exists, so the empty state ("not part of any team") is replaced by an immediately usable chat.

## 4. Welcome notification + welcome chat message on signup

Update the existing `handle_new_user()` trigger function (migration) to:

- Insert a notification for the new user: type `system`, title "Welcome to ALIOS 👋", body "Thanks for joining — say hi in #chat-room.", link `/app/collaborate`.
- Insert a chat message into the global `chat-room` channel: `"👋 Welcome {display_name} to ALIOS!"` posted as the new user.

This runs automatically whenever an account is created via `/signup` — no client-side code changes needed.

---

## Files touched

- `src/components/MyTasks.tsx` — header "+ New task" button + dialog
- `src/routes/app.playlists.tsx` — header "+ New playlist" button + dialog
- `src/routes/app.collaborate.tsx` — show global `chat-room` in sidebar, auto-select
- New migration: `chat_channels.team_id` nullable, global channel row, RLS for global channels/messages, updated `handle_new_user()` trigger

No changes to AppShell, no new routes, no new components — keeps credit usage minimal.

