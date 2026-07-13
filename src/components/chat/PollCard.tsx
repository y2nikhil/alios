import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Check, BarChart3 } from "lucide-react";

type Option = { id: string; label: string; sort_order: number };
type Vote = { id: string; option_id: string; user_id: string };

export function PollCard({
  messageId,
  question,
  mine,
}: {
  messageId: string;
  question: string;
  mine: boolean;
}) {
  const { user } = useAuth();
  const [options, setOptions] = useState<Option[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [{ data: opts }, { data: vs }] = await Promise.all([
      (supabase.from("poll_options") as any).select("id,label,sort_order").eq("message_id", messageId).order("sort_order"),
      (supabase.from("poll_votes") as any).select("id,option_id,user_id").in(
        "option_id",
        // placeholder — filtered below after we have options
        ["00000000-0000-0000-0000-000000000000"],
      ),
    ]);
    const optList = (opts ?? []) as Option[];
    setOptions(optList);
    if (optList.length) {
      const { data: v2 } = await (supabase.from("poll_votes") as any)
        .select("id,option_id,user_id")
        .in("option_id", optList.map((o) => o.id));
      setVotes((v2 ?? []) as Vote[]);
    } else {
      setVotes((vs ?? []) as Vote[]);
    }
  }, [messageId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const ch = supabase
      .channel(`poll-${messageId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "poll_votes" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "poll_options", filter: `message_id=eq.${messageId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [messageId, load]);

  const total = votes.length;
  const myVote = user ? votes.find((v) => v.user_id === user.id) : null;

  const vote = async (optionId: string) => {
    if (!user || busy) return;
    setBusy(true);
    if (myVote) {
      await (supabase.from("poll_votes") as any).delete().eq("id", myVote.id);
      if (myVote.option_id === optionId) { setBusy(false); return; }
    }
    await (supabase.from("poll_votes") as any).insert({ option_id: optionId, user_id: user.id });
    setBusy(false);
  };

  return (
    <div className={cn("rounded-2xl border p-3 min-w-[240px] max-w-sm",
      mine ? "border-primary-foreground/20 bg-primary/90 text-primary-foreground" : "border-border bg-accent/60")}>
      <div className="flex items-center gap-1.5 text-[10px] uppercase font-semibold tracking-wider opacity-70 mb-1">
        <BarChart3 className="h-3 w-3" /> Poll
      </div>
      <p className="text-sm font-medium mb-2 whitespace-pre-wrap">{question}</p>
      <div className="space-y-1.5">
        {options.map((o) => {
          const count = votes.filter((v) => v.option_id === o.id).length;
          const pct = total ? Math.round((count / total) * 100) : 0;
          const selected = myVote?.option_id === o.id;
          return (
            <button
              key={o.id} onClick={() => vote(o.id)} disabled={busy}
              className={cn(
                "relative w-full text-left rounded-lg px-2.5 py-1.5 text-xs overflow-hidden border transition",
                selected ? "border-current" : "border-transparent hover:border-current/30",
                mine ? "bg-primary-foreground/10" : "bg-background/60",
              )}
            >
              <div
                className={cn("absolute inset-y-0 left-0 transition-all",
                  mine ? "bg-primary-foreground/20" : "bg-primary/20")}
                style={{ width: `${pct}%` }}
              />
              <div className="relative flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 truncate">
                  {selected && <Check className="h-3 w-3 shrink-0" />}
                  <span className="truncate">{o.label}</span>
                </span>
                <span className="tabular-nums opacity-70">{count} · {pct}%</span>
              </div>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[10px] opacity-60">{total} vote{total === 1 ? "" : "s"} · tap to change</p>
    </div>
  );
}
