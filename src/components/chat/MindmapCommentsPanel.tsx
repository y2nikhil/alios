import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { MessageCircle, Send, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Row = {
  id: string; user_id: string; body: string; created_at: string;
  author?: { display_name: string | null; username: string | null } | null;
};

export function MindmapCommentsPanel({ messageId, mine }: { messageId: string; mine: boolean }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [count, setCount] = useState<number>(0);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  const loadCount = useCallback(async () => {
    const { count: c } = await (supabase.from("mindmap_share_comments") as any)
      .select("id", { count: "exact", head: true }).eq("message_id", messageId);
    setCount(c ?? 0);
  }, [messageId]);

  const load = useCallback(async () => {
    const { data } = await (supabase.from("mindmap_share_comments") as any)
      .select("id,user_id,body,created_at").eq("message_id", messageId).order("created_at");
    const arr = (data ?? []) as Row[];
    const uids = Array.from(new Set(arr.map((r) => r.user_id)));
    if (uids.length) {
      const { data: profs } = await supabase.from("profiles")
        .select("id,display_name,username").in("id", uids);
      const map = new Map((profs ?? []).map((p: any) => [p.id, p]));
      arr.forEach((r) => { r.author = (map.get(r.user_id) as any) ?? null; });
    }
    setRows(arr);
    setCount(arr.length);
  }, [messageId]);

  useEffect(() => { loadCount(); }, [loadCount]);
  useEffect(() => { if (open) load(); }, [open, load]);

  useEffect(() => {
    const ch = supabase.channel(`mm-c-${messageId}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "mindmap_share_comments", filter: `message_id=eq.${messageId}` },
        () => { open ? load() : loadCount(); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [messageId, open, load, loadCount]);

  const submit = async () => {
    if (!user || !body.trim()) return;
    setBusy(true);
    const { error } = await (supabase.from("mindmap_share_comments") as any)
      .insert({ message_id: messageId, user_id: user.id, body: body.trim() });
    setBusy(false);
    if (error) toast.error(error.message); else setBody("");
  };

  return (
    <div className="mt-2">
      <button onClick={() => setOpen((v) => !v)}
        className={cn("inline-flex items-center gap-1.5 text-[11px] rounded-full px-2 py-0.5 border transition",
          mine ? "border-primary-foreground/30 hover:bg-primary-foreground/10"
               : "border-border bg-accent/40 hover:bg-accent")}>
        <MessageCircle className="h-3 w-3" />
        {count > 0 ? `${count} comment${count === 1 ? "" : "s"}` : "Comment"}
        {open && <X className="h-3 w-3 ml-0.5 opacity-60" />}
      </button>

      {open && (
        <div className={cn("mt-2 rounded-xl border p-2 space-y-2 max-w-md",
          mine ? "border-primary-foreground/20 bg-primary-foreground/5" : "border-border bg-background/50")}>
          <div className="max-h-52 overflow-y-auto space-y-1.5 scrollbar-thin">
            {rows.length === 0 && (
              <p className="text-[11px] text-center py-2 opacity-70">No comments yet.</p>
            )}
            {rows.map((r) => (
              <div key={r.id} className="text-xs">
                <span className="font-semibold">
                  {r.author?.display_name ?? r.author?.username ?? "User"}:
                </span>{" "}
                <span className="opacity-90 whitespace-pre-wrap break-words">{r.body}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-1.5">
            <input
              value={body} onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submit(); } }}
              placeholder="Add a comment…"
              className="flex-1 text-xs rounded-lg px-2 py-1 bg-accent/40 border border-border focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button onClick={submit} disabled={busy || !body.trim()}
              className="h-7 w-7 grid place-items-center rounded-lg bg-primary text-primary-foreground disabled:opacity-40">
              {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
