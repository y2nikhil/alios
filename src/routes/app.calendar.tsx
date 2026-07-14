import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Calendar as CalIcon, Plus, Trash2, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/calendar")({
  head: () => ({
    meta: [
      { title: "Calendar — ALIOS" },
      { name: "description", content: "Plan your events, deadlines, and reminders." },
    ],
  }),
  component: CalendarPage,
});

type Event = { id: string; title: string; date: string; time?: string; note?: string; color?: string };
const KEY = "alios.calendar.events.v1";

function load(): Event[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; }
}
function save(evts: Event[]) { localStorage.setItem(KEY, JSON.stringify(evts)); }

const WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const PALETTE = ["#8b5cf6", "#06b6d4", "#f59e0b", "#ec4899", "#22c55e", "#ef4444"];

function CalendarPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [cursor, setCursor] = useState(new Date());
  const [selected, setSelected] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Event | null>(null);

  useEffect(() => { setEvents(load()); }, []);

  const commit = (next: Event[]) => { setEvents(next); save(next); };

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const startDow = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const eventsByDate = useMemo(() => {
    const m = new Map<string, Event[]>();
    for (const e of events) {
      const arr = m.get(e.date) ?? [];
      arr.push(e); m.set(e.date, arr);
    }
    return m;
  }, [events]);

  const upcoming = useMemo(() => {
    const today = new Date(); today.setHours(0,0,0,0);
    return [...events]
      .filter((e) => new Date(e.date + "T00:00:00").getTime() >= today.getTime())
      .sort((a, b) => (a.date + (a.time ?? "")).localeCompare(b.date + (b.time ?? "")))
      .slice(0, 8);
  }, [events]);

  const dayEvents = eventsByDate.get(selected) ?? [];

  const openNew = (date?: string) => {
    setEditing({ id: crypto.randomUUID(), title: "", date: date ?? selected, time: "", note: "", color: PALETTE[0] });
    setOpen(true);
  };

  const handleSave = (evt: Event) => {
    if (!evt.title.trim()) return;
    const exists = events.some((e) => e.id === evt.id);
    commit(exists ? events.map((e) => (e.id === evt.id ? evt : e)) : [...events, evt]);
    setOpen(false); setEditing(null);
  };

  const remove = (id: string) => commit(events.filter((e) => e.id !== id));

  return (
    <div className="p-4 lg:p-6 max-w-[1400px] mx-auto space-y-5">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
            <CalIcon className="h-3 w-3" /> Calendar
          </p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight truncate">
            {MONTHS[month]} <span className="text-muted-foreground font-medium">{year}</span>
          </h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => setCursor(new Date(year, month - 1, 1))} className="h-9 w-9 grid place-items-center rounded-lg bg-white/5 border border-white/10 hover:bg-white/10">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={() => setCursor(new Date())} className="h-9 px-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-semibold">Today</button>
          <button onClick={() => setCursor(new Date(year, month + 1, 1))} className="h-9 w-9 grid place-items-center rounded-lg bg-white/5 border border-white/10 hover:bg-white/10">
            <ChevronRight className="h-4 w-4" />
          </button>
          <Button onClick={() => openNew()} size="sm" className="h-9 rounded-lg bg-gradient-to-r from-violet-500 to-cyan-400">
            <Plus className="h-4 w-4 mr-1" /> New event
          </Button>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Grid */}
        <div className="glass rounded-3xl p-4 sm:p-5 min-w-0">
          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {WEEK.map((d) => (
              <div key={d} className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((d, i) => {
              if (d === null) return <div key={i} className="aspect-square" />;
              const iso = new Date(year, month, d).toLocaleDateString("en-CA");
              const dayEvts = eventsByDate.get(iso) ?? [];
              const isToday = new Date().toDateString() === new Date(year, month, d).toDateString();
              const isSelected = iso === selected;
              return (
                <button
                  key={i}
                  onClick={() => setSelected(iso)}
                  onDoubleClick={() => openNew(iso)}
                  className={cn(
                    "aspect-square min-h-[52px] rounded-lg border p-1 text-left transition flex flex-col overflow-hidden",
                    isSelected ? "border-violet-400/60 bg-violet-500/10" : "border-white/5 hover:border-white/15 hover:bg-white/5",
                  )}
                >
                  <span className={cn(
                    "text-[11px] sm:text-xs font-semibold tabular-nums",
                    isToday && "h-5 w-5 grid place-items-center rounded-full bg-white text-black",
                  )}>{d}</span>
                  <div className="mt-0.5 flex-1 space-y-0.5 overflow-hidden">
                    {dayEvts.slice(0, 2).map((e) => (
                      <div key={e.id} className="truncate text-[9px] sm:text-[10px] rounded px-1 py-0.5" style={{ backgroundColor: (e.color ?? "#8b5cf6") + "30", color: e.color ?? "#8b5cf6" }}>
                        {e.title}
                      </div>
                    ))}
                    {dayEvts.length > 2 && <div className="text-[9px] text-muted-foreground">+{dayEvts.length - 2}</div>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Side panel */}
        <div className="space-y-4 min-w-0">
          <div className="glass rounded-3xl p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground truncate">
                {new Date(selected + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" })}
              </p>
              <button onClick={() => openNew(selected)} className="h-7 w-7 grid place-items-center rounded-lg bg-white/5 hover:bg-white/10 shrink-0">
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="mt-3 space-y-2">
              {dayEvents.length === 0 && <p className="text-sm text-muted-foreground">No events. Click + to add one.</p>}
              {dayEvents.map((e) => (
                <div key={e.id} className="group flex items-start gap-2 rounded-lg border border-white/10 bg-white/5 p-2.5">
                  <span className="mt-1 h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: e.color ?? "#8b5cf6" }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{e.title}</p>
                    {e.time && <p className="text-[11px] text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />{e.time}</p>}
                    {e.note && <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{e.note}</p>}
                  </div>
                  <button onClick={() => remove(e.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-rose-400 shrink-0">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="glass rounded-3xl p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Upcoming</p>
            <div className="mt-3 space-y-2">
              {upcoming.length === 0 && <p className="text-sm text-muted-foreground">Nothing scheduled yet.</p>}
              {upcoming.map((e) => (
                <button key={e.id} onClick={() => setSelected(e.date)} className="w-full flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 p-2.5 text-left hover:bg-white/10">
                  <div className="h-9 w-9 rounded-lg grid place-items-center shrink-0" style={{ backgroundColor: (e.color ?? "#8b5cf6") + "25" }}>
                    <CalIcon className="h-4 w-4" style={{ color: e.color ?? "#8b5cf6" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{e.title}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {new Date(e.date + "T00:00:00").toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                      {e.time && ` · ${e.time}`}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>New event</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Title</Label>
                <Input autoFocus value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="Team standup" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Date</Label>
                  <Input type="date" value={editing.date} onChange={(e) => setEditing({ ...editing, date: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Time</Label>
                  <Input type="time" value={editing.time ?? ""} onChange={(e) => setEditing({ ...editing, time: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Note</Label>
                <Input value={editing.note ?? ""} onChange={(e) => setEditing({ ...editing, note: e.target.value })} placeholder="Optional details" />
              </div>
              <div className="space-y-1.5">
                <Label>Color</Label>
                <div className="flex gap-2">
                  {PALETTE.map((c) => (
                    <button key={c} onClick={() => setEditing({ ...editing, color: c })}
                      className={cn("h-7 w-7 rounded-full border-2", editing.color === c ? "border-white" : "border-transparent")}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => editing && handleSave(editing)} className="bg-gradient-to-r from-violet-500 to-cyan-400">Save event</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
