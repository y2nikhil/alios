
# ALIOS — AI Life Operating System

A premium, dark-first personal workforce & productivity tool. Track your status (AUX), see your day as a timeline, get analytics, and capture ideas on an infinite mind map — all powered by AI insights.

---

## v1 Scope (this build)

**1. Auth & accounts**
- Email/password sign in via Lovable Cloud
- Cloud sync so your data follows you across devices
- Per-user data isolation (RLS)

**2. AUX Status System (the core)**
- Sidebar with default statuses: Available, On Queue, Deep Work, Meeting, Break, Lunch, Away, Busy, Idle
- Each status has: name, color, category (Productive / Neutral / Unproductive), paid/unpaid
- Click a status → it activates, live HH:MM:SS timer starts, previous session is logged
- Manage / Create / Edit / Delete custom statuses
- Active status pulses with its color (premium micro-animation)
- Keyboard shortcuts (1–9) for fast switching
- Auto-detect idle (no input for X mins) → optional auto-switch to Idle

**3. Command Center (Home dashboard)**
- Big live status card with running timer + quick switch buttons
- Today's focus score + daily goal progress ring
- Mini timeline strip across the top
- AI Insight card (e.g. "Most productive 10 AM–1 PM")
- Quick actions: Start Deep Work, Take Break, Open Mind Map, Add Note

**4. Timeline view**
- Full-day color-coded horizontal timeline
- Zoom: 15min / hour / day / week
- Hover any block → exact time + status + duration
- Click a block → details panel (edit / delete / add note)
- "Replay Day" animation that scrubs through your day

**5. Analytics dashboard**
- Productivity ring (big circular Focus Score)
- Total time per AUX (bar + pie)
- % productive vs unproductive
- Longest focus streak, average break duration
- GitHub-style productivity heatmap (week grid)
- Daily / weekly / monthly comparisons
- "Reality Check" card with honest stats
- CSV export

**6. AI Insights (real, via Lovable AI)**
- Pattern detection: peak hours, common idle triggers, break frequency
- Personalized suggestions ("Try a longer break at 2 PM")
- Confidence score on each insight
- Refreshes daily or on demand

**7. Mind Map canvas**
- Infinite pannable/zoomable canvas (React Flow)
- Double-click anywhere → new editable node
- Drag from any of 4 connection points → release to create connected child node
- Node types: Text, Image, Link (auto-preview), Task (checkbox)
- Smart paste (Ctrl+V): text → text node, image → image node, URL → link card
- Long text auto-collapses with "Show more" + resizable boxes
- Right-click menu: Delete, Change color, Add tag, **AI: Summarize / Expand / Convert to tasks**
- Multiple boards, autosave to cloud
- Soft glowing connection lines, dark premium styling

**8. Goals & gamification**
- Set daily goal (e.g. 5h Deep Work)
- Progress bar + Focus Score (0–100)
- Daily streak counter

---

## Visual direction

Premium SaaS, dark-first:
- Deep near-black backgrounds with subtle gradient washes
- Glassmorphic cards with soft inner glow
- Vibrant but muted status dots (emerald, amber, rose, violet, slate)
- Smooth Framer Motion micro-animations (status pulse, timer tick, card hover lift, page transitions)
- Inter / Geist font, generous spacing, rounded-2xl cards
- Light mode toggle as a polish item

---

## App structure

| Route | Purpose |
|---|---|
| `/login`, `/signup` | Auth |
| `/` | Command Center dashboard |
| `/timeline` | Full timeline view |
| `/analytics` | Analytics + heatmap + insights |
| `/mindmap` | Mind map boards list |
| `/mindmap/$boardId` | Canvas |
| `/settings` | Manage AUX statuses, goals, shortcuts |

Persistent left sidebar with AUX list (always-visible status switcher) + nav.

---

## Data model (Lovable Cloud)

- `profiles` — display name, avatar, daily goal
- `aux_statuses` — user's custom + default statuses
- `aux_sessions` — every status switch with start/end timestamps
- `mindmap_boards`, `mindmap_nodes`, `mindmap_edges`
- `daily_summaries` — cached focus scores & analytics
- `ai_insights` — generated insights cache

All tables RLS-protected to the owning user.

---

## Out of scope for v1 (saved for later)
- Google Calendar integration
- Voice command status switching
- Mobile app (Tempo-style)
- Shift trades / team features

After v1 ships, we'll layer these on based on what you actually use most.
