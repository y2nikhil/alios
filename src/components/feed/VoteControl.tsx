import { ArrowBigDown, ArrowBigUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { upvotePct } from "@/lib/feed";

export function VoteControl({
  up, down, mine, onVote, compact,
}: {
  up: number;
  down: number;
  mine: -1 | 0 | 1;
  onVote: (v: -1 | 1) => void;
  compact?: boolean;
}) {
  const pct = upvotePct(up, down);
  return (
    <div className={cn("inline-flex items-center gap-1", compact ? "text-[11px]" : "text-xs")}>
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onVote(1); }}
        aria-label="Upvote"
        className={cn(
          "grid place-items-center rounded-md transition",
          compact ? "h-6 w-6" : "h-7 w-7",
          mine === 1 ? "bg-orange-500/20 text-orange-400" : "text-muted-foreground hover:bg-white/10 hover:text-foreground",
        )}
      >
        <ArrowBigUp className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
      </button>
      <span
        className={cn(
          "min-w-[2.5rem] text-center font-semibold tabular-nums",
          pct === null ? "text-muted-foreground" : pct >= 50 ? "text-orange-300" : "text-sky-300",
        )}
      >
        {pct === null ? "—" : `${pct}%`}
      </span>
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onVote(-1); }}
        aria-label="Downvote"
        className={cn(
          "grid place-items-center rounded-md transition",
          compact ? "h-6 w-6" : "h-7 w-7",
          mine === -1 ? "bg-sky-500/20 text-sky-400" : "text-muted-foreground hover:bg-white/10 hover:text-foreground",
        )}
      >
        <ArrowBigDown className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
      </button>
    </div>
  );
}
