import { useState } from "react";
import { SmilePlus } from "lucide-react";
import { cn } from "@/lib/utils";

export const REACTION_EMOJIS = ["👍", "🔥", "💯", "😂", "😮", "❤️"];

export function PostReactions({
  counts,
  mine,
  onReact,
}: {
  counts: Record<string, number>;
  mine: string | null;
  onReact: (emoji: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const active = Object.entries(counts).filter(([, n]) => n > 0);

  return (
    <div className="relative inline-flex items-center gap-1.5">
      {active.map(([emoji, n]) => (
        <button
          key={emoji}
          onClick={() => onReact(mine === emoji ? null : emoji)}
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs transition",
            mine === emoji ? "bg-amber-400/20 text-amber-200" : "bg-white/5 text-muted-foreground hover:bg-white/10",
          )}
        >
          <span>{emoji}</span>
          <span className="tabular-nums">{n}</span>
        </button>
      ))}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Add reaction"
        className="grid h-7 w-7 place-items-center rounded-full bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground"
      >
        <SmilePlus className="h-3.5 w-3.5" />
      </button>

      {open && (
        <>
          <button aria-label="Close reactions" className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} />
          <div className="absolute bottom-9 left-0 z-50 w-56 rounded-2xl border border-white/10 bg-[hsl(var(--card,0_0%_8%))] bg-background/95 p-3 shadow-xl backdrop-blur">
            <p className="mb-2 text-center text-xs font-semibold">Reactions</p>
            <div className="grid grid-cols-4 gap-2">
              {REACTION_EMOJIS.map((e) => (
                <button
                  key={e}
                  onClick={() => { onReact(mine === e ? null : e); setOpen(false); }}
                  className={cn(
                    "grid h-10 place-items-center rounded-xl text-lg transition",
                    mine === e ? "bg-amber-400/20" : "bg-white/5 hover:bg-white/10",
                  )}
                >
                  {e}
                </button>
              ))}
            </div>
            <button
              onClick={() => setOpen(false)}
              className="mt-3 w-full rounded-xl border-t border-white/10 pt-2 text-xs text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  );
}
