# First-Login Onboarding & Personalization

Ask new users a short set of questions on first login, save the answers, and use them everywhere — communities, countdown, AI Assistant, and a starter mind-map roadmap. Editable anytime from Settings.

## 1. Data model (new migration)

New table `public.user_prep_profile` (1 row per user):
- `user_id` (PK, FK → auth.users)
- `exam` — enum: `cat`, `jee`, `neet`, `railways`, `ssc_upsc`, `banking`
- `attempt_year` (int)
- `exam_date` (date, nullable — prefilled from a lookup, editable)
- `daily_hours` (numeric)
- `preferred_time` — `morning` | `afternoon` | `evening` | `night`
- `prep_stage` — `beginner` | `revision` | `mock`
- `weak_subjects` (text[])
- `goal` (text — e.g. "IIT Bombay CSE / AIR < 500")
- `coaching_status` — `self_study` | `coaching` | `hybrid`
- `onboarded_at` (timestamptz)
- `created_at`, `updated_at`

RLS: user can read/update/insert their own row. Standard GRANTs + `service_role`.

Also add public `exam_groups` seed: one group per exam (CAT / JEE / NEET / Railways / SSC-UPSC / Banking) so users auto-join the right community.

## 2. Onboarding flow

New route `src/routes/app.onboarding.tsx` (under `_authenticated` gate).

`AppShell` / `app.index.tsx` checks `user_prep_profile.onboarded_at`. If missing → redirect to `/app/onboarding`. Dismissable "Skip for now" but reappears until completed.

**Wizard steps (4 short screens, progress bar):**
1. Target exam & attempt year — chip picker (CAT, JEE, NEET, Railways, SSC/UPSC, Banking) + year dropdown.
2. Daily capacity — hours slider (1–14) + preferred time-of-day chips.
3. Prep stage & weak subjects — stage radio + multi-select subjects (list adapts to chosen exam).
4. Goal & coaching status — free-text goal + self-study / coaching / hybrid.

Final screen: "Setting things up…" with animated checklist as each side-effect completes.

## 3. Post-onboarding side effects

Server function `finalizeOnboarding` (authenticated) does, atomically:
1. Upsert `user_prep_profile` and stamp `onboarded_at`.
2. Insert into `group_members` for the matching exam group → **auto-join community**.
3. Insert a countdown into the existing `alios.countdowns.v2` scheme *and* a server-side row (new small `user_countdowns` table if we want persistence — otherwise seed via localStorage on the client after redirect). Prefill with exam date from lookup.
4. Call Lovable AI (`google/gemini-3-flash-preview`) with the profile → generate a **starter weekly plan** stored in `ai_insights` (type=`study_plan`).
5. Call Lovable AI to generate a **mind-map roadmap**: creates a new `mindmap_boards` row titled "<Exam> Roadmap" and inserts nodes/edges (phases → subjects → topics) via the existing `api.ai-mindmap` logic. Redirect target after wizard = that new board.

## 4. Personalize AI Assistant

Update `src/routes/api.ai-ask.ts` and `api.ai-insights.ts`:
- After resolving the user, fetch `user_prep_profile` and prepend a compact context block to the system prompt (e.g. *"User is preparing for JEE 2027, ~6 hrs/day, revision stage, weak in Organic Chem, goal AIR<5000, self-study."*).
- Assistant suggestions on `app.assistant.tsx` become exam-aware (e.g. "Plan my week for JEE revision", "Quiz me on Organic Chem").

## 5. Edit anytime

New section in `src/routes/app.settings.tsx` → **Prep profile** card showing current answers with an "Edit" button that reopens the wizard prefilled, plus a "Redo onboarding" link.

## 6. Files touched

- **New migration**: `user_prep_profile` table + RLS + GRANTs + seed exam groups.
- **New**: `src/routes/app.onboarding.tsx` (wizard UI).
- **New**: `src/lib/onboarding.functions.ts` (`getPrepProfile`, `finalizeOnboarding`, `updatePrepProfile`).
- **New**: `src/lib/exam-catalog.ts` (exam metadata: subjects, typical exam date, default roadmap prompt).
- **Edit**: `src/components/AppShell.tsx` or `app.index.tsx` — redirect if not onboarded.
- **Edit**: `src/routes/api.ai-ask.ts`, `src/routes/api.ai-insights.ts` — inject profile context.
- **Edit**: `src/routes/app.assistant.tsx` — exam-aware suggestion chips.
- **Edit**: `src/routes/app.settings.tsx` — Prep profile section.
- **Edit**: `src/components/CountdownCalendar.tsx` — accept a seeded countdown from profile on first mount.

## Open items to confirm

- Do you want the **starter study plan** to live in a new "My Plan" page, or just as a card on the home page?
- For the **mind-map roadmap**: auto-open it after onboarding (my default), or just notify the user it was created?
- Should the wizard be **skippable** (defer with a persistent banner) or **hard-required** before using the app?
