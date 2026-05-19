import { createFileRoute } from "@tanstack/react-router";
import { Trophy, Flame } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/leaderboard")({
  head: () => ({ meta: [{ title: "Leaderboard — ALIOS" }] }),
  component: Leaderboard,
});

const ROWS = [
  { rank: 1, name: "Priya Sharma", hours: 42, streak: 21 },
  { rank: 2, name: "Aman Kumar", hours: 38, streak: 14 },
  { rank: 3, name: "Sneha Joshi", hours: 35, streak: 18 },
  { rank: 4, name: "Rahul (you)", hours: 28, streak: 12, me: true },
  { rank: 5, name: "Vivek N.", hours: 26, streak: 9 },
  { rank: 6, name: "Kavya R.", hours: 24, streak: 7 },
];

function Leaderboard() {
  return (
    <div className="mx-auto max-w-3xl p-4 lg:p-6 space-y-4">
      <div>
        <h1 className="text-[18px] font-semibold tracking-tight flex items-center gap-2">
          <Trophy className="h-4 w-4 text-[oklch(0.65_0.15_70)]" />Leaderboard
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">This week, your batch</p>
      </div>
      <div className="card-flat divide-y divide-border/60">
        {ROWS.map((r) => (
          <div key={r.rank} className={cn("flex items-center gap-3 px-4 py-3", r.me && "bg-brand-soft/60")}>
            <span className={cn("w-6 text-[14px] font-semibold tabular-nums",
              r.rank === 1 && "text-[oklch(0.65_0.15_70)]",
              r.rank === 2 && "text-muted-foreground",
              r.rank === 3 && "text-amber-ink",
              r.rank > 3 && "text-muted-foreground")}>{r.rank}</span>
            <p className="flex-1 text-[13px]">{r.name}</p>
            <span className="text-[12px] text-brand font-semibold">{r.hours}h</span>
            <span className="text-[11px] text-muted-foreground flex items-center gap-1"><Flame className="h-3 w-3" />{r.streak}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
