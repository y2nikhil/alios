import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Brain, Coffee, FileText, Zap, TrendingUp, Activity, Target,
  MessageSquare, Youtube, Shield, Crown, Sparkles, Calendar as CalIcon,
  Trophy, Info,
} from "lucide-react";
import { useAux } from "@/lib/aux-store";
import { formatDuration, formatShortDuration } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { useDailyStats } from "@/lib/use-daily-stats";
import { useRole } from "@/lib/use-role";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ManagerNotes } from "@/components/ManagerNotes";
import { AdherenceRing } from "@/components/AdherenceRing";
import { MyTasks } from "@/components/MyTasks";
import { AISummaryPanel } from "@/components/AISummaryPanel";
import { CountdownCalendar } from "@/components/CountdownCalendar";
import { AwardsShelf } from "@/components/AwardsShelf";

export const Route = createFileRoute("/app/")({
  head: () => ({
    meta: [
      { title: "Command Center — ALIOS" },
      { name: "description", content: "Your personal command center: live status, focus score, AI insights." },
    ],
  }),
  component: CommandCenter,
});

function CommandCenter() {
  const { user } = useAuth();
  const { isAdmin, isSuperAdmin } = useRole();
  const { activeSession, activeStatus, statuses, todaySessions, switchTo } = useAux();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);

  const elapsed = activeSession
    ? Math.floor((now - new Date(activeSession.started_at).getTime()) / 1000)
    : 0;

  const stats = useDailyStats();

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 5) return "Late night";
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  const displayName = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "there";

  const startedAt = activeSession
    ? new Date(activeSession.started_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null;

  const streakHours = Math.floor(stats.longestStreak / 3600);

  const focusGoal = 8 * 3600;
  const focusPct = Math.min(100, Math.round((stats.productiveSeconds / focusGoal) * 100));

  const quickActions = [
    { label: "AI Assistant", icon: Sparkles, to: "/app/assistant", color: "from-violet-500 to-fuchsia-500" },
    { label: "Take Break", icon: Coffee, find: "Break", color: "from-amber-500 to-orange-500" },
    { label: "Mind Map", icon: FileText, to: "/app/mindmap", color: "from-cyan-500 to-blue-500" },
  ];

  const workspaceCards = [
    {
      label: "Collaborate", description: "14 online · New messages",
      to: "/app/collaborate", icon: MessageSquare, tone: "from-emerald-500 to-cyan-500", enabled: true,
    },
    {
      label: "Playlists", description: "Continue learning",
      to: "/app/playlists", icon: Youtube, tone: "from-rose-500 to-orange-500", enabled: true,
    },
    {
      label: "Admin Panel", description: "Members, tasks, oversight",
      to: "/app/admin", icon: Shield, tone: "from-violet-500 to-indigo-500", enabled: isAdmin,
    },
    {
      label: "Watch Party", description: "Start or join a party",
      to: "/app/party", icon: Youtube, tone: "from-fuchsia-500 to-rose-500", enabled: true,
    },
    {
      label: "Super Admin", description: "Roles, audit log, oversight",
      to: "/app/super", icon: Crown, tone: "from-amber-500 to-rose-500", enabled: isSuperAdmin,
    },
  ].filter((c) => c.enabled).slice(0, 4);

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Greeting + quick actions */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{greeting}, <span aria-hidden>👋</span></p>
          <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">{displayName}</h1>
        </div>
        <div className="flex gap-2 flex-wrap">
          {quickActions.map((a) => {
            const Icon = a.icon;
            const target = a.find ? statuses.find((s) => s.name === a.find) : null;
            const inner = (
              <Button
                variant="outline"
                size="sm"
                className="bg-white/5 border-white/10 hover:bg-white/10 h-9 rounded-xl px-4"
                onClick={target ? () => switchTo(target.id) : undefined}
              >
                <Icon className="h-3.5 w-3.5 mr-1.5" />
                {a.label}
              </Button>
            );
            return a.to ? <Link key={a.label} to={a.to}>{inner}</Link> : <span key={a.label}>{inner}</span>;
          })}
        </div>
      </div>

      {/* Main grid: left content 3 cols, right column 1 col */}
      <div className="grid gap-5 xl:grid-cols-4">
        {/* LEFT CONTENT */}
        <div className="xl:col-span-3 space-y-5">
          {/* Hero: focused card + focus/upcoming */}
          <div className="grid gap-5 md:grid-cols-3">
            {/* Currently focused */}
            <motion.div
              layout
              className="md:col-span-2 relative overflow-hidden rounded-3xl glass p-6"
              style={{
                boxShadow: activeStatus
                  ? `0 0 80px -20px ${activeStatus.color}40, inset 0 1px 0 0 rgba(255,255,255,0.05)`
                  : undefined,
              }}
            >
              {activeStatus && (
                <div
                  aria-hidden
                  className="absolute -top-20 -right-20 h-72 w-72 rounded-full opacity-25 blur-3xl"
                  style={{ backgroundColor: activeStatus.color }}
                />
              )}
              <div className="relative">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
                  <span className="text-violet-400">✦</span> Currently Focused
                </div>
                <div className="mt-3 flex items-center gap-3">
                  {activeStatus && (
                    <span
                      className="h-3 w-3 rounded-full animate-pulse-glow"
                      style={{ backgroundColor: activeStatus.color, color: activeStatus.color }}
                    />
                  )}
                  <h2 className="text-3xl lg:text-4xl font-bold tracking-tight">
                    {activeStatus?.name ?? "Not punched in"}
                  </h2>
                </div>
                <p className="mt-4 font-mono text-5xl lg:text-6xl font-bold tabular-nums tracking-tight text-gradient">
                  {formatDuration(elapsed)}
                </p>

                <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {streakHours > 0 && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-2.5 py-1">
                      <Zap className="h-3 w-3 text-amber-400" /> {streakHours}h streak
                    </span>
                  )}
                  {startedAt && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-2.5 py-1">
                      <Activity className="h-3 w-3" /> Started at {startedAt}
                    </span>
                  )}
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {statuses.slice(0, 5).map((s) => {
                    const isActive = s.id === activeSession?.status_id;
                    return (
                      <button
                        key={s.id}
                        onClick={() => switchTo(s.id)}
                        className={cn(
                          "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                          isActive
                            ? "border-white/20 bg-white/10"
                            : "border-white/10 bg-white/5 hover:bg-white/10",
                        )}
                      >
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                        {s.name}
                      </button>
                    );
                  })}
                  {statuses.length > 5 && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-muted-foreground">
                      + More
                    </span>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Today's Focus + Upcoming */}
            <div className="space-y-5">
              <div className="glass rounded-3xl p-5">
                <p className="text-xs text-muted-foreground">Today's Focus</p>
                <p className="mt-1 text-3xl font-bold text-gradient">{focusPct}%</p>
                <div className="mt-3 h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${focusPct}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-violet-500 to-cyan-400"
                  />
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground tabular-nums">
                  {formatShortDuration(stats.productiveSeconds)} / 8h
                </p>
              </div>
              <div className="glass rounded-3xl p-5">
                <p className="text-xs text-muted-foreground">Upcoming</p>
                <p className="mt-1 text-lg font-bold leading-tight">CAT Mock Test</p>
                <p className="mt-1 text-[11px] text-muted-foreground flex items-center gap-1.5">
                  <CalIcon className="h-3 w-3" /> Today, 06:00 PM
                </p>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="glass rounded-3xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold">Today's Timeline</h3>
                <Info className="h-3 w-3 text-muted-foreground" />
              </div>
              <Link to="/app/timeline" className="text-xs text-muted-foreground hover:text-foreground">
                View full timeline →
              </Link>
            </div>
            <MiniTimeline />
          </div>

          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={Target}
              label="Focus Score"
              value={`${stats.focusScore}`}
              accent="from-violet-500 to-fuchsia-500"
              sub={`${formatShortDuration(stats.productiveSeconds)} productive`}
            />
            <StatCard
              icon={Zap}
              label="Longest Streak"
              value={formatShortDuration(stats.longestStreak)}
              accent="from-amber-500 to-orange-500"
              sub="of focused work"
            />
            <StatCard
              icon={Coffee}
              label="Avg. Break"
              value={formatShortDuration(stats.avgBreak)}
              accent="from-cyan-500 to-blue-500"
              sub={`${stats.breakCount} breaks today`}
            />
            <StatCard
              icon={TrendingUp}
              label="Sessions"
              value={`${todaySessions.length}`}
              accent="from-emerald-500 to-teal-500"
              sub="status switches today"
            />
          </div>

          {/* Workspaces */}
          <section className="glass rounded-3xl p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
              Workspaces
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {workspaceCards.map((card) => {
                const Icon = card.icon;
                return (
                  <Link
                    key={card.to}
                    to={card.to}
                    className="group rounded-2xl border border-white/10 bg-white/5 p-4 transition-colors hover:bg-white/10"
                  >
                    <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lg", card.tone)}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="mt-3">
                      <p className="text-sm font-semibold">{card.label}</p>
                      <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{card.description}</p>
                      <p className="mt-3 text-[11px] text-violet-300 group-hover:translate-x-0.5 transition-transform">Open →</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* Tasks + Notes + Goal/Adherence */}
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="glass rounded-3xl p-6"><MyTasks /></div>
            <div className="glass rounded-3xl p-6"><ManagerNotes /></div>
            <div className="grid gap-4">
              <GoalRingCard />
              <AdherenceRing />
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-5">
          <AISummaryPanel />

          <div className="glass rounded-3xl p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground truncate">
                Upcoming
              </p>
              <Link to="/app/calendar" className="text-[11px] text-muted-foreground hover:text-foreground shrink-0">
                Open calendar →
              </Link>
            </div>
            <UpcomingList />
          </div>


          <CountdownCalendar />

          <div className="glass rounded-3xl p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="h-3.5 w-3.5 text-amber-400" />
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                  Trophy Shelf
                </p>
              </div>
            </div>
            <div className="mt-3">
              <AwardsShelf userId={user?.id} showLocked />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function UpcomingList() {
  const [events, setEvents] = useState<Array<{ id: string; title: string; date: string; time?: string; color?: string }>>([]);
  useEffect(() => {
    try { setEvents(JSON.parse(localStorage.getItem("alios.calendar.events.v1") ?? "[]")); } catch { /* ignore */ }
  }, []);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const upcoming = events
    .filter((e) => new Date(e.date + "T00:00:00").getTime() >= today.getTime())
    .sort((a, b) => (a.date + (a.time ?? "")).localeCompare(b.date + (b.time ?? "")))
    .slice(0, 3);

  if (upcoming.length === 0) {
    return (
      <div className="mt-3 rounded-xl border border-dashed border-white/10 p-4 text-center">
        <p className="text-xs text-muted-foreground">No upcoming events yet.</p>
        <Link to="/app/calendar" className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-violet-300 hover:text-violet-200">
          <CalIcon className="h-3 w-3" /> Add your first event
        </Link>
      </div>
    );
  }
  return (
    <div className="mt-3 space-y-2">
      {upcoming.map((e) => {
        const d = new Date(e.date + "T00:00:00");
        const when = d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" }) + (e.time ? `, ${e.time}` : "");
        const diffDays = Math.round((d.getTime() - today.getTime()) / 86400000);
        const chip = diffDays === 0 ? "Today" : diffDays === 1 ? "Tomorrow" : `In ${diffDays}d`;
        return <UpcomingItem key={e.id} title={e.title} when={when} chip={chip} />;
      })}
    </div>
  );
}

function UpcomingItem({ title, when, chip }: { title: string; when: string; chip: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 min-w-0">
      <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500/30 to-cyan-400/20 grid place-items-center shrink-0">
        <CalIcon className="h-3.5 w-3.5 text-violet-300" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{title}</p>
        <p className="text-[11px] text-muted-foreground truncate">{when}</p>
      </div>
      <span className="text-[10px] font-semibold text-amber-300 bg-amber-400/10 border border-amber-400/20 rounded-full px-2 py-0.5 shrink-0 whitespace-nowrap">
        {chip}
      </span>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: typeof Target;
  label: string;
  value: string;
  sub: string;
  accent: string;
}) {
  return (
    <div className="glass rounded-2xl p-5 relative overflow-hidden">
      <div className={cn("absolute -top-8 -right-8 h-24 w-24 rounded-full opacity-20 blur-2xl bg-gradient-to-br", accent)} />
      <div className="relative">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />
          {label}
        </div>
        <p className="mt-2 text-3xl font-bold tracking-tight tabular-nums">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
      </div>
    </div>
  );
}

function MiniTimeline() {
  const { todaySessions, statuses } = useAux();
  const dayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);
  const dayMs = 24 * 60 * 60 * 1000;
  const statusMap = new Map(statuses.map((s) => [s.id, s]));

  const hourMarks = [6, 9, 12, 15, 18, 21];

  if (todaySessions.length === 0) {
    return (
      <div className="h-20 rounded-xl bg-white/5 flex items-center justify-center text-xs text-muted-foreground">
        No activity yet today — punch a status to begin
      </div>
    );
  }

  return (
    <div>
      <div className="relative h-14 rounded-xl bg-white/5 overflow-hidden">
        {todaySessions.map((sess) => {
          const start = new Date(sess.started_at).getTime();
          const end = sess.ended_at ? new Date(sess.ended_at).getTime() : Date.now();
          const left = ((start - dayStart) / dayMs) * 100;
          const width = ((end - start) / dayMs) * 100;
          const status = statusMap.get(sess.status_id);
          return (
            <div
              key={sess.id}
              className="absolute top-0 h-full transition-opacity hover:opacity-80"
              style={{
                left: `${left}%`,
                width: `${Math.max(0.2, width)}%`,
                backgroundColor: status?.color ?? "#666",
              }}
              title={`${status?.name ?? "?"} — ${formatShortDuration(Math.floor((end - start) / 1000))}`}
            />
          );
        })}
        <div
          className="absolute top-0 bottom-0 w-px bg-white/70"
          style={{ left: `${((Date.now() - dayStart) / dayMs) * 100}%` }}
        />
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-muted-foreground tabular-nums px-1">
        {hourMarks.map((h) => (
          <span key={h}>{h > 12 ? `${h - 12} PM` : h === 12 ? "12 PM" : `${h} AM`}</span>
        ))}
      </div>
    </div>
  );
}

function GoalRingCard() {
  const stats = useDailyStats();
  const goalMin = 300;
  const minDone = Math.floor(stats.productiveSeconds / 60);
  const pct = Math.min(100, Math.round((minDone / goalMin) * 100));
  const r = 56;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;

  return (
    <div className="glass rounded-3xl p-6 flex flex-col items-center justify-center">
      <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Daily Goal</p>
      <div className="relative mt-4">
        <svg width="140" height="140" className="-rotate-90">
          <circle cx="70" cy="70" r={r} stroke="oklch(1 0 0 / 0.08)" strokeWidth="10" fill="none" />
          <motion.circle
            cx="70" cy="70" r={r}
            stroke="url(#goalGrad)" strokeWidth="10" fill="none" strokeLinecap="round"
            strokeDasharray={c}
            initial={{ strokeDashoffset: c }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          />
          <defs>
            <linearGradient id="goalGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="oklch(0.74 0.18 280)" />
              <stop offset="100%" stopColor="oklch(0.78 0.16 200)" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-3xl font-bold">{pct}%</p>
          <p className="text-[10px] text-muted-foreground">{minDone}/{goalMin} min</p>
        </div>
      </div>
      <p className="mt-3 text-xs text-center text-muted-foreground">
        {pct >= 100 ? "🎉 Crushed it!" : `${goalMin - minDone} min to your goal`}
      </p>
    </div>
  );
}
