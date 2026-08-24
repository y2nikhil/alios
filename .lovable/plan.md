# Automated Daily College Review Blog Posts

Goal: ClassLab publishes 5 AI-written college review articles every day, auto-published under the admin account, using the 27-section College Review template.

## Short answer on the MCP

The Google/Gemini MCP connector you added works only inside Lovable chat while I build — the published app cannot call it. So the automation has to live inside ClassLab itself: a scheduled job + the Lovable AI gateway. That is what this plan builds.

## How it will work

```text
pg_cron (daily 05:30 IST)
   -> POST /api/public/hooks/generate-college-reviews
        -> claim next 5 colleges from the queue (single-flight lock)
        -> per college: research pass -> draft pass -> validate
        -> insert into blog_posts (status=published, author = admin)
   -> run log visible in the admin panel
```

### 1. College queue
New table `college_queue`: name, city, exam track (CAT/JEE/NEET/other), priority, status (pending / generating / published / failed), post_id, error, timestamps. Admin-only RLS.

New admin screen **Blog Studio -> College Pipeline**: paste a list of colleges (one per line, bulk add), reorder, retry failures, pause the whole pipeline, and see the last runs. You said you'll provide the list — you paste it here and the job eats through it.

### 2. Research + writing
Two AI passes per college through the Lovable AI gateway:

1. **Research pass** — gathers facts per section (fees, cutoffs, placements over 3 years, batch profile, recruiters, student sentiment) and returns them as structured JSON with a `source` and `year` on every number, plus a confidence flag.
2. **Writing pass** — turns that JSON into the exact 27-section markdown, using the tables, "Official / Expected / Tentative / To Be Announced" labels, and the content rules from your template. Anything the research pass could not verify is written as "Not officially disclosed" — never invented.

For live web data I recommend adding a search connector (Firecrawl or Exa) so the research pass can actually read official sites, placement reports, and Reddit threads and cite them. Without it the model writes from training memory only and most numbers become "Data unavailable". I'll ask you to connect one before wiring the research pass.

### 3. Generated fields
Each post is created with: title `[College] Admission 2027: Fees, Cutoff, Courses, Placements, Ranking, Eligibility & Review`, clean slug, excerpt, tags (exam track + city + "college review"), SEO title/description/keywords per your template's format, `show_toc = true`, cover image alt text, and `author_id` = your admin account. Status: **published** immediately, as you chose.

### 4. Safety rails (so it never spams or burns credits)
- Max 5 posts per run, one run per day, lock row so overlapping runs exit.
- Each college marked done in the same step it's published — retries never duplicate.
- Credit/rate errors pause the pipeline and show it in the admin panel instead of looping.
- Duplicate-slug guard: a college already published is skipped.

### 5. Internal linking + SEO
Every article auto-links to the relevant exam landing page (/exams/jee, /exam-prep, etc.), a couple of recent related reviews, and gets added to sitemap.xml through the existing blog feed.

## Technical notes

- Scheduled route: `src/routes/api/public/hooks/generate-college-reviews.ts` (public prefix + anon apikey header, called by pg_cron).
- Generation logic in `src/lib/college-review.server.ts`; admin queue mutations in `src/lib/college-queue.functions.ts`.
- Model: `google/gemini-3.7-flash` for both passes, streaming, with structured JSON for the research pass.
- Migration adds `college_queue` + `college_gen_runs` (+ GRANTs, admin-only RLS) and the pg_cron schedule is set separately with run_sql.
- Reuses the existing blog renderer, so GFM tables from the template render correctly.

## Open item

Web-research source: connect Firecrawl/Exa (recommended) or run AI-only. I'll confirm with you when we start building.
