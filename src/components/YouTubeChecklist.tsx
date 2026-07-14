import { useEffect, useRef, useState } from "react";
import { Play, Trash2, Plus, CheckCircle2, Circle, Youtube, X, Move } from "lucide-react";
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

export function YouTubeChecklist({
  taskId,
  canEdit,
  onAddToBoard,
}: {
  taskId: string;
  canEdit: boolean;
  onAddToBoard?: (v: { videoId: string; title: string; thumbnail: string | null; videoRowId: string }) => void;
}) {
  const { user } = useAuth();
  const [videos, setVideos] = useState<Video[]>([]);
  const [progress, setProgress] = useState<Map<string, Progress>>(new Map());
  const [url, setUrl] = useState("");
  const [adding, setAdding] = useState(false);
  const [playing, setPlaying] = useState<Video | null>(null);
  const [playingRatio, setPlayingRatio] = useState<number>(16 / 9);
  const ratioCache = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    if (!playing) return;
    const vid = playing.video_id;
    const cached = ratioCache.current.get(vid);
    if (cached) {
      setPlayingRatio(cached);
      return;
    }
    setPlayingRatio(16 / 9);
    const probe = (url: string) =>
      new Promise<number | null>((resolve) => {
        const img = new Image();
        img.onload = () => {
          // YouTube returns a 120x90 grey placeholder when the requested size doesn't exist.
          if (img.naturalWidth <= 130 || img.naturalHeight <= 0) resolve(null);
          else resolve(img.naturalWidth / img.naturalHeight);
        };
        img.onerror = () => resolve(null);
        img.src = url;
      });
    (async () => {
      // Only maxresdefault reflects true aspect; hqdefault is always 4:3 with bars.
      const r = (await probe(`https://i.ytimg.com/vi/${vid}/maxresdefault.jpg`)) ?? 16 / 9;
      ratioCache.current.set(vid, r);
      setPlayingRatio(r);
    })();
  }, [playing]);

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
        <FloatingPlayer
          videoId={playing.video_id}
          title={playing.title ?? "Video"}
          aspect={playingRatio}
          completed={!!progress.get(playing.id)?.completed}
          onToggleComplete={() => toggleComplete(playing)}
          onClose={() => setPlaying(null)}
          nextLabel={next ? `Next: ${next.title ?? "video"} →` : null}
          onNext={next ? () => setPlaying(next) : undefined}
        />
      )}
    </div>
  );
}

/* Draggable + resizable floating video window */
function FloatingPlayer({
  videoId, title, aspect, completed, onToggleComplete, onClose, nextLabel, onNext,
}: {
  videoId: string;
  title: string;
  aspect: number;
  completed: boolean;
  onToggleComplete: () => void;
  onClose: () => void;
  nextLabel: string | null;
  onNext?: () => void;
}) {
  const initW = Math.min(720, typeof window !== "undefined" ? window.innerWidth - 40 : 720);
  const initH = Math.round(initW / Math.max(0.4, aspect)) + 84;
  const [pos, setPos] = useState<{ x: number; y: number; w: number; h: number }>(() => {
    if (typeof window === "undefined") return { x: 40, y: 40, w: initW, h: initH };
    try {
      const raw = localStorage.getItem("alios-floating-player");
      if (raw) return { ...JSON.parse(raw), w: initW, h: initH };
    } catch {}
    return {
      x: Math.max(20, Math.round((window.innerWidth - initW) / 2)),
      y: Math.max(20, Math.round((window.innerHeight - initH) / 3)),
      w: initW,
      h: initH,
    };
  });
  const dragRef = useRef<{ ox: number; oy: number; sx: number; sy: number } | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try { localStorage.setItem("alios-floating-player", JSON.stringify({ x: pos.x, y: pos.y })); } catch {}
  }, [pos.x, pos.y]);

  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { ox: pos.x, oy: pos.y, sx: e.clientX, sy: e.clientY };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const d = dragRef.current;
    setPos((p) => ({
      ...p,
      x: Math.max(0, Math.min(window.innerWidth - 200, d.ox + (e.clientX - d.sx))),
      y: Math.max(0, Math.min(window.innerHeight - 80, d.oy + (e.clientY - d.sy))),
    }));
  };
  const onPointerUp = (e: React.PointerEvent) => {
    dragRef.current = null;
    try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
  };

  return (
    <div
      ref={containerRef}
      className="fixed z-[60] glass rounded-xl overflow-hidden shadow-2xl flex flex-col"
      style={{
        left: pos.x,
        top: pos.y,
        width: pos.w,
        height: pos.h,
        minWidth: 280,
        minHeight: 220,
        maxWidth: "98vw",
        maxHeight: "92vh",
        resize: "both",
        overflow: "hidden",
      }}
    >
      <div
        className="flex items-center gap-2 px-3 py-2 border-b border-border bg-card/80 cursor-move select-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <Youtube className="h-3.5 w-3.5 text-rose-500 shrink-0" />
        <p className="text-xs font-semibold truncate flex-1">{title}</p>
        <button
          onClick={onClose}
          className="rounded p-1 hover:bg-accent/60"
          title="Close"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="flex-1 bg-black relative min-h-0">
        <iframe
          key={videoId}
          src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&iv_load_policy=3&showinfo=0&autoplay=1&fs=1`}
          title={title}
          className="absolute inset-0 w-full h-full"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
        />
      </div>
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-t border-border bg-card/80">
        <button
          onClick={onToggleComplete}
          className="flex items-center gap-1.5 text-xs bg-accent/60 hover:bg-accent rounded-md px-2.5 py-1 transition-colors"
        >
          {completed ? <><CheckCircle2 className="h-3.5 w-3.5" /> Completed</> : <><Circle className="h-3.5 w-3.5" /> Mark complete</>}
        </button>
        {nextLabel && onNext && (
          <button onClick={onNext} className="text-xs bg-primary text-primary-foreground hover:opacity-90 rounded-md px-2.5 py-1 truncate max-w-[50%]">
            {nextLabel}
          </button>
        )}
      </div>
    </div>
  );
}
