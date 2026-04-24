import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Youtube, PlayCircle, CheckCircle2, ListVideo, ArrowRight, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { YouTubeChecklist } from "@/components/YouTubeChecklist";
import { NewTaskDialog } from "@/components/MyTasks";

export const Route = createFileRoute("/app/playlists")({
  beforeLoad: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw redirect({ to: "/login" });
  },
  head: () => ({
    meta: [
      { title: "Playlists — ALIOS" },
      { name: "description", content: "Track YouTube learning tasks and playlist completion in one place." },
    ],
  }),
  component: PlaylistsPage,
});

type PlaylistTask = {
  id: string;
  title: string;
  description: string | null;
  status: "todo" | "in_progress" | "pending" | "overdue" | "done" | "cancelled";
  due_at: string | null;
  assigned_by: string;
  assigned_to: string | null;
  created_at?: string;
};

type VideoRow = { id: string; task_id: string };
type VideoProgress = { video_row_id: string; completed: boolean };

function PlaylistsPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<PlaylistTask[]>([]);
  const [videoCounts, setVideoCounts] = useState<Record<string, number>>({});
  const [completedCounts, setCompletedCounts] = useState<Record<string, number>>({});
  const [openTask, setOpenTask] = useState<PlaylistTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      setLoading(true);
      const { data: taskRows } = await supabase
        .from("tasks")
        .select("id,title,description,status,due_at,assigned_by,assigned_to,created_at")
        .eq("task_type", "youtube_checklist")
        .or(`assigned_to.eq.${user.id},assigned_by.eq.${user.id}`)
        .neq("status", "cancelled")
        .order("created_at", { ascending: false });

      const nextTasks = (taskRows ?? []) as PlaylistTask[];
      setTasks(nextTasks);

      if (nextTasks.length === 0) {
        setVideoCounts({});
        setCompletedCounts({});
        setLoading(false);
        return;
      }

      const taskIds = nextTasks.map((task) => task.id);
      const { data: videos } = await supabase
        .from("task_videos")
        .select("id,task_id")
        .in("task_id", taskIds);

      const videoRows = (videos ?? []) as VideoRow[];
      const allCounts: Record<string, number> = {};
      videoRows.forEach((row) => {
        allCounts[row.task_id] = (allCounts[row.task_id] ?? 0) + 1;
      });
      setVideoCounts(allCounts);

      if (videoRows.length === 0) {
        setCompletedCounts({});
        setLoading(false);
        return;
      }

      const { data: progressRows } = await supabase
        .from("task_video_progress")
        .select("video_row_id,completed")
        .eq("user_id", user.id)
        .eq("completed", true)
        .in("video_row_id", videoRows.map((row) => row.id));

      const progress = (progressRows ?? []) as VideoProgress[];
      const taskByVideoId = new Map(videoRows.map((row) => [row.id, row.task_id]));
      const doneCounts: Record<string, number> = {};
      progress.forEach((row) => {
        const taskId = taskByVideoId.get(row.video_row_id);
        if (taskId) doneCounts[taskId] = (doneCounts[taskId] ?? 0) + 1;
      });
      setCompletedCounts(doneCounts);
      setLoading(false);
    };

    load();

    const channel = supabase
      .channel(`playlist-hub-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "task_videos" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "task_video_progress", filter: `user_id=eq.${user.id}` }, load)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const summary = useMemo(() => {
    const total = tasks.length;
    const active = tasks.filter((task) => task.status !== "done").length;
    const completed = tasks.filter((task) => task.status === "done").length;
    return { total, active, completed };
  }, [tasks]);

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-accent/30 px-3 py-1 text-xs text-muted-foreground">
            <Youtube className="h-3.5 w-3.5 text-rose-500" />
            Learning playlists
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Playlist Center</h1>
            <p className="text-sm text-muted-foreground">Dedicated space for YouTube training tasks, progress tracking, and playback.</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 min-w-[280px]">
          <Stat label="Total" value={summary.total} />
          <Stat label="Active" value={summary.active} />
          <Stat label="Done" value={summary.completed} />
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-[1.4fr_0.9fr]">
        <div className="glass rounded-2xl p-4 lg:p-5 space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-sm font-semibold">Assigned playlist tasks</h2>
              <p className="text-xs text-muted-foreground">Open any task to play videos and update checklist progress.</p>
            </div>
            <Badge variant="outline" className="text-[11px]">Separate section enabled</Badge>
          </div>

          {loading ? (
            <div className="py-8 text-sm text-muted-foreground">Loading playlist tasks…</div>
          ) : tasks.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-accent/20 p-8 text-center">
              <ListVideo className="mx-auto h-10 w-10 text-muted-foreground/50" />
              <p className="mt-3 text-sm font-medium">No playlist tasks yet</p>
              <p className="mt-1 text-xs text-muted-foreground">Admins can create a YouTube playlist checklist task from the Admin panel.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => {
                const totalVideos = videoCounts[task.id] ?? 0;
                const doneVideos = completedCounts[task.id] ?? 0;
                const pct = totalVideos > 0 ? Math.round((doneVideos / totalVideos) * 100) : 0;

                return (
                  <button
                    key={task.id}
                    onClick={() => setOpenTask(task)}
                    className="w-full text-left rounded-xl border border-border bg-background/30 hover:bg-accent/25 transition-colors p-4"
                  >
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <PlayCircle className="h-4 w-4 text-rose-500 shrink-0" />
                          <p className="text-sm font-semibold truncate">{task.title}</p>
                          <Badge variant="secondary" className="capitalize">{task.status.replace("_", " ")}</Badge>
                        </div>
                        {task.description && (
                          <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{task.description}</p>
                        )}
                        <div className="mt-3 flex items-center gap-4 flex-wrap text-xs text-muted-foreground">
                          <span>{doneVideos}/{totalVideos} videos complete</span>
                          {task.due_at && <span>Due {new Date(task.due_at).toLocaleDateString()}</span>}
                        </div>
                      </div>
                      <div className="min-w-[132px] space-y-2">
                        <div className="h-2 rounded-full bg-accent overflow-hidden">
                          <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-medium">{pct}%</span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <aside className="glass rounded-2xl p-4 lg:p-5 space-y-4">
          <h2 className="text-sm font-semibold">How it works</h2>
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-xs font-semibold text-foreground">1</div>
              <p>Admin creates a task and marks it as a YouTube playlist checklist.</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-xs font-semibold text-foreground">2</div>
              <p>Open the task here, paste video or playlist links, and play them in the built-in viewer.</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-xs font-semibold text-foreground">3</div>
              <p>Mark items complete to track progress for each assigned person.</p>
            </div>
          </div>
          <div className="rounded-xl bg-accent/25 p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Dedicated navigation added
            </div>
            <p className="mt-1 text-xs text-muted-foreground">You can now access Playlists directly from the main app sidebar and mobile nav.</p>
          </div>
        </aside>
      </section>

      <Dialog open={!!openTask} onOpenChange={(open) => !open && setOpenTask(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto scrollbar-thin">
          {openTask && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Youtube className="h-4 w-4 text-rose-500" />
                  {openTask.title}
                </DialogTitle>
              </DialogHeader>
              {openTask.description && <p className="text-sm text-muted-foreground">{openTask.description}</p>}
              <YouTubeChecklist taskId={openTask.id} canEdit={user?.id === openTask.assigned_by} />
              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setOpenTask(null)}>
                  Close <ArrowRight className="ml-2 h-3.5 w-3.5" />
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-background/30 p-3">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}