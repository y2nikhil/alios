# Lower the college pipeline's daily credit burn

## Why

The pipeline is paused with an AI gateway `402 — Not enough credits`. The workspace has 2.10 credits left (daily allowance only); plan/AI-gateway grants reset with the billing cycle on **Aug 29, 2026**, and daily credits reset at 00:00 UTC.

Current setup burns far more than the allowance: a cron job fires **5 times a day** (02:30, 05:30, 08:30, 11:30, 14:30 UTC) asking for 4 articles each — up to 20 articles/day, each costing 2-4 model calls (research + write + metadata).

## What changes

1. **Cut the schedule to one run per day.** Replace the 5-times-daily cron with a single daily run at 02:30 UTC.
2. **Ask for fewer articles per run.** The cron body requests `{"limit": 3}` instead of 4, and the stored `daily_limit` is set to 3 (it is currently 1 because of the pause).
3. **Cap the per-run ceiling.** Lower the route's hard maximum from 25 to 5 so an accidental large `limit` can never drain the balance.
4. **Release the 13 stuck rows.** Queue entries left in `generating` from the failed paused runs are reset to `pending` so they get retried.

Net effect: roughly 3 articles/day instead of 20 — about an 85% cut in pipeline credit spend. At 3/day the remaining 474 queued colleges publish over time rather than all at once.

## What stays the same

- The article format, research quality, and 27-section structure are untouched.
- "Run now" in the admin pipeline page still works for manual bursts.
- The pause-and-probe recovery behaviour stays: while paused, a run only sends a single probe article, and resumes automatically once it succeeds.

## Note on resuming

Lowering the limit does not by itself unpause the pipeline — the workspace still needs credits. Once credits are available (Aug 29 reset, or a top-up in Settings → Plans & credits), the next scheduled run's probe article succeeds and the pipeline resumes on its own.

## Technical details

- Recreate cron job `generate-college-reviews-batch` with schedule `30 2 * * *` and body `{"limit": 3}`.
- `update public.college_pipeline_state set daily_limit = 3 where id = 1;`
- `update public.college_queue set status = 'pending' where status = 'generating';`
- In `src/routes/api.public.hooks.generate-college-reviews.ts`, change `Math.min(25, ...)` to `Math.min(5, ...)` in `runPipeline`.
