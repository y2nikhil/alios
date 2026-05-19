import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw, SkipForward, X, Brain, Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/focus")({
  head: () => ({ meta: [{ title: "Focus Mode — ALIOS" }] }),
  component: FocusMode,
});

const SOUNDS = ["🌧 Rain", "🔥 Fire", "🎵 Lo-fi", "🌊 Ocean", "Off"];

function FocusMode() {
  const [seconds, setSeconds] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [sound, setSound] = useState("🌧 Rain");
  const [round] = useState(2);
  const [notes, setNotes] = useState("Organic Chemistry — SN1 vs SN2\n\n• SN1: carbocation intermediate, racemic mixture, tertiary substrate\n• SN2: backside attack, inversion of config, primary substrate preferred");
  const tickRef = useRef<number | null>(null);

  useEffect(() => {
    if (!running) return;
    tickRef.current = window.setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [running]);

  const m = String(Math.floor(seconds / 60)).padStart(2, "0");
  const s = String(seconds % 60).padStart(2, "0");
  const pct = (seconds / (25 * 60)) * 100;

  return (
    <div className="h-[calc(100vh-44px)] flex flex-col lg:flex-row">
      {/* left: timer panel */}
      <aside className="lg:w-[320px] shrink-0 border-r-[0.5px] border-border surface-2 p-5 flex flex-col items-center gap-4 overflow-y-auto">
        <div className="w-full flex justify-end">
          <Link to="/app"><Button size="sm" variant="outline" className="h-7 text-[11px]"><X className="h-3 w-3 mr-1" />Exit Focus</Button></Link>
        </div>

        <div className="relative h-40 w-40">
          <svg viewBox="0 0 160 160" className="h-40 w-40 -rotate-90">
            <circle cx="80" cy="80" r="68" fill="none" stroke="var(--border)" strokeWidth="8" />
            <circle cx="80" cy="80" r="68" fill="none" stroke="var(--brand)" strokeWidth="8" strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 68}
              strokeDashoffset={2 * Math.PI * 68 * (1 - pct / 100)} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[28px] font-semibold tabular-nums">{m}:{s}</span>
            <span className="text-[10px] text-muted-foreground">Focus · Round {round} of 4</span>
          </div>
        </div>

        <div className="card-flat w-full p-2.5">
          <p className="text-[10px] text-muted-foreground">Currently studying</p>
          <p className="text-[12px] font-medium mt-0.5">Organic Chemistry — Reactions</p>
          <div className="mt-2 h-1 rounded-full surface-3 overflow-hidden">
            <div className="h-full bg-brand" style={{ width: "55%" }} />
          </div>
        </div>

        <div className="flex gap-1.5">
          <Button onClick={() => setRunning((r) => !r)} className="bg-brand text-primary-foreground hover:opacity-90 h-9 px-4">
            {running ? <><Pause className="h-3.5 w-3.5 mr-1" />Pause</> : <><Play className="h-3.5 w-3.5 mr-1" />Resume</>}
          </Button>
          <Button variant="outline" className="h-9 w-9 p-0"><SkipForward className="h-3.5 w-3.5" /></Button>
          <Button variant="outline" className="h-9 w-9 p-0" onClick={() => setSeconds(25 * 60)}><RotateCcw className="h-3.5 w-3.5" /></Button>
        </div>

        <div className="card-flat w-full p-2.5">
          <p className="text-[11px] font-medium flex items-center gap-1.5"><Headphones className="h-3 w-3" /> Ambient sound</p>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {SOUNDS.map((sd) => (
              <button key={sd} onClick={() => setSound(sd)}
                className={cn("rounded-full px-2 py-0.5 text-[10px] border-[0.5px]",
                  sound === sd ? "bg-brand-soft border-brand text-brand-ink" : "border-border text-muted-foreground")}>
                {sd}
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* right: notes */}
      <div className="flex-1 p-4 lg:p-6 flex flex-col gap-3 overflow-y-auto">
        <p className="text-[13px] font-medium">Quick notes</p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="flex-1 min-h-[280px] card-flat surface-2 p-3.5 text-[12px] leading-relaxed font-sans resize-none focus:outline-none focus:ring-1 focus:ring-brand"
        />
        <div className="bg-brand-soft rounded-lg p-3 flex gap-2.5 items-start">
          <Brain className="h-4 w-4 text-brand mt-0.5 shrink-0" />
          <p className="text-[11px] text-brand-ink leading-relaxed">
            <span className="font-semibold">AI insight · </span>
            You've been focusing for 41 mins — you're in flow state. Keep going!
          </p>
        </div>
      </div>
    </div>
  );
}
