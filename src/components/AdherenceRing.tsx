import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";

/**
 * Schedule Adherence Score widget.
 * Placeholder for Wave 1 — gets wired to real schedule data in Wave 2.
 */
export function AdherenceRing() {
  const r = 56;
  const c = 2 * Math.PI * r;

  return (
    <div className="glass rounded-2xl p-6 flex flex-col items-center justify-center">
      <div className="flex items-center gap-1.5">
        <ShieldCheck className="h-3 w-3 text-muted-foreground" />
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Adherence</p>
      </div>
      <div className="relative mt-4">
        <svg width="140" height="140" className="-rotate-90">
          <circle cx="70" cy="70" r={r} stroke="oklch(1 0 0 / 0.08)" strokeWidth="10" fill="none" />
          <motion.circle
            cx="70"
            cy="70"
            r={r}
            stroke="url(#adherenceGrad)"
            strokeWidth="10"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={c}
            initial={{ strokeDashoffset: c }}
            animate={{ strokeDashoffset: c }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            opacity={0.4}
          />
          <defs>
            <linearGradient id="adherenceGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="oklch(0.78 0.16 200)" />
              <stop offset="100%" stopColor="oklch(0.74 0.15 160)" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-3xl font-bold text-muted-foreground">—</p>
          <p className="text-[10px] text-muted-foreground">awaiting schedule</p>
        </div>
      </div>
      <p className="mt-3 text-xs text-center text-muted-foreground max-w-[180px]">
        Set up a team schedule to start tracking adherence
      </p>
    </div>
  );
}
