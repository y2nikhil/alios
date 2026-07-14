import { useEffect, useState } from "react";
import { ListChecks, MessageSquare, Send, Youtube as YoutubeIcon, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { YouTubeChecklist } from "@/components/YouTubeChecklist";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type TaskStatus = "todo" | "in_progress" | "pending" | "overdue" | "done" | "cancelled";
type TaskType = "standard" | "youtube_checklist";

type Task = {
  id: string;
  title: string;
  description: string | null;
  due_at: string | null;
  status: TaskStatus;
  priority: number;
  task_type: TaskType;
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
  const [creating, setCreating] = useState(false);

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
          <ListChecks className="h-3.5 w-3.5" /> Tasks
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {tasks.filter((t) => t.status !== "done").length} open
          </span>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setCreating(true)}>
            <Plus className="h-3 w-3 mr-1" /> New
          </Button>
        </div>
      </div>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">No tasks yet — create one with the New button.</p>
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
                      {t.task_type === "youtube_checklist" && (
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

      <NewTaskDialog open={creating} onOpenChange={setCreating} onCreated={load} />
    </div>
  );
}

export function NewTaskDialog({
  open,
  onOpenChange,
  onCreated,
  defaultType,
  lockType,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated?: () => void;
  defaultType?: TaskType;
  lockType?: boolean;
}) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [taskType, setTaskType] = useState<TaskType>(defaultType ?? "standard");
  const [due, setDue] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle("");
      setDescription("");
      setTaskType(defaultType ?? "standard");
      setDue("");
    }
  }, [open, defaultType]);

  async function submit() {
    if (!user || !title.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("tasks").insert({
      title: title.trim(),
      description: description.trim() || null,
      assigned_to: user.id,
      assigned_by: user.id,
      task_type: taskType,
      due_at: due ? new Date(due).toISOString() : null,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(taskType === "youtube_checklist" ? "Playlist created" : "Task created");
    onOpenChange(false);
    onCreated?.();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{lockType && taskType === "youtube_checklist" ? "New playlist" : "New task"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="t-title">Title</Label>
            <Input id="t-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs doing?" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="t-desc">Description (optional)</Label>
            <Textarea id="t-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          {!lockType && (
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={taskType} onValueChange={(v) => setTaskType(v as TaskType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard task</SelectItem>
                  <SelectItem value="youtube_checklist">YouTube playlist</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="t-due">Due (optional)</Label>
            <Input id="t-due" type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button onClick={submit} disabled={busy || !title.trim()}>
            {busy ? "Creating…" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
  const canEditVideos = !!user && user.id === task.assigned_by;

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
          {task.task_type === "youtube_checklist" && <YoutubeIcon className="h-4 w-4 text-rose-500" />}
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
