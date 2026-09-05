# Cut everyday database usage to the bare minimum

## What the numbers actually show (checked, not guessed)

- Data volume is negligible. Biggest table is articles at 2.7 MB; total data a few MB. The usage chart confirms **Database storage = 0**. So storage is not costing anything, and moving files into storage will not lower the bill.
- The whole 10.3 of the 14.7 credits is **"Database server"** — the always-on instance. That is driven by how often the app talks to the database and how long the backend is kept awake, not by how much data is stored.
- Live-update (realtime) subscriptions are switched on for **20 tables**, and the app opens ~20 different live channels across pages.
- ~36 repeating timers exist in the app (presence, adherence, focus checks, tickers, sliders).
- The super-admin Overwatch page is a real offender: one open costs **7 large reads at once** — up to 2,000 profiles, 5,000 activity sessions, 5,000 statuses, and 4 × 1,000 message/post rows, with a 90-day window.
- The daily article job is set to 1/day and marked paused, yet **131 articles were created in the last 7 days** — those came from manual/assistant generation, not the schedule. Article generation is the AI + write spike on Sep 1–3.

## Plan

### 1. Fix Overwatch (the heaviest single screen)
- Cut the window from 90 days to 7 days, and the row caps from 2,000/5,000/1,000 down to 200 per list.
- Merge the four separate message lists (chat, watch party, comments, posts) into one combined recent-activity read instead of four full scans.
- Load only when the tab is opened, and require an explicit Refresh instead of reloading on every visit.

### 2. Turn off live updates where they aren't needed
Keep realtime only where users truly need instant updates: direct messages, group chat, notifications, and watch-party rooms. Remove the rest (activity sessions, mind-map nodes/edges, admin requests, account events, polls, reactions, group members, comments) from the live-update list. Those screens refresh on open instead.

### 3. Stop background chatter
- Pause every repeating timer when the browser tab isn't visible.
- Presence heartbeat: 3 min → 5 min, and only while the tab is in front.
- Adherence and focus-milestone checks: run on a 5-minute cycle and skip entirely when no session is running.
- Purely visual timers (clocks, sliders) stay local — they must never touch the database.

### 4. Delete old data automatically (7 days)
Extend the existing cleanup routine and run it once a day, off-peak, keeping:
- activity events: 24 hours
- focus milestone events, AUX sessions, generation-run logs: 7 days
- notifications already read: 7 days; unread: 30 days
- email send logs: 30 days
Then reclaim the freed space so the tables shrink instead of just emptying.

### 5. Stop needless wake-ups
The article job runs daily even though it's paused, which wakes the backend for nothing. Change it so the schedule is removed while paused, and only re-armed when article generation is switched back on.

### 6. Right-size the server
After the above, the workload is far below a small instance. If the database server size was ever raised, lower it in More → Cloud → Advanced settings — that is the exact line the 10.3 credits bill against.

## Honest note on "move things to storage"
Because storage is already 0 and article text is only a couple of megabytes, moving article bodies into file storage would add complexity and slow page loads while saving effectively nothing. I've left it out and put the effort where the cost actually is: fewer reads, fewer live connections, fewer wake-ups.

## Technical notes
- Realtime trim = `ALTER PUBLICATION supabase_realtime DROP TABLE ...` for the non-essential tables.
- Retention = extend `purge_old_data()` plus a single daily `pg_cron` entry (one run/day; max staleness 24 h — the trade-off is old rows can linger up to a day).
- Overwatch changes are query-shape and caps only; no schema change.
- Timer changes are client-side visibility gating in `AppShell.tsx`, `use-adherence.ts`, `use-focus-milestones.ts`, `aux-store.tsx`.
