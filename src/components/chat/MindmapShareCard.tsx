import { Link } from "@tanstack/react-router";
import { Brain, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function MindmapShareCard({
  boardId,
  title,
  note,
  mine,
}: {
  boardId: string;
  title: string;
  note?: string | null;
  mine: boolean;
}) {
  return (
    <Link
      to="/app/mindmap/$boardId"
      params={{ boardId }}
      className={cn(
        "group rounded-2xl border p-3 flex items-start gap-3 min-w-[240px] max-w-sm transition hover:border-primary/60",
        mine ? "border-primary-foreground/20 bg-primary/90 text-primary-foreground" : "border-border bg-accent/60",
      )}
    >
      <div className={cn("h-10 w-10 rounded-xl grid place-items-center shrink-0",
        mine ? "bg-primary-foreground/15" : "bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white")}>
        <Brain className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold opacity-70">
          Mind map <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition" />
        </div>
        <p className="text-sm font-semibold truncate">{title}</p>
        {note && <p className="text-xs opacity-80 line-clamp-2 mt-0.5">{note}</p>}
      </div>
    </Link>
  );
}
