import { useEffect, useState } from "react";
import { ListChecks, MessageSquare, Send, Youtube as YoutubeIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { YouTubeChecklist } from "@/components/YouTubeChecklist";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type TaskStatus = "todo" | "in_progress" | "pending" | "overdue" | "done" | "cancelled";

type Task = {
  id: string;
  title: string;
  description: string | null;
  due_at: string | null;
  status: TaskStatus;
  priority: number;
  task_type: "standard" | "youtube";
  assigned_by: string;
};

type Comment = {
  id: string;
  body: string;
  author_id: string;
  created_at: string;
};

const STATUS_OPTIONS: { value: TaskStatus; label: string; color: string }[] = [
  { value: "todo", label: "To do", color: "bg-slate-500" },
  { value: "in_progress", label: "In progress", color: "bg-blue-500" },
  { value: "pending", label: "Pending", color: "bg-amber-500" },
  { value: "overdue", label: "Overdue", color: "bg-rose-600" },
  { value: "done", label: "Done", color: "bg-emerald-500" },
  { value: "cancelled", label: "Cancelled", color: "bg-zinc-500" },
];

export function MyTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [openTask, setOpenTask] = useState<Task | null>(null);

  async function load() {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("tasks")
      .select("id,title,description,due_at,status,priority,task_type,assigned_by")
      .eq("assigned_to", user.id)
      .neq("status", "cancelled")
      .order("status")
      .order("due_at", { ascending: true, nullsFirst: false })
      .limit(12);
    setTasks((data ?? []) as Task[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
    if (!user) return;
    const ch = supabase
      .channel(`my-tasks-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks", filter: `assigned_to=eq.${user.id}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function setStatus(t: Task, status: TaskStatus) {
    const { error } = await supabase.from("tasks").update({ status }).eq("id", t.id);
    if (error) toast.error(error.message);
    else toast.success(`Marked ${STATUS_OPTIONS.find((s) => s.value === status)?.label}`);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <ListChecks className="h-3.5 w-3.5" /> My Tasks
        </h3>
        <span className="text-xs text-muted-foreground">
          {tasks.filter((t) => t.status !== "done").length} open
        </span>
      </div>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">No tasks assigned to you.</p>
      ) : (
        <div className="space-y-2 max-h-72 overflow-y-auto scrollbar-thin pr-1">
          {tasks.map((t) => {
            const opt = STATUS_OPTIONS.find((s) => s.value === t.status)!;
            return (
              <div
                key={t.id}
                className="rounded-lg bg-white/5 dark:bg-white/5 p-2.5 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-start gap-2">
                  <button
                    onClick={() => setOpenTask(t)}
                    className="min-w-0 flex-1 text-left"
                    aria-label="Open task"
                  >
                    <p
                      className={cn(
                        "text-sm flex items-center gap-1.5",
                        t.status === "done" && "line-through text-muted-foreground",
                      )}
                    >
                      {t.task_type === "youtube" && (
                        <YoutubeIcon className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                      )}
                      <span className="truncate">{t.title}</span>
                    </p>
                    {t.due_at && (
                      <Badge variant="outline" className="mt-1 text-[10px]">
                        Due {new Date(t.due_at).toLocaleDateString()}
                      </Badge>
                    )}
                  </button>
                  <Select value={t.status} onValueChange={(v) => setStatus(t, v as TaskStatus)}>
                    <SelectTrigger className="h-7 w-[120px] text-[11px]">
                      <span className="flex items-center gap-1.5">
                        <span className={cn("h-1.5 w-1.5 rounded-full", opt.color)} />
                        <SelectValue />
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s.value} value={s.value} className="text-xs">
                          <span className="flex items-center gap-1.5">
                            <span className={cn("h-1.5 w-1.5 rounded-full", s.color)} />
                            {s.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!openTask} onOpenChange={(v) => !v && setOpenTask(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto scrollbar-thin">
          {openTask && <TaskDetail task={openTask} onStatusChange={(s) => setStatus(openTask, s)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TaskDetail({
  task,
  onStatusChange,
}: {
  task: Task;
  onStatusChange: (s: TaskStatus) => void;
}) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const opt = STATUS_OPTIONS.find((s) => s.value === task.status)!;
  const canEditVideos = !!user && (user.id === task.assigned_by || user.id === task.assigned_by);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("task_comments")
        .select("*")
        .eq("task_id", task.id)
        .order("created_at");
      setComments((data ?? []) as Comment[]);
    })();
    const ch = supabase
      .channel(`task-comments-${task.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "task_comments", filter: `task_id=eq.${task.id}` },
        (payload) => setComments((prev) => [...prev, payload.new as Comment]),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [task.id]);

  async function send() {
    if (!user || !body.trim()) return;
    setSending(true);
    const { error } = await supabase
      .from("task_comments")
      .insert({ task_id: task.id, author_id: user.id, body: body.trim() });
    setSending(false);
    if (error) toast.error(error.message);
    else setBody("");
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          {task.task_type === "youtube" && <YoutubeIcon className="h-4 w-4 text-rose-500" />}
          {task.title}
        </DialogTitle>
      </DialogHeader>

      <div className="flex items-center gap-2 mt-1">
        <Select value={task.status} onValueChange={(v) => onStatusChange(v as TaskStatus)}>
          <SelectTrigger className="h-8 w-[160px] text-xs">
            <span className="flex items-center gap-1.5">
              <span className={cn("h-2 w-2 rounded-full", opt.color)} />
              <SelectValue />
            </span>
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value} className="text-xs">
                <span className="flex items-center gap-1.5">
                  <span className={cn("h-1.5 w-1.5 rounded-full", s.color)} />
                  {s.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {task.due_at && (
          <Badge variant="outline" className="text-[10px]">
            Due {new Date(task.due_at).toLocaleDateString()}
          </Badge>
        )}
      </div>

      {task.description && (
        <p className="text-sm text-muted-foreground mt-3 whitespace-pre-wrap">{task.description}</p>
      )}

      <div className="mt-4 border-t border-border pt-4">
        <YouTubeChecklist taskId={task.id} canEdit={canEditVideos} />
      </div>

      <div className="mt-4 border-t border-border pt-4">
        <p className="text-xs font-semibold mb-2 flex items-center gap-1.5">
          <MessageSquare className="h-3.5 w-3.5" /> Comments
        </p>
        <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
          {comments.length === 0 ? (
            <p className="text-xs text-muted-foreground">No comments yet.</p>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="rounded-lg bg-accent/30 p-2 text-xs">
                <p className="whitespace-pre-wrap">{c.body}</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {new Date(c.created_at).toLocaleString()}
                </p>
              </div>
            ))
          )}
        </div>
        <div className="flex gap-2 mt-2">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Add a comment…"
            rows={2}
            className="text-xs resize-none"
          />
          <Button size="icon" onClick={send} disabled={sending || !body.trim()}>
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </>
  );
}
