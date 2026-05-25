## Big-picture changes

This is a large, multi-system request. Shipping it as one "all-in-one render" without a shared shape will create conflicts (auth, sidebar, analytics, search all touch the same files). Here is the plan I'll execute in one pass.

### 1. Public / private watch parties + share link
- Add `visibility` column to `watch_parties`: `public` | `unlisted` | `private`.
- RLS: anyone can SELECT public; unlisted needs link (id known); private = host + invited participants only.
- In `NewPartyDialog`: radio toggle (Public / Link only / Private).
- In `app.collaborate.tsx` "Live Now" sidebar: only list `public` parties; show count.
- In `app.hangout.$partyId.tsx`: "Copy invite link" button in header.

### 2. Anonymous / guest mode
- New `src/lib/guest.tsx` provider: generates a local `guest_id` + display name, persists in `localStorage`.
- `AuthGuard` becomes `AuthOrGuestGuard`: only redirects to `/login` when the user tries to use a feature that requires auth (sending chat, creating party, joining party). Otherwise renders children.
- Add a `RequireAuthDialog` shown inline when a guest clicks "Send", "Create party", "Join party". Stores draft locally so it's not lost.
- Home `/app` (and most pages) viewable as guest with local-only state.

### 3. Watch Party in sidebar + on home
- Add "Watch Party" sidebar entry in `AppShell` pointing to a new `app.party.tsx` lobby (browse public parties + quick-create).
- On `app.index.tsx`: new "Live watch parties" panel with the top 4 public parties (poster + viewer count) and a "Start a party" button.

### 4. Admin / super-admin Live Feed
- New route `app.live.tsx` (gated by `useRole().isAdmin`).
- Real-time tiles: total users, active (aux session open), active watch parties (with participant lists), recent signups.
- Subscribes to `aux_sessions`, `watch_party_participants`, `watch_parties` via Supabase Realtime.
- Action buttons: end party (`update watch_parties set ended_at = now()`), force-leave participant, revoke user (super admin only, uses existing `revoke_account` function).
- Sidebar entry "Live Feed" only visible when `isAdmin`.

### 5. Better analytics + shareable timeline
- Add metrics to `app.analytics.tsx`: streak (consecutive days), top status by minutes, productive-vs-neutral split, weekly trend sparkline, group activity, chat messages sent, mind-map nodes created.
- Add a "Share my timeline" toggle on profile (new `profiles.timeline_public` boolean).
- Add public route `app.u.$userId.tsx` that shows another user's analytics if they've toggled it on.
- "Copy share link" button on analytics page.

### 6. Central command bar (search + AI ask)
- New `CommandBar` component mounted in `AppShell` header (centered, max-w-xl).
- Cmd/Ctrl+K opens it.
- Tabs: People · Groups · Parties · Pages · Ask AI.
- "Ask AI" calls a new `createServerFn` `askAi` that uses Lovable AI Gateway (`google/gemini-2.5-flash`) with user's recent stats as context.

### 7. Immersive home (more emoji, more panels)
- Reorganise `app.index.tsx` into a richer dashboard:
  - 👋 Greeting + streak + today's focus minutes
  - 🎬 Live watch parties panel
  - 🧠 Quick mind-map shortcuts
  - 💬 Recent group chatter
  - 🎯 My tasks (existing)
  - 🔥 Adherence ring (existing)
  - 📈 Mini sparkline of last 7 days
- Heavy use of emoji headers, gradient cards, subtle motion.

### 8. Mobile + perf cleanup (carry-over)
- Make sidebar collapse to bottom-nav on `< sm`.
- Lazy-load heavy routes (hangout, mindmap, live feed) via dynamic imports in router.

## Technical notes

- DB migration adds: `watch_parties.visibility`, `profiles.timeline_public`, RLS adjustments, and a `watch_party_invites(party_id, user_id)` table for private invites.
- Guest mode never writes to Supabase. Any write attempt opens the sign-in dialog with redirect-back.
- Real-time live feed uses one channel per table; cleaned up on unmount.
- All admin actions go through existing security-definer functions where possible; new function `end_watch_party(_id uuid)` added with role check.
- Command bar AI uses `LOVABLE_API_KEY` already in secrets.

## Order of operations
1. DB migration (visibility, invites, timeline_public, end_watch_party fn).
2. Guest provider + sign-in dialog.
3. Sidebar refresh (Watch Party, Live Feed entries, mobile bottom nav).
4. Command bar.
5. Public-party plumbing + share link.
6. Home redesign with live parties panel.
7. Live Feed admin page.
8. Analytics expansion + shareable public profile route.
9. Lazy-load routes for perf.

## What I won't do without confirmation
- I won't disable email confirmation or enable signups-as-anonymous in Supabase auth (guest mode is purely client-side; first real write requires real signup, per platform policy).
- I won't change the existing brand colors / black background you locked in earlier.

Reply "go" to ship the whole thing. If you want to drop or reorder any wave, tell me which.