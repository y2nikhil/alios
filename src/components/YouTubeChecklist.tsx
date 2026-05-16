import { useEffect, useRef, useState } from "react";
import { Play, Trash2, Plus, CheckCircle2, Circle, Youtube, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Video = {
  id: string;
  task_id: string;
  video_id: string;
  title: string | null;
  thumbnail: string | null;
  duration_seconds: number | null;
  order_index: number;
  added_by: string;
};

type Progress = {
  video_row_id: string;
  completed: boolean;
  watched_seconds: number;
};

export function YouTubeChecklist({ taskId, canEdit }: { taskId: string; canEdit: boolean }) {
  const { user } = useAuth();
  const [videos, setVideos] = useState<Video[]>([]);
  const [progress, setProgress] = useState<Map<string, Progress>>(new Map());
  const [url, setUrl] = useState("");
  const [adding, setAdding] = useState(false);
  const [playing, setPlaying] = useState<Video | null>(null);

  const load = async () => {
    const [vRes, pRes] = await Promise.all([
      supabase.from("task_videos").select("*").eq("task_id", taskId).order("order_index"),
      user
        ? supabase.from("task_video_progress").select("*").eq("user_id", user.id)
        : Promise.resolve({ data: [] }),
    ]);
    setVideos((vRes.data ?? []) as Video[]);
    const map = new Map<string, Progress>();
    ((pRes.data ?? []) as Progress[]).forEach((p) => map.set(p.video_row_id, p));
    setProgress(map);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId, user]);

  const addUrl = async () => {
    if (!user || !url.trim()) return;
    setAdding(true);
    try {
      const res = await fetch("/api/youtube-parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.videos?.length) {
        toast.error(data.error ?? "Couldn't parse YouTube URL");
        return;
      }
      const startIdx = videos.length;
      const rows = data.videos
        .map((v: { videoId?: string; id?: string; title?: string; thumbnail?: string }, i: number) => ({
          task_id: taskId,
          video_id: v.videoId ?? v.id ?? "",
          title: v.title ?? null,
          thumbnail: v.thumbnail ?? null,
          order_index: startIdx + i,
          added_by: user.id,
        }))
        .filter((r: { video_id: string }) => r.video_id.length > 0);
      if (rows.length === 0) {
        toast.error("No valid videos found in that URL");
        return;
      }
      const { error } = await supabase.from("task_videos").insert(rows);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success(`Added ${rows.length} video${rows.length > 1 ? "s" : ""}`);
      setUrl("");
      load();
    } catch {
      toast.error("Failed to fetch video info");
    } finally {
      setAdding(false);
    }
  };

  const toggleComplete = async (v: Video) => {
    if (!user) return;
    const cur = progress.get(v.id);
    const completed = !cur?.completed;
    const next: Progress = { video_row_id: v.id, completed, watched_seconds: cur?.watched_seconds ?? 0 };
    setProgress(new Map(progress).set(v.id, next));
    await supabase.from("task_video_progress").upsert(
      { user_id: user.id, video_row_id: v.id, completed, watched_seconds: next.watched_seconds },
      { onConflict: "user_id,video_row_id" } as never,
    );
  };

  const removeVideo = async (id: string) => {
    await supabase.from("task_videos").delete().eq("id", id);
    load();
  };

  const completedCount = videos.filter((v) => progress.get(v.id)?.completed).length;
  const pct = videos.length > 0 ? Math.round((completedCount / videos.length) * 100) : 0;

  const next = playing
    ? videos.find((v, i) => i > videos.findIndex((x) => x.id === playing.id) && !progress.get(v.id)?.completed)
    : null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Youtube className="h-4 w-4 text-rose-500" />
        <p className="text-xs font-semibold">Video checklist</p>
        <span className="text-xs text-muted-foreground ml-auto">
          {completedCount} of {videos.length}
        </span>
      </div>
      {videos.length > 0 && <Progress value={pct} className="h-1.5" />}

      {canEdit && (
        <div className="flex gap-2">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste YouTube video or playlist URL"
            className="text-sm"
          />
          <Button size="sm" onClick={addUrl} disabled={adding || !url.trim()}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            {adding ? "Adding…" : "Add"}
          </Button>
        </div>
      )}

      <div className="space-y-1.5 max-h-72 overflow-y-auto scrollbar-thin">
        {videos.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">
            No videos yet. Paste a YouTube link to get started.
          </p>
        )}
        {videos.map((v) => {
          const done = progress.get(v.id)?.completed;
          return (
            <div
              key={v.id}
              className={cn(
                "group flex items-center gap-2 rounded-lg p-2 hover:bg-accent/40 transition-colors",
                done && "opacity-60",
              )}
            >
              <button onClick={() => toggleComplete(v)} className="shrink-0">
                {done ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground" />
                )}
              </button>
              {v.thumbnail && (
                <img
                  src={v.thumbnail}
                  alt=""
                  className="h-10 w-16 object-cover rounded shrink-0"
                  loading="lazy"
                />
              )}
              <button
                onClick={() => setPlaying(v)}
                className="flex-1 text-left min-w-0"
              >
                <p className={cn("text-sm truncate", done && "line-through")}>
                  {v.title ?? `Video ${v.video_id}`}
                </p>
              </button>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setPlaying(v)}>
                <Play className="h-3.5 w-3.5" />
              </Button>
              {canEdit && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100"
                  onClick={() => removeVideo(v.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {playing && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setPlaying(null)}>
          <div className="w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2 text-white">
              <p className="font-semibold truncate">{playing.title ?? "Video"}</p>
              <button onClick={() => setPlaying(null)} className="rounded-full hover:bg-white/10 p-1.5">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="relative aspect-video rounded-xl overflow-hidden bg-black">
              <iframe
                key={playing.id}
                src={`https://www.youtube-nocookie.com/embed/${playing.video_id}?rel=0&modestbranding=1&iv_load_policy=3&showinfo=0&autoplay=1&fs=1`}
                title={playing.title ?? ""}
                className="absolute inset-0 w-full h-full"
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
              />
            </div>
            <div className="flex items-center justify-between mt-3 text-white">
              <button
                onClick={() => toggleComplete(playing)}
                className="flex items-center gap-2 text-sm bg-white/10 hover:bg-white/20 rounded-lg px-3 py-1.5 transition-colors"
              >
                {progress.get(playing.id)?.completed ? (
                  <><CheckCircle2 className="h-4 w-4" /> Completed</>
                ) : (
                  <><Circle className="h-4 w-4" /> Mark complete</>
                )}
              </button>
              {next && (
                <button
                  onClick={() => setPlaying(next)}
                  className="text-sm bg-primary hover:opacity-90 rounded-lg px-3 py-1.5"
                >
                  Next: {next.title ?? "video"} →
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
