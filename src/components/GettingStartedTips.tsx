import { useEffect, useState } from "react";
import { X, Sparkles, Timer, CalendarClock, Users, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";

const KEY = "classlab.gettingStarted.dismissed.v1";

const STEPS = [
  { icon: Timer, title: "Punch an AUX", text: "Pick a status like Deep Work or CAT Prep to start your timer. Only productive statuses count as focus time." },
  { icon: CalendarClock, title: "Plan your day", text: "Set a daily focus goal and add your upcoming schedule so ClassLab can track adherence." },
  { icon: Users, title: "Study together", text: "Join a live watch party or a group chat to study with others in real time." },
  { icon: Sparkles, title: "Ask the AI", text: "Your AI coach knows your prep profile and progress — ask it for a realistic plan anytime." },
];

export function GettingStartedTips({ className }: { className?: string }) {
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    try {
      setHidden(localStorage.getItem(KEY) === "1");
    } catch {
      setHidden(false);
    }
  }, []);

  if (hidden) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* ignore */
    }
    setHidden(true);
  };

  return (
    <div className={`relative rounded-2xl border border-white/10 bg-white/[0.03] p-4 ${className ?? ""}`}>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss getting started tips"
        className="absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-primary">
        <Rocket className="h-3.5 w-3.5" /> New here? Start with this
      </div>

      <ul className="mt-3 space-y-2.5">
        {STEPS.map((s) => {
          const Icon = s.icon;
          return (
            <li key={s.title} className="flex gap-2.5">
              <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5">
                <Icon className="h-3.5 w-3.5 text-primary" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold">{s.title}</p>
                <p className="text-[11px] leading-relaxed text-muted-foreground">{s.text}</p>
              </div>
            </li>
          );
        })}
      </ul>

      <Button size="sm" variant="outline" onClick={dismiss} className="mt-3 h-8 w-full rounded-xl border-white/10 bg-white/5 text-xs hover:bg-white/10">
        Got it, don't show again
      </Button>
    </div>
  );
}
