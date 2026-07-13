
# ALIOS v2 — Productivity-first social workspace

Positioning: **time tracking & focus stay the hero**; friends, chat, collab, awards, and moderation reinforce it.

Shipping in four bundles across one plan. Each bundle is self-contained so we can pause between them if you want.

---

## Bundle 1 — Social & Collab

**1:1 friend DMs**
- New tables: `dm_threads` (pair of user_ids, unique), `dm_messages` (thread_id, sender_id, body, attachment_url, created_at, read_at).
- RLS: only the two participants can read/write. DM allowed only if `are_friends(a,b)` is true.
- New route `/app/friends` gets a "Message" button; new route `/app/dm/$threadId` with realtime via `postgres_changes`.
- Unread badge on the sidebar + Friends tab.

**Collab upgrades on `/app/collaborate`**
- **Shared tasks in groups**: extend `tasks` with optional `group_id`; assignable to any group member; shows in a group "Tasks" tab.
- **Polls & votes**: `chat_messages.kind` enum (`text|poll|image|mindmap_share`); `poll_options` + `poll_votes` tables; inline poll UI with live counts.
- **Image uploads**: create `chat-attachments` storage bucket (authenticated read+write, per-user path); paperclip button in composer; images render inline.
- **Shared mind maps**: "Share to group" button on a mind map board posts a `mindmap_share` message with a preview + open-link.

---

## Bundle 2 — Gamification (awards + avatar theming)

**Trophies**
- Table `awards` (code, title, description, icon, threshold_hours, tier) seeded with: 10h, 25h, 50h, 100h, 250h, 500h, 1000h productive-hours milestones + streak awards (7-day, 30-day punch-in streak) + social awards (first DM sent, first poll created).
- Table `user_awards` (user_id, award_code, earned_at). A server fn `checkAwards` runs after each `aux_sessions` close and after streak recalculation; inserts new awards and emits a `notify_user` toast.
- Profile page (`/app/u/$userId`) shows a trophy shelf; homepage shows "Next milestone" progress bar.

**Avatar theming**
- Extend `profiles` with `avatar_icon` (lucide icon name), `avatar_gradient` (token key like `sunset|violet|ocean|forest|mono|neon`), `theme_accent` (same set).
- Signup flow: after first login, a one-time modal to pick icon + gradient (skippable, defaults to current initial-on-gradient).
- `/app/settings` gets an "Appearance" tab to change icon, gradient, and accent color; accent drives a CSS variable used by primary buttons/rings.
- Replace the current hardcoded gradient in `CommandBar`, `AppShell`, and person avatars with the user's saved gradient/icon.

---

## Bundle 3 — Trust & Safety (Admins + Super-admin)

- New `reports` table: reporter_id, target_type (`message|dm|user|party_message|note`), target_id, reason (enum: harassment, nsfw, spam, other), details, status (`open|actioned|dismissed`), handled_by, handled_at.
- New `user_sanctions` table: user_id, kind (`warn|mute|temp_ban|perma_ban`), reason, expires_at, issued_by.
- Enforcement helper `public.is_active_ban(_user)` used in RLS on `chat_messages`, `dm_messages`, `watch_party_messages`, `manager_notes` — blocks INSERT while active. Mute = INSERT blocked; temp/perma-ban = also blocks login-gated routes via a `beforeLoad` check that redirects to `/banned`.
- **UI**: three-dot menu on every message/user/party card → "Report". Admin queue at `/app/admin/moderation` shows open reports with quick actions:
  - Admin: warn, mute (1h/24h), temp-ban (24h/7d), dismiss.
  - Super-admin only: perma-ban, revoke admin, restore.
- Every action writes to `audit_log` via existing `write_audit`.

---

## Bundle 4 — Status timeout, resume/split, logout hygiene

**Auto-close on logout / tab close**
- Client `beforeunload` + auth `SIGNED_OUT` handler calls a new `endActiveSession` server fn that closes any open `aux_sessions` for the user with `ended_at = now()`.
- Idempotent so double-fires are safe.

**30-min idle prompt**
- Client tracks last input (mouse/key/touch). At 30 min idle, show a modal with a sound + "Still working?" and a 60-second countdown.
- Yes → keep session, reset idle timer.
- No / timeout → call `endActiveSession`, mark user offline, toast "Idle — punched out".

**Not-responding button**
- Floating small chip next to the active status: "Not responding" (single click) pauses the current session by inserting an `Away` session; when user returns, resume-or-restart prompt (below) fires.

**Resume vs. restart on repeat status**
- Change `switchTo` in `aux-store.tsx`: if the user selects a status they were in earlier today AND the last session for that status ended less than 4 hours ago, show a dialog:
  - "Resume Meeting (2m so far)" — reopens that session by clearing `ended_at`, extending duration on next close.
  - "Start a new Meeting timer" — current behavior.
- Same dialog surfaces when returning from "Not responding".

---

## Technical details

**Database migrations (one migration per bundle)**
- Bundle 1: `dm_threads`, `dm_messages`, `poll_options`, `poll_votes`, `chat_messages.kind` enum + `attachment_url` + `metadata jsonb`; `tasks.group_id` FK; `chat-attachments` storage bucket with per-user path policies.
- Bundle 2: `awards`, `user_awards`, `profiles.avatar_icon/avatar_gradient/theme_accent`; seed 12 awards; `check_and_award_hours(_user)` SECURITY DEFINER function; trigger on `aux_sessions` UPDATE when `ended_at` set.
- Bundle 3: `reports`, `user_sanctions`, `report_reason` enum, `is_active_ban()` helper, RLS additions on messageable tables, `/banned` route + `beforeLoad` gate on `_authenticated`.
- Bundle 4: no schema change — pure server fn + client logic. Add `endActiveSession`, `resumeSession(_session_id)` server fns using `requireSupabaseAuth`.

**All new `public.*` tables**: full GRANT block (`authenticated`, `service_role`, no `anon`) + RLS + policies scoped to `auth.uid()` per platform rules.

**Files touched (high level)**
- New: `src/routes/app.dm.$threadId.tsx`, `src/routes/app.admin.moderation.tsx`, `src/routes/banned.tsx`, `src/components/ReportDialog.tsx`, `src/components/IdlePrompt.tsx`, `src/components/AwardsShelf.tsx`, `src/components/AvatarPicker.tsx`, `src/lib/awards.ts`, `src/lib/idle.ts`, `src/lib/dm.functions.ts`, `src/lib/moderation.functions.ts`, `src/lib/session.functions.ts`.
- Edited: `CommandBar.tsx`, `AppShell.tsx`, `aux-store.tsx`, `app.friends.tsx`, `app.collaborate.tsx`, `app.settings.tsx`, `app.u.$userId.tsx`, `app.index.tsx`, `_authenticated/route.tsx` (add ban check + register idle prompt), `__root.tsx` (sign-out cache teardown for DMs).

**Order of implementation** (each is a natural stopping point):
1. Bundle 4 (idle + logout close) — fixes the bug you saw today.
2. Bundle 3 (moderation) — foundational for opening chat wider.
3. Bundle 1 (DMs + collab upgrades).
4. Bundle 2 (awards + avatar theming) — the reward layer sits on top.

Say the word and I'll start with Bundle 4, or reorder if you'd rather see DMs first.
