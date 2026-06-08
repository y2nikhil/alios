import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { PlayCircle, Youtube, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

type Item = {
  id: string;
  title: string;
  total: number;
  done: number;
};

export function ContinuePlaylistsPanel() {
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: taskRows } = await supabase
        .from("tasks")
        .select("id,title,status,created_at")
        .eq("task_type", "youtube_checklist")
        .or(`assigned_to.eq.${user.id},assigned_by.eq.${user.id}`)
        .neq("status", "done")
        .neq("status", "cancelled")
        .order("created_at", { ascending: false })
        .limit(20);

      const tasks = (taskRows ?? []) as any[];
      if (tasks.length === 0) { if (!cancelled) { setItems([]); setLoading(false); } return; }

      const ids = tasks.map((t) => t.id);
      const { data: videos } = await supabase
        .from("task_videos")
        .select("id, task_id")
        .in("task_id", ids);
      const vrows = (videos ?? []) as any[];
      const totals: Record<string, number> = {};
      vrows.forEach((v) => { totals[v.task_id] = (totals[v.task_id] ?? 0) + 1; });

      let doneMap: Record<string, number> = {};
      if (vrows.length) {
        const { data: prog } = await supabase
          .from("task_video_progress")
          .select("video_row_id, completed")
          .eq("user_id", user.id)
          .eq("completed", true)
          .in("video_row_id", vrows.map((v) => v.id));
        const byId = new Map(vrows.map((v) => [v.id, v.task_id]));
        (prog ?? []).forEach((p: any) => {
          const tid = byId.get(p.video_row_id);
          if (tid) doneMap[tid] = (doneMap[tid] ?? 0) + 1;
        });
      }

      const next: Item[] = tasks
        .map((t) => ({ id: t.id, title: t.title, total: totals[t.id] ?? 0, done: doneMap[t.id] ?? 0 }))
        .filter((i) => i.total === 0 || i.done < i.total)
        .slice(0, 6);

      if (!cancelled) { setItems(next); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [user]);

  if (loading || items.length === 0) return null;

  return (
    <div className="glass rounded-2xl p-4 lg:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Youtube className="h-4 w-4 text-rose-400" />
          <h3 className="text-sm font-semibold">Continue watching</h3>
          <span className="text-xs text-muted-foreground">· {items.length} unfinished</span>
        </div>
        <Link to="/app/playlists" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          All playlists <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((it) => {
          const pct = it.total > 0 ? Math.round((it.done / it.total) * 100) : 0;
          return (
            <Link
              key={it.id}
              to="/app/playlists"
              className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/20 transition p-4"
            >
              <div className="flex items-start gap-2">
                <PlayCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                <p className="text-sm font-medium line-clamp-2 flex-1">{it.title}</p>
              </div>
              <div className="mt-3 h-1.5 rounded-full bg-white/5 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-rose-500 to-orange-400" style={{ width: `${pct}%` }} />
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>{it.done}/{it.total} videos</span>
                <span className="font-medium text-foreground">{pct}%</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
