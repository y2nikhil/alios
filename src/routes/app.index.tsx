import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Bolt, Play, SkipForward, Flame, ListChecks, Users, Plus, ArrowRight,
  Brain, Target, Coffee, Sparkles, Trophy,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useGuest } from "@/lib/guest";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/")({
  head: () => ({
    meta: [
      { title: "Command Center — ALIOS" },
      { name: "description", content: "Your study command center: focus score, streak, today's tasks, live study rooms." },
    ],
  }),
  component: CommandCenter,
});

// ── local-storage tasks for guests / quick capture ─────────────
type LocalTask = { id: string; title: string; subject: string; done: boolean };
const TASKS_KEY = "alios-tasks";
const STREAK_KEY = "alios-streak-days"; // ISO date list

function useLocalTasks() {
  const [tasks, setTasks] = useState<LocalTask[]>([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(TASKS_KEY);
      if (raw) setTasks(JSON.parse(raw));
      else setTasks([
        { id: "t1", title: "Read Chapter 5 — Thermodynamics", subject: "Physics", done: true },
        { id: "t2", title: "Submit Math assignment", subject: "Math", done: true },
        { id: "t3", title: "Revise organic reactions", subject: "Chem", done: false },
        { id: "t4", title: "Essay outline — History", subject: "History", done: false },
        { id: "t5", title: "Practice 20 MCQs", subject: "General", done: false },
      ]);
    } catch {/* ignore */}
  }, []);
  useEffect(() => {
    if (tasks.length) localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  }, [tasks]);
  return [tasks, setTasks] as const;
}

function subjectTone(s: string) {
  const map: Record<string, string> = {
    Physics: "tag-teal", Math: "tag-amber", Chem: "tag-brand", Chemistry: "tag-brand",
    History: "tag-coral", General: "tag-blue", English: "tag-coral", Biology: "tag-teal",
  };
  return map[s] ?? "tag-brand";
}

function CommandCenter() {
  const { user } = useAuth();
  const { guest } = useGuest();
  const displayName =
    user?.user_metadata?.display_name || user?.email?.split("@")[0] || guest?.display_name || "there";

  const [tasks, setTasks] = useLocalTasks();
  const done = tasks.filter((t) => t.done).length;
  const total = tasks.length;

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 5) return "Late night";
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  const toggleTask = (id: string) =>
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));

  // streak
  const streak = useMemo(() => {
    try {
      const raw = localStorage.getItem(STREAK_KEY);
      const days: string[] = raw ? JSON.parse(raw) : [];
      const today = new Date().toISOString().slice(0, 10);
      if (!days.includes(today)) {
        days.push(today);
        localStorage.setItem(STREAK_KEY, JSON.stringify(days.slice(-30)));
      }
      return days.length;
    } catch { return 1; }
  }, []);

  return (
    <div className="mx-auto max-w-7xl p-4 lg:p-6 space-y-4 lg:space-y-5">
      {/* greeting row */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[15px] font-semibold tracking-tight">{greeting}, {displayName} 👋</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            You have {total - done} task{total - done === 1 ? "" : "s"} due today
            <span className="mx-1.5">·</span>
            2 friends studying now
          </p>
        </div>
        <Link to="/app/focus">
          <Button size="sm" className="bg-brand text-primary-foreground hover:opacity-90 h-8">
            <Bolt className="h-3.5 w-3.5 mr-1" />Start Focus
          </Button>
        </Link>
      </div>

      {/* STAT GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <Stat label="Focus score" value="72" sub="↑ +8 from yesterday" accent />
        <Stat label="Study streak" value={String(streak)} unit="days" sub="Personal best: 21" />
        <Stat label="Hours today" value="3.5" sub="Goal: 5 hrs" />
        <Stat label="Tasks done" value={`${done}/${total}`} sub={`${Math.round((done / Math.max(total, 1)) * 100)}% complete`} success />
      </div>

      {/* POMODORO + STREAK */}
      <div className="grid gap-3 md:grid-cols-2">
        <Card title="Pomodoro timer" icon={<Target className="h-3.5 w-3.5" />}>
          <div className="flex items-center gap-4">
            <PomoRing pct={72} time="18:42" label="FOCUS" />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium">Physics: Waves chapter</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Session 2 of 4 · 45 min blocks</p>
              <div className="mt-2 flex gap-1.5">
                <Button size="sm" className="h-7 bg-brand text-primary-foreground hover:opacity-90 px-2">
                  <Play className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="outline" className="h-7 px-2">
                  <SkipForward className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <Card title="Weekly streak" icon={<Flame className="h-3.5 w-3.5" />}>
          <div className="flex gap-1.5">
            {["M","T","W","T","F","S","S"].map((d, i) => {
              const today = new Date().getDay(); // 0=Sun
              const mondayIdx = (today + 6) % 7; // 0 if Mon
              const state = i < mondayIdx ? "done" : i === mondayIdx ? "today" : "empty";
              return (
                <div
                  key={i}
                  className={cn(
                    "h-7 w-7 rounded-md flex items-center justify-center text-[10px] font-medium",
                    state === "done" && "bg-brand text-primary-foreground",
                    state === "today" && "bg-brand-soft text-brand-ink ring-1 ring-brand",
                    state === "empty" && "surface-3 text-muted-foreground",
                  )}
                >{d}</div>
              );
            })}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full surface-3 overflow-hidden">
              <div className="h-full bg-[oklch(0.62_0.12_165)]" style={{ width: "72%" }} />
            </div>
            <span className="text-[12px] font-semibold" style={{ color: "oklch(0.45 0.1 165)" }}>72%</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5">Weekly goal progress</p>
        </Card>
      </div>

      {/* TASKS + LIVE ROOMS */}
      <div className="grid gap-3 md:grid-cols-2">
        <Card
          title="Today's tasks"
          icon={<ListChecks className="h-3.5 w-3.5" />}
          action={<button className="text-[11px] text-brand hover:underline">+ Add</button>}
        >
          <div className="divide-y divide-border/60">
            {tasks.map((t) => (
              <button
                key={t.id}
                onClick={() => toggleTask(t.id)}
                className="w-full flex items-center gap-2 py-2 text-left hover:bg-accent/30 rounded px-1 -mx-1 transition-colors"
              >
                <span className={cn(
                  "h-4 w-4 rounded border-[0.5px] flex-shrink-0 flex items-center justify-center",
                  t.done ? "bg-[oklch(0.62_0.12_165)] border-[oklch(0.62_0.12_165)]" : "border-muted-foreground/40",
                )}>
                  {t.done && <svg className="h-2.5 w-2.5 text-white" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 6l3 3 5-6"/></svg>}
                </span>
                <span className={cn("flex-1 text-[12px]", t.done && "line-through text-muted-foreground")}>{t.title}</span>
                <span className={cn("tag", subjectTone(t.subject))}>{t.subject}</span>
              </button>
            ))}
          </div>
        </Card>

        <Card
          title="Live study rooms"
          icon={<Users className="h-3.5 w-3.5" />}
          action={<Link to="/app/rooms" className="text-[11px] text-brand hover:underline">See all</Link>}
        >
          <div className="space-y-2">
            <RoomCard live title="📐 JEE Maths — Integration" subtitle="Hosted by Priya S." count="8 studying now" tone="tag-teal" tag="Live" />
            <RoomCard title="🧬 Biology Finals Prep" subtitle="Open room · any stream" count="5 members" tone="tag-brand" tag="Quiet" />
            <RoomCard title="💻 Coding Doubts" subtitle="Python, DSA, Web" count="12 members" tone="tag-amber" tag="Active" />
          </div>
        </Card>
      </div>

      {/* SHORTCUTS */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Shortcut to="/app/tutor" icon={Brain} label="AI Tutor" sub="Explain anything" />
        <Shortcut to="/app/mindmap" icon={Sparkles} label="Mind Map" sub="Plan & connect ideas" />
        <Shortcut to="/app/rooms" icon={Users} label="Watch Party" sub="Watch together · sync" />
        <Shortcut to="/app/leaderboard" icon={Trophy} label="Leaderboard" sub="Weekly ranking" />
      </div>

      {/* AI nudge */}
      <div className="bg-brand-soft rounded-lg p-3 flex gap-2.5 items-start">
        <Brain className="h-4 w-4 text-brand mt-0.5 shrink-0" />
        <div className="text-[12px] text-brand-ink">
          <span className="font-semibold">AI insight · </span>
          You've been focusing well today — try a 10-min break, then jump into the JEE Maths room for some live integration practice.
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, unit, sub, accent, success }: { label: string; value: string; unit?: string; sub: string; accent?: boolean; success?: boolean }) {
  return (
    <div className="card-flat surface-2 px-3.5 py-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-[20px] font-semibold tracking-tight", accent && "text-brand", success && "text-[oklch(0.45_0.1_165)]")}>
        {value} {unit && <span className="text-[12px] font-normal text-muted-foreground">{unit}</span>}
      </p>
      <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>
    </div>
  );
}

function Card({ title, icon, action, children }: { title: string; icon: React.ReactNode; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="card-flat p-3.5">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-1.5 text-[13px] font-medium">
          <span className="text-muted-foreground">{icon}</span>
          {title}
        </div>
        {action}
      </div>
      {children}
    </motion.div>
  );
}

function PomoRing({ pct, time, label }: { pct: number; time: string; label: string }) {
  const r = 33;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <div className="relative h-20 w-20 shrink-0">
      <svg viewBox="0 0 80 80" className="h-20 w-20 -rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" stroke="var(--border)" strokeWidth="5" />
        <circle cx="40" cy="40" r={r} fill="none" stroke="var(--brand)" strokeWidth="5" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={offset} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[15px] font-semibold leading-none">{time}</span>
        <span className="text-[8px] text-muted-foreground mt-0.5">{label}</span>
      </div>
    </div>
  );
}

function RoomCard({ live, title, subtitle, count, tone, tag }: { live?: boolean; title: string; subtitle: string; count: string; tone: string; tag: string }) {
  return (
    <Link to="/app/rooms" className={cn(
      "block rounded-lg border-[0.5px] p-2.5 hover:bg-accent/40 transition-colors",
      live ? "border-[oklch(0.7_0.1_165)] bg-teal-soft/40" : "border-border surface-2",
    )}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[12px] font-medium leading-snug">{title}</p>
        <span className={cn("tag shrink-0", tone)}>{tag}</span>
      </div>
      <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>
      <p className="text-[10px] text-muted-foreground mt-1">{count}</p>
    </Link>
  );
}

function Shortcut({ to, icon: Icon, label, sub }: { to: string; icon: typeof Brain; label: string; sub: string }) {
  return (
    <Link to={to} className="card-flat surface-2 p-3 group hover:bg-accent/50 transition-colors">
      <div className="flex items-center justify-between">
        <Icon className="h-4 w-4 text-brand" />
        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <p className="mt-2 text-[12px] font-semibold">{label}</p>
      <p className="text-[10px] text-muted-foreground">{sub}</p>
    </Link>
  );
}
