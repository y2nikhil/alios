import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import { getTodayLeaderboard, type LeaderboardEntry } from "@/lib/leaderboard.functions";
import { formatShortDuration } from "@/lib/format";
import { cn } from "@/lib/utils";
import { HelpTip } from "@/components/HelpTip";

function initials(name: string | null) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function LeaderboardCard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    getTodayLeaderboard()
      .then((data) => {
        if (mounted) setEntries(data);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="glass rounded-3xl p-5 flex flex-col h-full">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
          Leaderboard<HelpTip title="Leaderboard" align="end">Today's top learners ranked by productive focus time. It resets every midnight.</HelpTip>
        </p>
        <Trophy className="h-3.5 w-3.5 text-amber-400" />
      </div>

      {loading ? (
        <div className="mt-4 space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
              <div className="h-8 w-8 rounded-full bg-white/10" />
              <div className="flex-1 h-3 rounded bg-white/10" />
              <div className="h-3 w-10 rounded bg-white/10" />
            </div>
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="mt-4 flex-1 flex items-center justify-center text-xs text-muted-foreground text-center">
          No focus data yet today.<br />Be the first to punch in!
        </div>
      ) : (
        <div className="mt-4 space-y-2.5">
          {entries.map((entry, idx) => (
            <div
              key={entry.user_id}
              className={cn(
                "flex items-center gap-3 rounded-xl px-2.5 py-2 transition-colors",
                idx === 0 ? "bg-amber-500/10 border border-amber-500/20" : "bg-white/5 hover:bg-white/10"
              )}
            >
              <span
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
                  idx === 0 && "bg-amber-500 text-black",
                  idx === 1 && "bg-slate-300 text-black",
                  idx === 2 && "bg-amber-700 text-white",
                  idx > 2 && "bg-white/10 text-muted-foreground"
                )}
              >
                {idx + 1}
              </span>
              {entry.avatar_url ? (
                <img
                  src={entry.avatar_url}
                  alt={entry.display_name ?? ""}
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-[10px] font-bold text-white">
                  {initials(entry.display_name)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">
                  {entry.display_name ?? "Anonymous"}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {formatShortDuration(entry.productive_seconds)} focused
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
