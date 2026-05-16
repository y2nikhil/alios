## 1. Fix video player aspect ratio

In `src/components/YouTubeChecklist.tsx`, the player is hard-coded to `aspect-video` (16:9), which letterboxes Shorts and crops portrait clips.

- Add a per-video aspect probe: when a video starts playing, load `https://i.ytimg.com/vi/{id}/maxresdefault.jpg` (fall back to `hqdefault.jpg`) in a hidden `Image()` and read `naturalWidth / naturalHeight`. Cache the result per `video_id` in a `useRef<Map>` so we only probe once.
- Replace the fixed `aspect-video` class on the player container with an inline `style={{ aspectRatio: <probed ratio or 16/9> }}`.
- Cap the player so it never exceeds the viewport: `max-w-[min(96vw,1100px)]` and `max-h-[85vh]` on the outer wrapper, and let the inner container shrink to fit while preserving the natural ratio. Portrait videos (9:16) get a tall, narrow player; landscape stays wide; square stays square.
- No DB changes.

## 2. YouTube playlists inside a mind map board

Goal: on any mind map board, the user can paste YouTube links, build a playlist, watch each video inline, and tick them off — exactly like the task playlist flow.

Approach: reuse the existing `YouTubeChecklist` component and the existing `task_videos` + `task_video_progress` tables. Each board gets one hidden backing task that owns its videos. No new tables, no new RLS work.

### UI

In `src/routes/app.mindmap.$boardId.tsx`:
- Add a right-side collapsible "Playlist" panel (toggle button in the board toolbar, next to the existing actions). Default: closed. State persisted to `localStorage` per board.
- When opened for the first time on a board, look up a backing task with `task_type='youtube_checklist'` where `assigned_by = assigned_to = user.id` and `description = 'mindmap:<boardId>'`. If none exists, insert one (title = board title, description = `mindmap:<boardId>`). The existing "User creates self task" RLS policy already permits this.
- Render `<YouTubeChecklist taskId={backingTaskId} canEdit={true} />` inside the panel. All add/remove/play/mark-complete behavior comes for free, including the aspect-ratio fix from section 1.
- When the board title is renamed, also update the backing task's title (best-effort, non-blocking).

### Optional node link

To make a playlist discoverable from the canvas itself, also add a small "Playlist" button to the board toolbar that simply opens the panel — no new node type, no schema change. (Skipping a dedicated `youtube` node type keeps this change small; we can add one later if you want videos pinned to specific nodes.)

## Files touched

- `src/components/YouTubeChecklist.tsx` — aspect probe + dynamic ratio on the player
- `src/routes/app.mindmap.$boardId.tsx` — Playlist panel toggle, backing-task lookup/create, mount `YouTubeChecklist`

No migrations. No new routes. No changes to AppShell or other pages.