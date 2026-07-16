import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useAux, type AuxSession, type AuxStatus } from "@/lib/aux-store";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatShortDuration, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/timeline")({
  head: () => ({
    meta: [
      { title: "Timeline — ClassLab" },
      { name: "description", content: "Full day timeline of your status sessions." },
    ],
  }),
  component: TimelinePage,
});

type Tick = "5min" | "15min" | "30min";

const WINDOW_MIN = 120; // fixed 2-hour window

function TimelinePage() {
  const { user } = useAuth();
  const { statuses } = useAux();
  const [date, setDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [sessions, setSessions] = useState<AuxSession[]>([]);
  const [tick, setTick] = useState<Tick>("15min");
  const [selected, setSelected] = useState<AuxSession | null>(null);

  // windowEndMin: minute-of-day where the visible window ends. Default: now (if today) or end of day.
  const nowMin = () => {
    const n = new Date();
    return n.getHours() * 60 + n.getMinutes();
  };
  const isToday = date.toDateString() === new Date().toDateString();
  const maxEnd = isToday ? Math.max(WINDOW_MIN, nowMin()) : 1440;
  const [windowEndMin, setWindowEndMin] = useState<number>(maxEnd);

  // Keep windowEndMin in valid range whenever the day/isToday changes
  useEffect(() => {
    setWindowEndMin(isToday ? Math.max(WINDOW_MIN, nowMin()) : 1440);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  // Auto-advance the window edge as time passes when viewing today at "live" edge
  useEffect(() => {
    if (!isToday) return;
    const i = setInterval(() => {
      setWindowEndMin((cur) => {
        const n = nowMin();
        // If user is at (or near) the live edge, keep pinning to now
        if (Math.abs(cur - n) < 2 || cur >= n) return Math.max(WINDOW_MIN, n);
        return cur;
      });
    }, 30000);
    return () => clearInterval(i);
  }, [isToday]);

  useEffect(() => {
    if (!user) return;
    const start = new Date(date);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    supabase
      .from("aux_sessions")
      .select("*")
      .eq("user_id", user.id)
      .gte("started_at", start.toISOString())
      .lte("started_at", end.toISOString())
      .order("started_at")
      .then(({ data }) => setSessions((data as AuxSession[]) ?? []));
  }, [user, date]);

  const statusMap = useMemo(() => new Map(statuses.map((s) => [s.id, s])), [statuses]);
  const dayStart = date.getTime();

  const tickMin = tick === "5min" ? 5 : tick === "15min" ? 15 : 30;
  const ticks = WINDOW_MIN / tickMin;
  const windowStartMin = Math.max(0, windowEndMin - WINDOW_MIN);
  const windowEndMs = dayStart + windowEndMin * 60 * 1000;
  const windowStartMs = dayStart + windowStartMin * 60 * 1000;
  const windowMs = WINDOW_MIN * 60 * 1000;

  const labels = Array.from({ length: ticks }, (_, i) => {
    const m = windowStartMin + i * tickMin;
    return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  });

  const shiftDay = (delta: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + delta);
    setDate(d);
  };

  const goLive = () => {
    if (!isToday) {
      const d = new Date(); d.setHours(0, 0, 0, 0); setDate(d);
    }
    setWindowEndMin(Math.max(WINDOW_MIN, nowMin()));
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Timeline</h1>
          <p className="text-sm text-muted-foreground">{date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })} · last 2 hours</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => shiftDay(-1)} className="bg-white/5 border-white/10">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goLive} className="bg-white/5 border-white/10">
            {isToday ? "Live" : "Today"}
          </Button>
          <Button variant="outline" size="icon" disabled={isToday} onClick={() => shiftDay(1)} className="bg-white/5 border-white/10">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <div className="ml-2 flex items-center rounded-lg border border-white/10 bg-white/5 p-0.5">
            {(["5min", "15min", "30min"] as Tick[]).map((z) => (
              <button
                key={z}
                onClick={() => setTick(z)}
                className={cn(
                  "px-2.5 py-1 text-xs rounded-md transition-colors",
                  tick === z ? "bg-white/10 text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {z}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Track */}
      <div className="glass rounded-2xl p-4 lg:p-6">
        <div>
          {/* Tick labels */}
          <div className="grid text-[10px] text-muted-foreground" style={{ gridTemplateColumns: `repeat(${ticks}, 1fr)` }}>
            {labels.map((l, i) => (
              <div key={i} className="px-1 truncate">{l}</div>
            ))}
          </div>
          {/* Track */}
          <div className="relative mt-2 h-20 rounded-xl bg-white/5 overflow-hidden border border-white/5">
            {/* gridlines */}
            <div className="absolute inset-0 grid pointer-events-none" style={{ gridTemplateColumns: `repeat(${ticks}, 1fr)` }}>
              {Array.from({ length: ticks }).map((_, i) => (
                <div key={i} className="border-r border-white/[0.04]" />
              ))}
            </div>
            {sessions.map((sess) => {
              const start = new Date(sess.started_at).getTime();
              const end = sess.ended_at ? new Date(sess.ended_at).getTime() : Date.now();
              // clip to window
              if (end <= windowStartMs || start >= windowEndMs) return null;
              const clipStart = Math.max(start, windowStartMs);
              const clipEnd = Math.min(end, windowEndMs);
              const left = ((clipStart - windowStartMs) / windowMs) * 100;
              const width = ((clipEnd - clipStart) / windowMs) * 100;
              const status = statusMap.get(sess.status_id);
              return (
                <motion.button
                  key={sess.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={() => setSelected(sess)}
                  className="absolute top-2 bottom-2 rounded-md transition-all hover:brightness-125 hover:top-1 hover:bottom-1"
                  style={{
                    left: `${left}%`,
                    width: `${Math.max(0.5, width)}%`,
                    backgroundColor: status?.color ?? "#666",
                    boxShadow: `0 0 16px -4px ${status?.color ?? "#666"}80`,
                  }}
                  title={`${status?.name} — ${formatShortDuration(Math.floor((end - start) / 1000))}`}
                />
              );
            })}
            {/* Now indicator (only if in-window) */}
            {isToday && Date.now() >= windowStartMs && Date.now() <= windowEndMs && (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-white/80 pointer-events-none"
                style={{
                  left: `${((Date.now() - windowStartMs) / windowMs) * 100}%`,
                  boxShadow: "0 0 12px rgba(255,255,255,0.6)",
                }}
              />
            )}
          </div>

          {/* Scrollback slider */}
          <div className="mt-4 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Scroll back through the day</span>
              <span className="font-mono tabular-nums">
                {String(Math.floor(windowStartMin / 60)).padStart(2, "0")}:{String(windowStartMin % 60).padStart(2, "0")}
                {" → "}
                {String(Math.floor(windowEndMin / 60)).padStart(2, "0")}:{String(windowEndMin % 60).padStart(2, "0")}
              </span>
            </div>
            <input
              type="range"
              min={WINDOW_MIN}
              max={maxEnd}
              step={5}
              value={Math.min(windowEndMin, maxEnd)}
              onChange={(e) => setWindowEndMin(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>
        </div>
      </div>


      {/* Sessions list */}
      <div className="glass rounded-2xl">
        <div className="p-4 border-b border-white/5">
          <h3 className="text-sm font-semibold">Sessions ({sessions.length})</h3>
        </div>
        <div className="divide-y divide-white/5 max-h-96 overflow-y-auto scrollbar-thin">
          {sessions.length === 0 && (
            <p className="p-8 text-center text-sm text-muted-foreground">No sessions on this day</p>
          )}
          {sessions.map((sess) => {
            const status = statusMap.get(sess.status_id);
            const dur = sess.ended_at
              ? Math.floor((new Date(sess.ended_at).getTime() - new Date(sess.started_at).getTime()) / 1000)
              : Math.floor((Date.now() - new Date(sess.started_at).getTime()) / 1000);
            return (
              <button
                key={sess.id}
                onClick={() => setSelected(sess)}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 text-left"
              >
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: status?.color }} />
                <span className="font-medium text-sm flex-1">{status?.name ?? "Unknown"}</span>
                <span className="text-xs text-muted-foreground">{formatTime(sess.started_at)}</span>
                <span className="text-xs font-mono tabular-nums text-foreground/80">{formatShortDuration(dur)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {selected && <SessionDetails sess={selected} status={statusMap.get(selected.status_id) ?? null} onClose={() => setSelected(null)} onChanged={() => {
        setSelected(null);
        // refresh
        const d = date;
        setDate(new Date(d));
      }} />}
    </div>
  );
}

function SessionDetails({ sess, status, onClose, onChanged }: { sess: AuxSession; status: AuxStatus | null; onClose: () => void; onChanged: () => void }) {
  const [note, setNote] = useState(sess.note ?? "");
  const dur = sess.ended_at
    ? Math.floor((new Date(sess.ended_at).getTime() - new Date(sess.started_at).getTime()) / 1000)
    : Math.floor((Date.now() - new Date(sess.started_at).getTime()) / 1000);

  const save = async () => {
    await supabase.from("aux_sessions").update({ note }).eq("id", sess.id);
    onChanged();
  };
  const remove = async () => {
    await supabase.from("aux_sessions").delete().eq("id", sess.id);
    onChanged();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="glass rounded-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: status?.color }} />
          <h3 className="text-lg font-semibold">{status?.name}</h3>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Started</p>
            <p className="font-medium">{formatTime(sess.started_at)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Duration</p>
            <p className="font-medium font-mono">{formatShortDuration(dur)}</p>
          </div>
        </div>
        <div className="mt-4">
          <label className="text-xs text-muted-foreground">Note</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="What were you working on?"
          />
        </div>
        <div className="mt-4 flex justify-between">
          <Button variant="ghost" size="sm" onClick={remove} className="text-destructive hover:text-destructive">Delete</Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" onClick={save}>Save</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
