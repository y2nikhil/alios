import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Brain, Coffee, FileText, Zap, TrendingUp, Activity, Target } from "lucide-react";
import { useAux } from "@/lib/aux-store";
import { formatDuration, formatShortDuration } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { useDailyStats } from "@/lib/use-daily-stats";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ManagerNotes } from "@/components/ManagerNotes";
import { AdherenceRing } from "@/components/AdherenceRing";
import { MyTasks } from "@/components/MyTasks";

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

  const quickActions = [
    { label: "Deep Work", icon: Brain, find: "Deep Work", color: "from-violet-500 to-fuchsia-500" },
    { label: "Take Break", icon: Coffee, find: "Break", color: "from-amber-500 to-orange-500" },
    { label: "Mind Map", icon: FileText, to: "/app/mindmap", color: "from-cyan-500 to-blue-500" },
  ];

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{greeting},</p>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">
            {user?.user_metadata?.display_name || user?.email?.split("@")[0]}
          </h1>
        </div>
        <div className="flex gap-2">
          {quickActions.map((a) => {
            const Icon = a.icon;
            const target = a.find ? statuses.find((s) => s.name === a.find) : null;
            const inner = (
              <Button
                variant="outline"
                size="sm"
                className="bg-white/5 border-white/10 hover:bg-white/10"
                onClick={target ? () => switchTo(target.id) : undefined}
              >
                <Icon className="h-3.5 w-3.5 mr-1.5" />
                {a.label}
              </Button>
            );
            return a.to ? (
              <Link key={a.label} to={a.to}>{inner}</Link>
            ) : (
              <span key={a.label}>{inner}</span>
            );
          })}
        </div>
      </div>

      {/* Hero live card */}
      <motion.div
        layout
        className="relative overflow-hidden rounded-3xl glass p-6 lg:p-10"
        style={{
          boxShadow: activeStatus
            ? `0 0 80px -20px ${activeStatus.color}40, inset 0 1px 0 0 rgba(255,255,255,0.05)`
            : undefined,
        }}
      >
        {activeStatus && (
          <div
            aria-hidden
            className="absolute -top-20 -right-20 h-72 w-72 rounded-full opacity-30 blur-3xl"
            style={{ backgroundColor: activeStatus.color }}
          />
        )}
        <div className="relative flex flex-col lg:flex-row items-start lg:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
              <Activity className="h-3 w-3" />
              Currently
            </div>
            <div className="mt-2 flex items-center gap-3">
              {activeStatus && (
                <span
                  className="h-3.5 w-3.5 rounded-full animate-pulse-glow"
                  style={{ backgroundColor: activeStatus.color, color: activeStatus.color }}
                />
              )}
              <h2 className="text-3xl lg:text-5xl font-bold tracking-tight">
                {activeStatus?.name ?? "Not punched in"}
              </h2>
            </div>
            <p className="mt-4 font-mono text-5xl lg:text-7xl font-bold tabular-nums tracking-tight text-gradient">
              {formatDuration(elapsed)}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 lg:max-w-md lg:justify-end">
            {statuses.slice(0, 6).map((s) => {
              const isActive = s.id === activeSession?.status_id;
              return (
                <button
                  key={s.id}
                  onClick={() => switchTo(s.id)}
                  className={cn(
                    "group flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                    isActive
                      ? "border-white/20 bg-white/10"
                      : "border-white/10 bg-white/5 hover:bg-white/10",
                  )}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: s.color }}
                  />
                  {s.name}
                </button>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* Mini timeline */}
      <div className="glass rounded-2xl p-4 lg:p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Today's timeline</h3>
          <Link to="/app/timeline" className="text-xs text-muted-foreground hover:text-foreground">
            View full →
          </Link>
        </div>
        <MiniTimeline />
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Target}
          label="Focus Score"
          value={`${stats.focusScore}`}
          accent="from-violet-500 to-fuchsia-500"
          sub={`${stats.productiveSeconds > 0 ? formatShortDuration(stats.productiveSeconds) : "0m"} productive`}
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

      {/* Manager Notes + Tasks + Goal/Adherence */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="glass rounded-2xl p-6">
          <ManagerNotes />
        </div>
        <div className="glass rounded-2xl p-6">
          <MyTasks />
        </div>
        <div className="grid gap-4">
          <GoalRingCard />
          <AdherenceRing />
        </div>
      </div>
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
        <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>
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

  if (todaySessions.length === 0) {
    return (
      <div className="h-12 rounded-lg bg-white/5 flex items-center justify-center text-xs text-muted-foreground">
        No activity yet today — punch a status to begin
      </div>
    );
  }

  return (
    <div className="relative h-12 rounded-lg bg-white/5 overflow-hidden">
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
      {/* Now indicator */}
      <div
        className="absolute top-0 bottom-0 w-px bg-white/60"
        style={{ left: `${((Date.now() - dayStart) / dayMs) * 100}%` }}
      />
    </div>
  );
}

function GoalRingCard() {
  const stats = useDailyStats();
  const goalMin = 300; // TODO: pull from profile
  const minDone = Math.floor(stats.productiveSeconds / 60);
  const pct = Math.min(100, Math.round((minDone / goalMin) * 100));
  const r = 56;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;

  return (
    <div className="glass rounded-2xl p-6 flex flex-col items-center justify-center">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">Daily goal</p>
      <div className="relative mt-4">
        <svg width="140" height="140" className="-rotate-90">
          <circle cx="70" cy="70" r={r} stroke="oklch(1 0 0 / 0.08)" strokeWidth="10" fill="none" />
          <motion.circle
            cx="70"
            cy="70"
            r={r}
            stroke="url(#goalGrad)"
            strokeWidth="10"
            fill="none"
            strokeLinecap="round"
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

