import { useEffect, useMemo, useState } from "react";
import { CalendarClock, Plus, Trash2, Play, Check } from "lucide-react";
import { useAux } from "@/lib/aux-store";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { HelpTip } from "@/components/HelpTip";

type Block = { id: string; start: string; end: string; statusId: string; label?: string };

const KEY = (uid: string) => `classlab.schedule.v1.${uid}`;

function load(uid: string): Block[] {
  try {
    const raw = localStorage.getItem(KEY(uid));
    return raw ? (JSON.parse(raw) as Block[]) : [];
  } catch {
    return [];
  }
}

function toMin(t: string) {
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function fmt(t: string) {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m).padStart(2, "0")} ${ampm}`;
}

export function DaySchedule() {
  const { user } = useAuth();
  const { statuses, activeSession, switchTo } = useAux();
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [open, setOpen] = useState(false);
  const [nowMin, setNowMin] = useState(() => new Date().getHours() * 60 + new Date().getMinutes());

  useEffect(() => {
    if (user) setBlocks(load(user.id));
  }, [user]);

  useEffect(() => {
    const i = setInterval(() => {
      const d = new Date();
      setNowMin(d.getHours() * 60 + d.getMinutes());
    }, 30_000);
    return () => clearInterval(i);
  }, []);

  const persist = (next: Block[]) => {
    const sorted = [...next].sort((a, b) => toMin(a.start) - toMin(b.start));
    setBlocks(sorted);
    if (user) localStorage.setItem(KEY(user.id), JSON.stringify(sorted));
  };

  const statusById = useMemo(() => new Map(statuses.map((s) => [s.id, s])), [statuses]);

  const currentId = blocks.find((b) => nowMin >= toMin(b.start) && nowMin < toMin(b.end))?.id;

  return (
    <div className="glass rounded-3xl p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
          <CalendarClock className="h-3 w-3" /> Upcoming schedule<HelpTip title="Upcoming schedule">Plan which AUX you will be on at what time. ClassLab compares your plan with what you actually punch to score adherence.</HelpTip>
        </p>
        <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]" onClick={() => setOpen(true)}>
          <Plus className="mr-1 h-3 w-3" /> Add
        </Button>
      </div>

      {blocks.length === 0 ? (
        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
          Plan your day — add time blocks like <em>Deep Work 9:00–11:00</em> and punch straight into
          the matching AUX from here.
        </p>
      ) : (
        <ol className="mt-4 space-y-1.5">
          {blocks.map((b) => {
            const s = statusById.get(b.statusId);
            const done = nowMin >= toMin(b.end);
            const isNow = b.id === currentId;
            const mins = Math.max(0, toMin(b.end) - toMin(b.start));
            return (
              <li
                key={b.id}
                className={cn(
                  "group relative flex items-center gap-3 rounded-xl border px-3 py-2 transition-colors",
                  isNow ? "border-primary/50 bg-primary/10" : "border-white/10 bg-white/5",
                  done && !isNow && "opacity-50",
                )}
              >
                <span
                  className={cn("h-2.5 w-2.5 shrink-0 rounded-full", isNow && "animate-pulse")}
                  style={{ backgroundColor: s?.color ?? "var(--primary)" }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{b.label || s?.name || "Block"}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {fmt(b.start)} – {fmt(b.end)} · {mins >= 60 ? `${Math.round((mins / 60) * 10) / 10}h` : `${mins}m`}
                    {s ? ` · ${s.name}` : ""}
                  </p>
                </div>
                {done ? (
                  <Check className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                ) : (
                  <button
                    aria-label={`Punch into ${s?.name ?? "status"}`}
                    onClick={() => s && switchTo(s.id)}
                    disabled={!s || activeSession?.status_id === b.statusId}
                    className="shrink-0 rounded-full border border-white/10 bg-white/5 p-1.5 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
                  >
                    <Play className="h-3 w-3" />
                  </button>
                )}
                <button
                  aria-label="Remove block"
                  onClick={() => persist(blocks.filter((x) => x.id !== b.id))}
                  className="shrink-0 rounded-full p-1.5 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </li>
            );
          })}
        </ol>
      )}

      <BlockDialog
        open={open}
        onOpenChange={setOpen}
        statuses={statuses}
        onAdd={(b) => persist([...blocks, b])}
      />
    </div>
  );
}

function BlockDialog({
  open,
  onOpenChange,
  statuses,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  statuses: { id: string; name: string; color: string }[];
  onAdd: (b: Block) => void;
}) {
  const [label, setLabel] = useState("");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("11:00");
  const [statusId, setStatusId] = useState("");

  useEffect(() => {
    if (!statusId && statuses.length) setStatusId(statuses[0].id);
  }, [statuses, statusId]);

  const submit = () => {
    if (!statusId || toMin(end) <= toMin(start)) return;
    onAdd({ id: crypto.randomUUID(), start, end, statusId, label: label.trim() || undefined });
    setLabel("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">Add a time block</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Label</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Deep Work — Physics" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>From</Label>
              <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>To</Label>
              <Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>AUX status</Label>
            <div className="flex flex-wrap gap-1.5">
              {statuses.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setStatusId(s.id)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs",
                    statusId === s.id ? "border-primary bg-primary/15" : "border-white/10 bg-white/5",
                  )}
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                  {s.name}
                </button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit}>Add block</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
