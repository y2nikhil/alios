import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Timer } from "lucide-react";
import { useAux } from "@/lib/aux-store";
import { cn } from "@/lib/utils";

const FLAG = "classlab.punchPrompt.shown";

/** Bottom-right prompt on each login asking which AUX to punch into. */
export function PunchPrompt() {
  const { statuses, activeSession, loading, switchTo } = useAux();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (loading || activeSession || statuses.length === 0) return;
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(FLAG) === "1") return;
    const t = setTimeout(() => {
      sessionStorage.setItem(FLAG, "1");
      setOpen(true);
    }, 1200);
    return () => clearTimeout(t);
  }, [loading, activeSession, statuses.length]);

  useEffect(() => { if (activeSession) setOpen(false); }, [activeSession]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.96 }}
          transition={{ type: "spring", damping: 22, stiffness: 260 }}
          className="fixed bottom-4 right-4 z-[9997] w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-white/10 bg-[oklch(0.08_0.012_265)]/95 backdrop-blur-xl p-4 shadow-2xl"
        >
          <div className="flex items-start gap-2">
            <div className="h-8 w-8 shrink-0 grid place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400">
              <Timer className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-tight">Punch in?</p>
              <p className="text-[11px] text-muted-foreground">Pick a status to start your timer.</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Dismiss punch prompt"
              className="h-6 w-6 grid place-items-center rounded-md text-muted-foreground hover:bg-white/10"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {statuses.slice(0, 6).map((s) => (
              <button
                key={s.id}
                onClick={() => { switchTo(s.id); setOpen(false); }}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1.5",
                  "text-xs font-medium hover:bg-white/10 transition",
                )}
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                {s.name}
              </button>
            ))}
          </div>

          <button
            onClick={() => setOpen(false)}
            className="mt-3 w-full rounded-lg border border-white/10 bg-white/5 py-1.5 text-[11px] text-muted-foreground hover:bg-white/10"
          >
            Not now
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
