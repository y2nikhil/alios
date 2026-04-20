import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useAux, type AuxSession } from "@/lib/aux-store";
import { Button } from "@/components/ui/button";
import { Download, TrendingUp, Brain, Clock, Coffee } from "lucide-react";
import { formatShortDuration } from "@/lib/format";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — ALIOS" },
      { name: "description", content: "Productivity heatmap, charts, and reality checks." },
    ],
  }),
  component: AnalyticsPage,
});

type Range = "7" | "30" | "90";

function AnalyticsPage() {
  const { user } = useAuth();
  const { statuses } = useAux();
  const [range, setRange] = useState<Range>("7");
  const [sessions, setSessions] = useState<AuxSession[]>([]);

  useEffect(() => {
    if (!user) return;
    const days = parseInt(range);
    const start = new Date();
    start.setDate(start.getDate() - days);
    start.setHours(0, 0, 0, 0);
    supabase
      .from("aux_sessions")
      .select("*")
      .eq("user_id", user.id)
      .gte("started_at", start.toISOString())
      .order("started_at")
      .then(({ data }) => setSessions((data as AuxSession[]) ?? []));
  }, [user, range]);

  const statusMap = useMemo(() => new Map(statuses.map((s) => [s.id, s])), [statuses]);

  const aggregate = useMemo(() => {
    let prod = 0, unprod = 0, neu = 0;
    const perStatus = new Map<string, number>();
    const perDay = new Map<string, { prod: number; total: number }>();
    let breakSum = 0, breakCount = 0;
    let longest = 0;

    for (const sess of sessions) {
      const start = new Date(sess.started_at).getTime();
      const end = sess.ended_at ? new Date(sess.ended_at).getTime() : Date.now();
      const dur = Math.max(0, Math.floor((end - start) / 1000));
      const status = statusMap.get(sess.status_id);
      if (!status) continue;

      perStatus.set(status.id, (perStatus.get(status.id) ?? 0) + dur);
      const dayKey = new Date(sess.started_at).toISOString().slice(0, 10);
      const dayEntry = perDay.get(dayKey) ?? { prod: 0, total: 0 };
      dayEntry.total += dur;
      if (status.category === "productive") {
        prod += dur;
        dayEntry.prod += dur;
        if (dur > longest) longest = dur;
      } else if (status.category === "unproductive") unprod += dur;
      else neu += dur;
      perDay.set(dayKey, dayEntry);

      const ln = status.name.toLowerCase();
      if (ln.includes("break") || ln.includes("lunch")) {
        breakSum += dur;
        breakCount += 1;
      }
    }

    const total = prod + unprod + neu;
    const score = total > 0 ? Math.round(((prod + neu * 0.3) / total) * 100) : 0;

    return { prod, unprod, neu, total, score, perStatus, perDay, breakSum, breakCount, longest };
  }, [sessions, statusMap]);

  const pieData = [
    { name: "Productive", value: aggregate.prod, color: "oklch(0.74 0.15 160)" },
    { name: "Neutral", value: aggregate.neu, color: "oklch(0.78 0.14 80)" },
    { name: "Unproductive", value: aggregate.unprod, color: "oklch(0.7 0.18 25)" },
  ].filter((d) => d.value > 0);

  const barData = Array.from(aggregate.perStatus.entries())
    .map(([id, sec]) => {
      const s = statusMap.get(id);
      return { name: s?.name ?? "?", minutes: Math.round(sec / 60), color: s?.color ?? "#666" };
    })
    .sort((a, b) => b.minutes - a.minutes);

  const exportCsv = () => {
    const rows = [["Started", "Status", "Category", "Duration (sec)", "Note"]];
    for (const s of sessions) {
      const st = statusMap.get(s.status_id);
      const dur = s.ended_at
        ? Math.floor((new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 1000)
        : 0;
      rows.push([s.started_at, st?.name ?? "", st?.category ?? "", String(dur), s.note ?? ""]);
    }
    const csv = rows.map((r) => r.map((c) => `"${(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `alios-sessions-${range}d.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground">Patterns, trends and the brutal truth.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-white/10 bg-white/5 p-0.5">
            {(["7", "30", "90"] as Range[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={cn(
                  "px-3 py-1 text-xs rounded-md transition-colors",
                  range === r ? "bg-white/10 text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {r}d
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={exportCsv} className="bg-white/5 border-white/10">
            <Download className="h-3.5 w-3.5 mr-1.5" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Top: Focus ring + heatmap */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="glass rounded-2xl p-6 flex flex-col items-center justify-center">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Focus Score</p>
          <FocusRing score={aggregate.score} />
          <p className="mt-3 text-xs text-muted-foreground">over last {range} days</p>
        </div>
        <div className="lg:col-span-2 glass rounded-2xl p-6">
          <h3 className="text-sm font-semibold mb-3">Productivity heatmap</h3>
          <Heatmap perDay={aggregate.perDay} days={parseInt(range)} />
        </div>
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="glass rounded-2xl p-6">
          <h3 className="text-sm font-semibold mb-4">Time distribution</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2} dataKey="value">
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} stroke="none" />)}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "oklch(0.18 0.025 265)", border: "1px solid oklch(1 0 0 / 0.1)", borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number) => formatShortDuration(v)}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyState />}
          <div className="mt-3 flex justify-center gap-4 text-xs">
            {pieData.map((d) => (
              <span key={d.name} className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
                {d.name}
              </span>
            ))}
          </div>
        </div>
        <div className="glass rounded-2xl p-6">
          <h3 className="text-sm font-semibold mb-4">Time per status</h3>
          {barData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={barData}>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "oklch(0.65 0.03 260)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "oklch(0.65 0.03 260)" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "oklch(0.18 0.025 265)", border: "1px solid oklch(1 0 0 / 0.1)", borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number) => `${v} min`}
                  cursor={{ fill: "oklch(1 0 0 / 0.05)" }}
                />
                <Bar dataKey="minutes" radius={[6, 6, 0, 0]}>
                  {barData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyState />}
        </div>
      </div>

      {/* Reality check */}
      <div className="grid gap-4 md:grid-cols-3">
        <Stat icon={Clock} label="Total tracked" value={formatShortDuration(aggregate.total)} />
        <Stat icon={Brain} label="Longest focus" value={formatShortDuration(aggregate.longest)} />
        <Stat icon={Coffee} label="Avg break" value={aggregate.breakCount > 0 ? formatShortDuration(Math.floor(aggregate.breakSum / aggregate.breakCount)) : "—"} />
      </div>

      <div className="glass rounded-2xl p-6">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-amber-400" />
          <h3 className="text-sm font-semibold">Reality Check</h3>
        </div>
        <ul className="mt-3 space-y-2 text-sm text-foreground/85">
          <li>• You spent <span className="font-semibold text-foreground">{formatShortDuration(aggregate.unprod)}</span> on low-value statuses.</li>
          <li>• Productive ratio: <span className="font-semibold">{aggregate.total > 0 ? Math.round((aggregate.prod / aggregate.total) * 100) : 0}%</span></li>
          <li>• {aggregate.breakCount} breaks taken, totaling <span className="font-semibold">{formatShortDuration(aggregate.breakSum)}</span>.</li>
        </ul>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}

function EmptyState() {
  return <div className="h-60 flex items-center justify-center text-sm text-muted-foreground">No data yet</div>;
}

function FocusRing({ score }: { score: number }) {
  const r = 70;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  return (
    <div className="relative mt-4">
      <svg width="180" height="180" className="-rotate-90">
        <circle cx="90" cy="90" r={r} stroke="oklch(1 0 0 / 0.08)" strokeWidth="12" fill="none" />
        <motion.circle
          cx="90" cy="90" r={r}
          stroke="url(#focusGrad)" strokeWidth="12" fill="none" strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.4, ease: "easeOut" }}
        />
        <defs>
          <linearGradient id="focusGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="oklch(0.74 0.18 280)" />
            <stop offset="100%" stopColor="oklch(0.78 0.16 200)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-5xl font-bold text-gradient">{score}</p>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">/ 100</p>
      </div>
    </div>
  );
}

function Heatmap({ perDay, days }: { perDay: Map<string, { prod: number; total: number }>; days: number }) {
  const cells = useMemo(() => {
    const arr: { date: string; intensity: number; minutes: number }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const entry = perDay.get(key);
      const min = entry ? Math.round(entry.prod / 60) : 0;
      const intensity = Math.min(4, Math.floor(min / 60)); // 0-4 scale by hour
      arr.push({ date: key, intensity, minutes: min });
    }
    return arr;
  }, [perDay, days]);

  const cols = Math.ceil(cells.length / 7);
  return (
    <div className="overflow-x-auto scrollbar-thin">
      <div className="grid grid-flow-col gap-1" style={{ gridTemplateRows: "repeat(7, minmax(0, 1fr))" }}>
        {cells.map((c) => (
          <div
            key={c.date}
            title={`${c.date} — ${c.minutes}m productive`}
            className={cn(
              "h-4 w-4 rounded-sm border border-white/5",
              c.intensity === 0 && "bg-white/5",
              c.intensity === 1 && "bg-violet-900",
              c.intensity === 2 && "bg-violet-700",
              c.intensity === 3 && "bg-violet-500",
              c.intensity === 4 && "bg-violet-400",
            )}
          />
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 text-[10px] text-muted-foreground">
        Less
        <span className="h-3 w-3 rounded-sm bg-white/5" />
        <span className="h-3 w-3 rounded-sm bg-violet-900" />
        <span className="h-3 w-3 rounded-sm bg-violet-700" />
        <span className="h-3 w-3 rounded-sm bg-violet-500" />
        <span className="h-3 w-3 rounded-sm bg-violet-400" />
        More
      </div>
    </div>
  );
}
