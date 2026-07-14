import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Smile } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const QUICK = ["👍", "❤️", "😂", "🎉", "🔥", "🤔", "👀", "🙌", "😢", "💡"];

type Row = { id: string; user_id: string; emoji: string };

export function MessageReactions({
  messageId,
  table = "message_reactions",
  align = "left",
}: {
  messageId: string;
  table?: "message_reactions" | "dm_message_reactions";
  align?: "left" | "right";
}) {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    const { data } = await (supabase.from(table) as any)
      .select("id,user_id,emoji").eq("message_id", messageId);
    setRows((data ?? []) as Row[]);
  }, [table, messageId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const ch = supabase
      .channel(`react-${table}-${messageId}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table, filter: `message_id=eq.${messageId}` },
        () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [table, messageId, load]);

  const toggle = async (emoji: string) => {
    if (!user) return;
    const mine = rows.find((r) => r.user_id === user.id && r.emoji === emoji);
    if (mine) {
      setRows((prev) => prev.filter((r) => r.id !== mine.id));
      await (supabase.from(table) as any).delete().eq("id", mine.id);
    } else {
      const optimistic: Row = { id: `tmp-${Date.now()}`, user_id: user.id, emoji };
      setRows((prev) => [...prev, optimistic]);
      const { error } = await (supabase.from(table) as any).insert({ message_id: messageId, user_id: user.id, emoji });
      if (error) setRows((prev) => prev.filter((r) => r.id !== optimistic.id));
    }
  };

  // group counts
  const groups = new Map<string, Row[]>();
  rows.forEach((r) => {
    const arr = groups.get(r.emoji) ?? [];
    arr.push(r); groups.set(r.emoji, arr);
  });

  if (rows.length === 0) {
    return (
      <div className={cn("flex", align === "right" && "justify-end")}>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button className="opacity-0 group-hover:opacity-100 transition rounded-full h-6 px-1.5 text-[11px] bg-accent/60 hover:bg-accent border border-border flex items-center gap-1">
              <Smile className="h-3 w-3" /> React
            </button>
          </PopoverTrigger>
          <PopoverContent side="top" className="p-2 w-auto">
            <div className="flex gap-1">
              {QUICK.map((e) => (
                <button key={e} onClick={() => { toggle(e); setOpen(false); }}
                  className="h-8 w-8 grid place-items-center rounded-md hover:bg-accent text-lg">{e}</button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-wrap gap-1 mt-1", align === "right" && "justify-end")}>
      {Array.from(groups.entries()).map(([emoji, list]) => {
        const mine = user && list.some((r) => r.user_id === user.id);
        return (
          <button key={emoji} onClick={() => toggle(emoji)}
            className={cn("h-6 px-1.5 rounded-full text-[11px] border flex items-center gap-1 transition",
              mine ? "border-primary/60 bg-primary/15 text-primary" : "border-border bg-accent/40 hover:bg-accent")}>
            <span className="text-sm leading-none">{emoji}</span>
            <span className="tabular-nums">{list.length}</span>
          </button>
        );
      })}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button className="h-6 w-6 rounded-full text-[11px] border border-border bg-accent/40 hover:bg-accent grid place-items-center">
            <Smile className="h-3 w-3" />
          </button>
        </PopoverTrigger>
        <PopoverContent side="top" className="p-2 w-auto">
          <div className="flex gap-1">
            {QUICK.map((e) => (
              <button key={e} onClick={() => { toggle(e); setOpen(false); }}
                className="h-8 w-8 grid place-items-center rounded-md hover:bg-accent text-lg">{e}</button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
