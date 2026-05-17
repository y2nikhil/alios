# Big upgrade pass — theming, mindmap fixes, watch-together, groups, analytics

You asked for a lot in one go. Grouped into 6 waves so nothing gets dropped. All on top of existing pages — no route renames.

---

## Wave 1 — Theming, responsiveness, performance

**Dark theme background (keep current black, add interest)**
- Keep `--background` near-black, layer in subtle radial gradients + a faint animated grain/noise via CSS only (no JS) so it feels alive but stays cheap.
- Apply same treatment to mind map canvas background (with lower opacity so nodes stay readable).

**Light theme redesign**
- Rebuild light tokens in `src/styles.css`: warm off-white base (`oklch(0.98 0.01 95)`), deeper ink text, accent stays brand purple/indigo, soft shadows + 1px borders instead of heavy panels.
- Update cards, sidebar, inputs, buttons to read cleanly in both modes.
- Verified by switching theme toggle on every main route.

**Mobile friendliness**
- AppShell sidebar → drawer on `<md`, top bar with hamburger.
- Mind map toolbar collapses into a floating action button on mobile, playlist panel becomes bottom sheet.
- MyTasks / Playlists / Collaborate / Analytics grids → single column under `sm`.

**Perceived speed (3–4s tab switch lag)**
- Add `defaultPreload: "intent"` + `defaultPreloadStaleTime: 0` to router so hovering a link warms the route.
- Wrap big route components (mindmap board, analytics, collaborate) in `React.lazy` already-done check; add `Suspense` skeletons instead of blank screen.
- Convert heavy useEffect data fetches in MyTasks / Playlists / Collaborate to react-query with `staleTime: 30s` so tab returns are instant from cache.

## Wave 2 — Mind map fixes

- **Double-click empty area not creating node** — fix the event handler on the React Flow `<Pane>`. Currently the listener is on the wrapper, swap to React Flow's `onPaneClick` + a `doubleClickZoom={false}` + `onDoubleClick` on the pane wrapper using `screenToFlowPosition`.
- **"+" icon half hidden** — the floating add button's `right`/`bottom` are clipped by the minimap container. Move it outside the minimap stacking context and add `z-50` + safe-area padding.
- **Color picker closes & color reverts when clicking outside the node** — currently the node deselect handler resets local state before save. Persist color to DB on every change inside the popover (debounced 300ms) instead of on close, and stop the outside-click from un-mounting before save.
- **Video play box** — make it a draggable + resizable floating panel on the mindmap canvas only (use `react-rnd`, already a small lib). Persist size/position to localStorage per board.
- **Playlist → tasks under board** — when a playlist is added inside a mindmap, create one parent `task` row (title = playlist name) and one child `task` per video (`parent_task_id` FK), each markable complete. Backing task already exists; we add `parent_task_id uuid` column + per-video child rows generated on insert.

## Wave 3 — Mind map index page polish

- Replace plain card grid with a colorful hero (gradient mesh background), recent boards as tilted cards with cover gradients, "New board" as a big CTA tile.
- Replace emoji usage app-wide with `lucide-react` icons (already installed). Quick sweep of AppShell, MyTasks, Playlists, Mindmap, Collaborate, Analytics.

## Wave 4 — Analytics expansion

In `app.analytics.tsx`, add:
- Tasks completed vs pending (weekly bar)
- Videos watched / completed (count + total minutes from `task_videos.completed_at`)
- Mind maps created / shared
- Aux time breakdown by category (productive / neutral / unproductive) — already partly there, surface as donut
- Watch-party sessions joined + hours (from new `watch_parties` table)
- Per-day activity heatmap (last 90 days)

All using `recharts` (already installed).

## Wave 5 — Collaborate: user-created groups (Discord-like)

- New table `groups` (id, name, slug, description, topic, created_by, is_public). Anyone can create. RLS: public groups readable by all authenticated, private only by members.
- New table `group_members` (group_id, user_id, role: owner/admin/member).
- Each group auto-gets a default `chat_channels` row (`group_id` FK added, channel scoping updated; team_id stays for legacy).
- Collaborate page left rail: "Browse groups" + "My groups" + "Create group" modal. Pick a group → see its channels → chat.
- Seed examples: "CAT Prep", "SSC Prep", "Bank Prep", "College Exams" as public groups owned by system.

## Wave 6 — Watch-together rooms (Kosmi-style)

New section under Collaborate → "Hangouts".

**Schema**
- `watch_parties` (id, host_id, group_id null, title, media_url, media_kind: youtube/vimeo/direct/iframe, current_time, is_playing, started_at, ended_at)
- `watch_party_participants` (party_id, user_id, joined_at, left_at)
- `watch_party_messages` (party_id, user_id, body, created_at) — separate from chat_messages

**Player**
- Paste any link → detect kind:
  - YouTube/Vimeo → embed via their iframe APIs (sync play/pause/seek via Supabase Realtime broadcast on the party channel).
  - Direct `.mp4/.m3u8` → `<video>` tag with HLS.js for streams.
  - Generic iframe-able URL → embed as iframe (no sync, just shared screen). Many free movie sites block iframing — we surface a "site can't be embedded" message rather than silently failing.
- Host controls play/pause/seek; viewers' player follows via Realtime.
- Side panel: participant avatars (live), chat, invite link (copy).
- On `ended_at`, write a summary row visible in Collaborate ("Last hangout: 2h 14m, 5 people") and analytics ("Watch-party hours" metric).

**Note on "any video from any free movie site":** technically limited by each site's `X-Frame-Options` / CSP. We'll do our best for embeddable URLs; for blocked sites users can use screen-share (browser-native `getDisplayMedia` + WebRTC) — that's a bigger lift, so v1 ships embed + sync; screen-share via WebRTC goes in a follow-up if you want.

---

## Files touched (high-level)

- `src/styles.css` — theme tokens, light mode rebuild, dark background layers
- `src/router.tsx` — preload settings
- `src/components/AppShell.tsx` — mobile drawer, icon sweep
- `src/routes/app.mindmap.index.tsx` — colorful landing
- `src/routes/app.mindmap.$boardId.tsx` — pane dblclick fix, FAB, color picker fix, rnd video panel, playlist→tasks
- `src/components/YouTubeChecklist.tsx` — rnd wrapper when in mindmap context
- `src/routes/app.collaborate.tsx` — groups UI, hangouts section
- `src/routes/app.analytics.tsx` — new metrics
- New: `src/routes/app.hangout.$partyId.tsx` — watch-party room
- New migration: groups, group_members, watch_parties, watch_party_participants, watch_party_messages, task.parent_task_id, RLS for all
- New dep: `react-rnd`, `hls.js`

---

## What I need from you before starting

1. **Wave 6 scope** — embed-only sync first (ships in this pass), or do you also want WebRTC screen-share now (adds ~1 more wave of work)?
2. **Seed groups** — OK to seed CAT/SSC/Bank/College as public, or you want a different starter set?
3. **Order** — ship all 6 waves in one big commit (long-running), or wave-by-wave so you can test as we go?

Once you answer those I'll execute.
