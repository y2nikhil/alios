import { useEffect, useMemo, useState } from "react";
import { Pencil, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Target = { label: string; emoji: string; date: string }; // ISO yyyy-mm-dd

const KEY = "alios.countdown.v1";
const DEFAULT: Target = { label: "CAT", emoji: "😄", date: defaultDate() };

function defaultDate() {
  const d = new Date();
  d.setMonth(d.getMonth() + 3);
  return d.toISOString().slice(0, 10);
}

function load(): Target {
  if (typeof window === "undefined") return DEFAULT;
  try { return { ...DEFAULT, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") }; }
  catch { return DEFAULT; }
}

export function CountdownCalendar() {
  const [target, setTarget] = useState<Target>(DEFAULT);
  const [editing, setEditing] = useState(false);
  const [cursor, setCursor] = useState(() => new Date());

  useEffect(() => { setTarget(load()); }, []);

  const save = (t: Target) => {
    setTarget(t);
    localStorage.setItem(KEY, JSON.stringify(t));
    setEditing(false);
  };

  const daysLeft = useMemo(() => {
    const t = new Date(target.date + "T00:00:00");
    const now = new Date(); now.setHours(0, 0, 0, 0);
    return Math.ceil((t.getTime() - now.getTime()) / 86400000);
  }, [target.date]);

  return (
    <section className="grid gap-4 md:grid-cols-2">
      <MonthCalendar cursor={cursor} setCursor={setCursor} targetDate={target.date} />
      <CountdownCard target={target} daysLeft={daysLeft} onEdit={() => setEditing(true)} />
      {editing && <Editor initial={target} onClose={() => setEditing(false)} onSave={save} />}
    </section>
  );
}

const WEEK = ["M", "T", "W", "T", "F", "S", "S"];
const MONTHS = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];

function MonthCalendar({ cursor, setCursor, targetDate }: { cursor: Date; setCursor: (d: Date) => void; targetDate: string }) {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const startDow = (first.getDay() + 6) % 7; // Mon=0
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const today = new Date();
  const isToday = (d: number) =>
    today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;
  const target = new Date(targetDate + "T00:00:00");
  const isTarget = (d: number) =>
    target.getFullYear() === year && target.getMonth() === month && target.getDate() === d;

  return (
    <div className="rounded-3xl p-5 bg-[oklch(0.08_0.012_265)] border border-white/10 shadow-xl">
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setCursor(new Date(year, month - 1, 1))}
          className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-white/5"
        >‹</button>
        <h3 className="text-lg font-bold tracking-wider">{MONTHS[month]} <span className="text-muted-foreground text-sm font-medium">{year}</span></h3>
        <button
          onClick={() => setCursor(new Date(year, month + 1, 1))}
          className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-white/5"
        >›</button>
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center">
        {WEEK.map((d, i) => (
          <div key={i} className={cn("text-[11px] font-semibold pb-1.5", i === 6 ? "text-rose-400" : "text-muted-foreground")}>{d}</div>
        ))}
        {cells.map((d, i) => {
          const col = i % 7;
          if (d === null) return <div key={i} />;
          const todayCell = isToday(d);
          const targetCell = isTarget(d);
          return (
            <div key={i} className="aspect-square grid place-items-center text-sm">
              <div
                className={cn(
                  "h-7 w-7 grid place-items-center rounded-full tabular-nums transition",
                  col === 6 && "text-rose-400",
                  todayCell && "bg-white text-black font-bold shadow-lg",
                  targetCell && !todayCell && "ring-2 ring-violet-400 text-violet-200 font-semibold",
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

function CountdownCard({ target, daysLeft, onEdit }: { target: Target; daysLeft: number; onEdit: () => void }) {
  const dateLabel = new Date(target.date + "T00:00:00").toLocaleDateString(undefined, { day: "numeric", month: "short" });
  return (
    <div className="relative rounded-3xl p-6 overflow-hidden border border-white/10 shadow-xl bg-gradient-to-br from-pink-200 via-rose-100 to-amber-100 text-zinc-900">
      <div className="absolute -right-10 -bottom-10 h-56 w-56 rounded-full bg-gradient-to-br from-rose-300/60 to-amber-200/40 blur-2xl" />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-xl font-bold tracking-wide">{target.label}</p>
          <p className="mt-1 text-sm text-zinc-700 flex items-center gap-1.5">
            <span className="text-lg">{target.emoji}</span> {dateLabel}
          </p>
        </div>
        <button onClick={onEdit} className="h-8 w-8 grid place-items-center rounded-full bg-white/60 hover:bg-white text-zinc-700">
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="relative mt-10 flex items-end gap-2">
        <p className="text-6xl font-extrabold leading-none tabular-nums">{daysLeft < 0 ? 0 : daysLeft}</p>
        <p className="text-sm font-semibold pb-1.5">{daysLeft === 1 ? "day left" : "days left"}</p>
      </div>
      {daysLeft < 0 && <p className="relative mt-2 text-xs font-medium text-rose-700">🎉 The day has passed</p>}
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
        <h3 className="text-lg font-semibold">Edit countdown</h3>
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-[1fr_72px] gap-3">
            <div className="space-y-1.5"><Label>Label</Label><Input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={20} /></div>
            <div className="space-y-1.5"><Label>Emoji</Label><Input value={emoji} onChange={(e) => setEmoji(e.target.value.slice(0, 4))} className="text-center text-lg" /></div>
          </div>
          <div className="space-y-1.5"><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={() => onSave({ label: label.trim() || "Target", emoji: emoji || "🎯", date })} className="bg-gradient-to-r from-violet-500 to-cyan-400">
            <Check className="h-3.5 w-3.5 mr-1" /> Save
          </Button>
        </div>
      </div>
    </div>
  );
}
