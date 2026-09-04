# Reduce database cost

## What the numbers actually say

I queried the query statistics directly and inspected table sizes. Findings:

- The database is tiny: the largest table is `blog_posts` at 2.7 MB, whole dataset is a few MB. Storage cost is effectively zero — the 8.17 credits are **"Database server"**, i.e. the always-on instance, not disk.
- Total query execution time across the whole window is only ~3 minutes. No single query is pathologically slow.
- What is high is **call volume**. Top offenders by calls:

```text
user_roles  by user_id        18,980 calls
teams       by id list         5,000
aux_statuses by user_id        5,552 + 5,206
aux_sessions by user_id        5,828
team_members by user_id        6,022
watch_parties live list        3,695
activity_events INSERT         3,779   (20.5 s total)
notifications by user_id       4,685
manager_notes list             4,231
tasks by assigned_to           4,281
```

- `blog_posts` list is the single heaviest by time (786 calls, 38 s). `EXPLAIN (ANALYZE, BUFFERS)` shows it already uses `blog_posts_updated_at_idx` and runs in 1.4 ms — the cost is not the scan, it is `SELECT *` shipping the full `content` column (row width 1108 B) 50 rows at a time.

Conclusion: this is a **chattiness problem, not a slow-query problem**. Indexes will not help; there is nothing left to index. The app fires thousands of tiny repeat reads, which keeps the instance busy and drives the compute credits.

## Plan

### 1. Cache the repeat lookups (biggest win)
`useRole` re-queries `user_roles` on every mount of every component that uses it, with no cache — that alone is ~19k queries. Same pattern for `useIsSuperAdmin`, `aux_statuses`, `team_members`, `teams`.

- Move these into TanStack Query with a shared key and a long `staleTime` (roles/statuses: 5–10 min; teams: 5 min), so a session hits the database once instead of dozens of times.
- Consolidate `useRole` and `useIsSuperAdmin` onto one cached query.
- Fold the two separate `aux_statuses` selects (full row + `id,category`) into one cached query.

### 2. Stop shipping article bodies in list queries
- `blog_posts` list endpoints: replace `select("*")` with the explicit column list already used elsewhere (no `content`). Reading time already comes from the stored word count.
- Same for the `posts` feed list and `manager_notes` list — select only the columns rendered.

### 3. Trim polling and background loops
- Audit the `setInterval` loops that trigger network reads (adherence, focus milestones, presence heartbeat, live-party lists, hangout sync) and raise intervals / gate them on tab visibility so background tabs stop querying.
- `activity_events` inserts (3,779 writes) — tracking was meant to be disabled; remove any remaining write path.

### 4. Right-size the instance
After the above lands, the workload is well under what a small instance needs. If the instance was ever upgraded, drop it back down in Cloud → Advanced settings → Database server; that is the line item the credits are actually billed against.

## Technical notes
- No new indexes are proposed — `EXPLAIN` confirms current plans are index scans on a few-hundred-row dataset.
- Caching changes are client-side only (TanStack Query options + hook consolidation); no schema migration is needed.
- Trade-off of longer `staleTime`: a role or AUX-status change can take up to the cache window to appear elsewhere in the UI; invalidate the key on the mutation that changes it.
