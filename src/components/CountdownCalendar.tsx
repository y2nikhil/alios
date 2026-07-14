import { useEffect, useMemo, useRef, useState } from "react";
import { Pencil, Check, ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Target = { id: string; label: string; emoji: string; date: string };

const KEY = "alios.countdowns.v2";
const LEGACY_KEY = "alios.countdown.v1";

function defaultDate(offsetMonths = 3) {
  const d = new Date();
  d.setMonth(d.getMonth() + offsetMonths);
  return d.toISOString().slice(0, 10);
}

const DEFAULTS: Target[] = [
  { id: "cat", label: "CAT", emoji: "😄", date: defaultDate(3) },
];

function load(): Target[] {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const arr = JSON.parse(raw) as Target[];
      if (Array.isArray(arr) && arr.length) return arr;
    }
    // migrate legacy single-target
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const t = JSON.parse(legacy);
      return [{ id: crypto.randomUUID(), label: t.label ?? "Target", emoji: t.emoji ?? "🎯", date: t.date ?? defaultDate(3) }];
    }
  } catch {
    /* noop */
  }
  return DEFAULTS;
}

function save(list: Target[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

function daysBetween(iso: string) {
  const t = new Date(iso + "T00:00:00");
  const now = new Date(); now.setHours(0, 0, 0, 0);
  return Math.ceil((t.getTime() - now.getTime()) / 86400000);
}

export function CountdownCalendar() {
  const [targets, setTargets] = useState<Target[]>(DEFAULTS);
  const [idx, setIdx] = useState(0);
  const [editing, setEditing] = useState<Target | null>(null);
  const [cursor, setCursor] = useState(() => new Date());
  const hoverRef = useRef(false);

  useEffect(() => { setTargets(load()); }, []);

  // auto-slide every 5s when multiple, pause on hover
  useEffect(() => {
    if (targets.length < 2) return;
    const t = setInterval(() => {
      if (!hoverRef.current) setIdx((i) => (i + 1) % targets.length);
    }, 5000);
    return () => clearInterval(t);
  }, [targets.length]);

  useEffect(() => {
    if (idx >= targets.length) setIdx(0);
  }, [targets.length, idx]);

  const commit = (next: Target[]) => { setTargets(next); save(next); };

  const handleSave = (t: Target) => {
    if (!t.label.trim()) return;
    const exists = targets.some((x) => x.id === t.id);
    commit(exists ? targets.map((x) => (x.id === t.id ? t : x)) : [...targets, t]);
    setEditing(null);
    if (!exists) setIdx(targets.length);
  };

  const remove = (id: string) => {
    const next = targets.filter((x) => x.id !== id);
    commit(next.length ? next : DEFAULTS);
    setIdx(0);
  };

  const current = targets[idx] ?? targets[0];
  const highlightDates = useMemo(() => new Set(targets.map((t) => t.date)), [targets]);

  return (
    <section className="space-y-4">
      <MonthCalendar cursor={cursor} setCursor={setCursor} highlightDates={highlightDates} activeDate={current?.date} />

      {current && (
        <div
          onMouseEnter={() => (hoverRef.current = true)}
          onMouseLeave={() => (hoverRef.current = false)}
          className="relative rounded-3xl border border-white/10 shadow-xl overflow-hidden bg-gradient-to-br from-pink-200 via-rose-100 to-amber-100 text-zinc-900"
        >
          <div className="absolute -right-10 -bottom-10 h-56 w-56 rounded-full bg-gradient-to-br from-rose-300/60 to-amber-200/40 blur-2xl pointer-events-none" />

          {targets.length > 1 && (
            <>
              <button
                onClick={() => setIdx((i) => (i - 1 + targets.length) % targets.length)}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-10 h-8 w-8 grid place-items-center rounded-full bg-white/70 hover:bg-white text-zinc-800 shadow"
                aria-label="Previous countdown"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setIdx((i) => (i + 1) % targets.length)}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-10 h-8 w-8 grid place-items-center rounded-full bg-white/70 hover:bg-white text-zinc-800 shadow"
                aria-label="Next countdown"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </>
          )}

          <div className="relative px-6 pt-5 pb-4 sm:px-10">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-lg font-bold tracking-wide truncate">{current.label}</p>
                <p className="mt-0.5 text-sm text-zinc-700 flex items-center gap-1.5">
                  <span className="text-lg">{current.emoji}</span>
                  {new Date(current.date + "T00:00:00").toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => setEditing(current)}
                  className="h-7 w-7 grid place-items-center rounded-full bg-white/60 hover:bg-white text-zinc-700"
                  aria-label="Edit countdown"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setEditing({ id: crypto.randomUUID(), label: "", emoji: "🎯", date: defaultDate(1) })}
                  className="h-7 w-7 grid place-items-center rounded-full bg-white/60 hover:bg-white text-zinc-700"
                  aria-label="Add countdown"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
                {targets.length > 1 && (
                  <button
                    onClick={() => remove(current.id)}
                    className="h-7 w-7 grid place-items-center rounded-full bg-white/60 hover:bg-white text-rose-600"
                    aria-label="Remove countdown"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="mt-4 flex items-end gap-2">
              <p className="text-5xl sm:text-6xl font-extrabold leading-none tabular-nums">{Math.max(0, daysBetween(current.date))}</p>
              <p className="text-sm font-semibold pb-1.5">{daysBetween(current.date) === 1 ? "day left" : "days left"}</p>
            </div>
            {daysBetween(current.date) < 0 && <p className="relative mt-1 text-xs font-medium text-rose-700">🎉 The day has passed</p>}

            {targets.length > 1 && (
              <div className="mt-4 flex items-center justify-center gap-1.5">
                {targets.map((t, i) => (
                  <button
                    key={t.id}
                    onClick={() => setIdx(i)}
                    aria-label={`Show ${t.label}`}
                    className={cn(
                      "h-1.5 rounded-full transition-all",
                      i === idx ? "w-6 bg-zinc-800" : "w-1.5 bg-zinc-800/30 hover:bg-zinc-800/60",
                    )}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {editing && <Editor initial={editing} onClose={() => setEditing(null)} onSave={handleSave} />}
    </section>
  );
}

const WEEK = ["M", "T", "W", "T", "F", "S", "S"];
const MONTHS = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];

function MonthCalendar({ cursor, setCursor, highlightDates, activeDate }: { cursor: Date; setCursor: (d: Date) => void; highlightDates: Set<string>; activeDate?: string }) {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const startDow = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const today = new Date();
  const isToday = (d: number) => today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;
  const isoOf = (d: number) => new Date(year, month, d).toLocaleDateString("en-CA");

  return (
    <div className="rounded-3xl p-5 bg-[oklch(0.08_0.012_265)] border border-white/10 shadow-xl">
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setCursor(new Date(year, month - 1, 1))} className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-white/5">‹</button>
        <h3 className="text-lg font-bold tracking-wider">{MONTHS[month]} <span className="text-muted-foreground text-sm font-medium">{year}</span></h3>
        <button onClick={() => setCursor(new Date(year, month + 1, 1))} className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-white/5">›</button>
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center">
        {WEEK.map((d, i) => (
          <div key={i} className={cn("text-[11px] font-semibold pb-1.5", i === 6 ? "text-rose-400" : "text-muted-foreground")}>{d}</div>
        ))}
        {cells.map((d, i) => {
          const col = i % 7;
          if (d === null) return <div key={i} />;
          const iso = isoOf(d);
          const todayCell = isToday(d);
          const isActive = activeDate === iso;
          const isMarked = highlightDates.has(iso);
          return (
            <div key={i} className="aspect-square grid place-items-center text-sm">
              <div
                className={cn(
                  "h-7 w-7 grid place-items-center rounded-full tabular-nums transition",
                  col === 6 && "text-rose-400",
                  todayCell && "bg-white text-black font-bold shadow-lg",
                  isActive && !todayCell && "ring-2 ring-violet-400 text-violet-200 font-semibold",
                  isMarked && !isActive && !todayCell && "ring-1 ring-violet-400/40 text-violet-200/90",
                )}
              >
                {d}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Editor({ initial, onClose, onSave }: { initial: Target; onClose: () => void; onSave: (t: Target) => void }) {
  const [label, setLabel] = useState(initial.label);
  const [emoji, setEmoji] = useState(initial.emoji);
  const [date, setDate] = useState(initial.date);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="glass rounded-2xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold">{initial.label ? "Edit countdown" : "New countdown"}</h3>
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-[1fr_72px] gap-3">
            <div className="space-y-1.5"><Label>Label</Label><Input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={20} placeholder="Exam, Trip..." /></div>
            <div className="space-y-1.5"><Label>Emoji</Label><Input value={emoji} onChange={(e) => setEmoji(e.target.value.slice(0, 4))} className="text-center text-lg" /></div>
          </div>
          <div className="space-y-1.5"><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={() => onSave({ id: initial.id, label: label.trim() || "Target", emoji: emoji || "🎯", date })} className="bg-gradient-to-r from-violet-500 to-cyan-400">
            <Check className="h-3.5 w-3.5 mr-1" /> Save
          </Button>
        </div>
      </div>
    </div>
  );
}
