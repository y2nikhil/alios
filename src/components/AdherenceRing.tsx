import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import { useTodayAdherence } from "@/lib/use-adherence";

export function AdherenceRing() {
  const { score, hasSchedule } = useTodayAdherence();
  const r = 56;
  const c = 2 * Math.PI * r;
  const pct = score ?? 0;
  const offset = c - (pct / 100) * c;

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
            animate={{ strokeDashoffset: hasSchedule ? offset : c }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            opacity={hasSchedule ? 1 : 0.4}
          />
          <defs>
            <linearGradient id="adherenceGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="oklch(0.78 0.16 200)" />
              <stop offset="100%" stopColor="oklch(0.74 0.15 160)" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className={`text-3xl font-bold ${hasSchedule ? "" : "text-muted-foreground"}`}>
            {hasSchedule && score !== null ? score : "—"}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {hasSchedule ? "out of 100" : "no schedule"}
          </p>
        </div>
      </div>
      <p className="mt-3 text-xs text-center text-muted-foreground max-w-[180px]">
        {hasSchedule
          ? score !== null && score >= 90
            ? "On track — great work"
            : score !== null && score >= 70
              ? "Slightly off schedule"
              : "Behind schedule"
          : "Set up a team schedule to start tracking adherence"}
      </p>
    </div>
  );
}
