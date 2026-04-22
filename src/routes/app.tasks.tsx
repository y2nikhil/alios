import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { ListChecks, Youtube, Plus, Calendar, MessageSquare, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { YouTubeChecklist } from "@/components/YouTubeChecklist";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/tasks")({
  beforeLoad: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw redirect({ to: "/login" });
  },
  head: () => ({
    meta: [
      { title: "My Tasks — ALIOS" },
      { name: "description", content: "All your tasks, including YouTube checklists." },
    ],
  }),
  component: TasksPage,
});

type TaskStatus = "todo" | "in_progress" | "done" | "cancelled" | "pending" | "overdue";

type Task = {
  id: string;
  title: string;
  description: string | null;
  due_at: string | null;
  status: TaskStatus;
  priority: number;
  task_type: "standard" | "youtube_checklist";
  assigned_to: string | null;
  assigned_by: string;
};

type Comment = {
  id: string;
  body: string;
  created_at: string;
  author_id: string;
  email?: string;
};

const STATUSES: TaskStatus[] = ["todo", "in_progress", "pending", "overdue", "done", "cancelled"];

const STATUS_TONE: Record<TaskStatus, string> = {
  todo: "bg-muted text-foreground/80",
  in_progress: "bg-primary/20 text-primary",
  pending: "bg-amber-500/20 text-amber-400",
  overdue: "bg-destructive/20 text-destructive",
  done: "bg-emerald-500/20 text-emerald-400",
  cancelled: "bg-muted text-muted-foreground",
};

function TasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [openTask, setOpenTask] = useState<Task | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .eq("assigned_to", user.id)
      .order("status")
      .order("due_at", { ascending: true, nullsFirst: false });
    // Auto-overdue
    const now = new Date();
    const list = (data ?? []).map((t: Task) =>
      t.status !== "done" && t.status !== "cancelled" && t.due_at && new Date(t.due_at) < now
        ? { ...t, status: "overdue" as TaskStatus }
        : t,
    );
    setTasks(list);
  }, [user]);

  useEffect(() => {
    load();
    if (!user) return;
    const ch = supabase
      .channel(`tasks-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks", filter: `assigned_to=eq.${user.id}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user, load]);

  const updateStatus = async (id: string, status: TaskStatus) => {
    await supabase.from("tasks").update({ status }).eq("id", id);
  };

  const grouped = {
    open: tasks.filter((t) => t.status === "todo" || t.status === "in_progress" || t.status === "pending"),
    overdue: tasks.filter((t) => t.status === "overdue"),
    done: tasks.filter((t) => t.status === "done"),
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ListChecks className="h-6 w-6" /> My Tasks
          </h1>
          <p className="text-sm text-muted-foreground">Standard work and YouTube learning checklists.</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-1.5" /> New task
        </Button>
      </div>

      <Tabs defaultValue="open">
        <TabsList>
          <TabsTrigger value="open">Open ({grouped.open.length})</TabsTrigger>
          <TabsTrigger value="overdue">Overdue ({grouped.overdue.length})</TabsTrigger>
          <TabsTrigger value="done">Done ({grouped.done.length})</TabsTrigger>
        </TabsList>

        {(["open", "overdue", "done"] as const).map((key) => (
          <TabsContent key={key} value={key} className="mt-4">
            <div className="space-y-2">
              {grouped[key].length === 0 ? (
                <div className="glass rounded-2xl p-8 text-center text-sm text-muted-foreground">
                  Nothing here.
                </div>
              ) : (
                grouped[key].map((t) => (
                  <TaskRow
                    key={t.id}
                    task={t}
                    onOpen={() => setOpenTask(t)}
                    onStatus={(s) => updateStatus(t.id, s)}
                  />
                ))
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      <CreateTaskDialog open={showCreate} onOpenChange={setShowCreate} onCreated={load} />
      {openTask && (
        <TaskDetailDialog
          task={openTask}
          onOpenChange={(o) => !o && setOpenTask(null)}
          onChanged={load}
        />
      )}
    </div>
  );
}

function TaskRow({
  task,
  onOpen,
  onStatus,
}: {
  task: Task;
  onOpen: () => void;
  onStatus: (s: TaskStatus) => void;
}) {
  return (
    <div className="glass rounded-xl p-4 flex items-start justify-between gap-3 hover:bg-white/[0.04] transition-colors">
      <button onClick={onOpen} className="flex-1 min-w-0 text-left">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium">{task.title}</p>
          {task.task_type === "youtube_checklist" && (
            <Badge variant="outline" className="text-[10px]">
              <Youtube className="h-3 w-3 mr-1" /> YouTube
            </Badge>
          )}
          <span className={cn("text-[10px] px-1.5 py-0.5 rounded", STATUS_TONE[task.status])}>
            {task.status.replace("_", " ")}
          </span>
        </div>
        {task.description && <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{task.description}</p>}
        {task.due_at && (
          <p className="mt-1.5 text-[11px] text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3 w-3" /> Due {new Date(task.due_at).toLocaleDateString()}
          </p>
        )}
      </button>
      <Select value={task.status} onValueChange={(v) => onStatus(v as TaskStatus)}>
        <SelectTrigger className="h-8 w-32 text-xs shrink-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {s.replace("_", " ")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function CreateTaskDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  onCreated: () => void;
}) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [taskType, setTaskType] = useState<"standard" | "youtube_checklist">("standard");
  const [dueAt, setDueAt] = useState("");
  const [busy, setBusy] = useState(false);

  const create = async () => {
    if (!user || !title.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("tasks").insert({
      title: title.trim(),
      description: description.trim() || null,
      task_type: taskType,
      due_at: dueAt ? new Date(dueAt).toISOString() : null,
      assigned_by: user.id,
      assigned_to: user.id,
      status: "todo",
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Task created");
    setTitle("");
    setDescription("");
    setDueAt("");
    setTaskType("standard");
    onOpenChange(false);
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New task</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="t-title">Title</Label>
            <Input id="t-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="t-desc">Description</Label>
            <Textarea id="t-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <Select value={taskType} onValueChange={(v) => setTaskType(v as typeof taskType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="youtube_checklist">YouTube checklist</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="t-due">Due (optional)</Label>
              <Input id="t-due" type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={create} disabled={busy || !title.trim()}>
            {busy ? "Creating…" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TaskDetailDialog({
  task,
  onOpenChange,
  onChanged,
}: {
  task: Task;
  onOpenChange: (b: boolean) => void;
  onChanged: () => void;
}) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState("");
  const canEdit = user?.id === task.assigned_to || user?.id === task.assigned_by;

  const loadComments = useCallback(async () => {
    const { data } = await supabase
      .from("task_comments")
      .select("id, body, created_at, author_id")
      .eq("task_id", task.id)
      .order("created_at", { ascending: true });
    if (!data) return;
    const ids = Array.from(new Set(data.map((c) => c.author_id)));
    const emails: Record<string, string> = {};
    await Promise.all(
      ids.map(async (id) => {
        const { data: e } = await supabase.rpc("get_user_email", { _user_id: id });
        if (e) emails[id] = e as string;
      }),
    );
    setComments(data.map((c) => ({ ...c, email: emails[c.author_id] })));
  }, [task.id]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const send = async () => {
    if (!user || !body.trim()) return;
    const { error } = await supabase
      .from("task_comments")
      .insert({ task_id: task.id, author_id: user.id, body: body.trim() });
    if (error) return toast.error(error.message);
    setBody("");
    loadComments();
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {task.task_type === "youtube_checklist" && <Youtube className="h-4 w-4 text-red-500" />}
            {task.title}
          </DialogTitle>
        </DialogHeader>

        {task.description && (
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{task.description}</p>
        )}

        {task.task_type === "youtube_checklist" && (
          <div className="border-t border-border pt-4">
            <YouTubeChecklist taskId={task.id} canEdit={canEdit} />
          </div>
        )}

        <div className="border-t border-border pt-4 space-y-3">
          <h4 className="text-sm font-semibold flex items-center gap-1.5">
            <MessageSquare className="h-4 w-4" /> Comments ({comments.length})
          </h4>
          <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
            {comments.length === 0 ? (
              <p className="text-xs text-muted-foreground">No comments yet.</p>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="rounded-lg bg-white/5 p-2.5">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                    <span>{c.email ?? c.author_id.slice(0, 8)}</span>
                    <span>{new Date(c.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{c.body}</p>
                </div>
              ))
            )}
          </div>
          <div className="flex gap-2">
            <Input
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write a comment…"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
            />
            <Button onClick={send} disabled={!body.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
