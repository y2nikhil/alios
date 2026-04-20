import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useAux, type AuxSession, type AuxStatus } from "@/lib/aux-store";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Play, Pause, RotateCcw } from "lucide-react";
import { formatShortDuration, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/timeline")({
  head: () => ({
    meta: [
      { title: "Timeline — ALIOS" },
      { name: "description", content: "Full day timeline of your status sessions." },
    ],
  }),
  component: TimelinePage,
});

type Zoom = "15min" | "hour" | "day";

function TimelinePage() {
  const { user } = useAuth();
  const { statuses } = useAux();
  const [date, setDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [sessions, setSessions] = useState<AuxSession[]>([]);
  const [zoom, setZoom] = useState<Zoom>("hour");
  const [selected, setSelected] = useState<AuxSession | null>(null);
  const [replayMin, setReplayMin] = useState<number | null>(null);

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

  // Replay timer
  useEffect(() => {
    if (replayMin === null) return;
    const i = setInterval(() => {
      setReplayMin((m) => {
        if (m === null) return null;
        if (m >= 1440) {
          return null;
        }
        return m + 6;
      });
    }, 60);
    return () => clearInterval(i);
  }, [replayMin]);

  const statusMap = useMemo(() => new Map(statuses.map((s) => [s.id, s])), [statuses]);
  const dayStart = date.getTime();
  const dayMs = 24 * 60 * 60 * 1000;

  const hours = zoom === "15min" ? 96 : zoom === "hour" ? 24 : 8;
  const labels = Array.from({ length: hours }, (_, i) => {
    if (zoom === "15min") return `${String(Math.floor(i / 4)).padStart(2, "0")}:${String((i % 4) * 15).padStart(2, "0")}`;
    if (zoom === "hour") return `${String(i).padStart(2, "0")}:00`;
    return `${i * 3}h`;
  });

  const shiftDay = (delta: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + delta);
    setDate(d);
  };

  const isToday = date.toDateString() === new Date().toDateString();

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Timeline</h1>
          <p className="text-sm text-muted-foreground">{date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => shiftDay(-1)} className="bg-white/5 border-white/10">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setDate(() => { const d = new Date(); d.setHours(0,0,0,0); return d; })} className="bg-white/5 border-white/10">
            Today
          </Button>
          <Button variant="outline" size="icon" disabled={isToday} onClick={() => shiftDay(1)} className="bg-white/5 border-white/10">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <div className="ml-2 flex items-center rounded-lg border border-white/10 bg-white/5 p-0.5">
            {(["15min", "hour", "day"] as Zoom[]).map((z) => (
              <button
                key={z}
                onClick={() => setZoom(z)}
                className={cn(
                  "px-2.5 py-1 text-xs rounded-md transition-colors",
                  zoom === z ? "bg-white/10 text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {z}
              </button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setReplayMin(replayMin === null ? 0 : null)}
            className="bg-white/5 border-white/10"
          >
            {replayMin === null ? <Play className="h-3.5 w-3.5 mr-1" /> : <Pause className="h-3.5 w-3.5 mr-1" />}
            Replay
          </Button>
          {replayMin !== null && (
            <Button variant="ghost" size="icon" onClick={() => setReplayMin(0)}>
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Track */}
      <div className="glass rounded-2xl p-4 lg:p-6 overflow-x-auto scrollbar-thin">
        <div className="min-w-[800px]">
          {/* Hour labels */}
          <div className="grid text-[10px] text-muted-foreground" style={{ gridTemplateColumns: `repeat(${hours}, 1fr)` }}>
            {labels.map((l, i) => (
              <div key={i} className="px-1">{l}</div>
            ))}
          </div>
          {/* Track */}
          <div className="relative mt-2 h-20 rounded-xl bg-white/5 overflow-hidden border border-white/5">
            {/* gridlines */}
            <div className="absolute inset-0 grid pointer-events-none" style={{ gridTemplateColumns: `repeat(${hours}, 1fr)` }}>
              {Array.from({ length: hours }).map((_, i) => (
                <div key={i} className="border-r border-white/[0.04]" />
              ))}
            </div>
            {sessions.map((sess) => {
              const start = new Date(sess.started_at).getTime();
              const end = sess.ended_at ? new Date(sess.ended_at).getTime() : Date.now();
              const left = ((start - dayStart) / dayMs) * 100;
              const width = ((end - start) / dayMs) * 100;
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
                    width: `${Math.max(0.3, width)}%`,
                    backgroundColor: status?.color ?? "#666",
                    boxShadow: `0 0 16px -4px ${status?.color ?? "#666"}80`,
                  }}
                  title={`${status?.name} — ${formatShortDuration(Math.floor((end - start) / 1000))}`}
                />
              );
            })}
            {/* Now indicator or replay cursor */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-white/80 pointer-events-none"
              style={{
                left: `${replayMin !== null ? (replayMin / 1440) * 100 : isToday ? ((Date.now() - dayStart) / dayMs) * 100 : 100}%`,
                boxShadow: "0 0 12px rgba(255,255,255,0.6)",
              }}
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
