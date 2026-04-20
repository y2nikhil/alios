import { useEffect, useState } from "react";
import { ListChecks, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type Task = {
  id: string;
  title: string;
  description: string | null;
  due_at: string | null;
  status: "todo" | "in_progress" | "done" | "cancelled";
  priority: number;
};

export function MyTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("tasks")
      .select("id,title,description,due_at,status,priority")
      .eq("assigned_to", user.id)
      .neq("status", "cancelled")
      .order("status")
      .order("due_at", { ascending: true, nullsFirst: false })
      .limit(8);
    setTasks((data ?? []) as Task[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
    if (!user) return;
    const ch = supabase
      .channel(`my-tasks-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks", filter: `assigned_to=eq.${user.id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function toggle(t: Task) {
    const next = t.status === "done" ? "todo" : "done";
    const { error } = await supabase.from("tasks").update({ status: next }).eq("id", t.id);
    if (error) toast.error(error.message);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <ListChecks className="h-3.5 w-3.5" /> My Tasks
        </h3>
        <span className="text-xs text-muted-foreground">{tasks.filter((t) => t.status !== "done").length} open</span>
      </div>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">No tasks assigned to you.</p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin pr-1">
          {tasks.map((t) => (
            <div key={t.id} className="flex items-start gap-2 rounded-lg bg-white/5 p-2.5 hover:bg-white/10 transition-colors">
              <button
                onClick={() => toggle(t)}
                className={`mt-0.5 h-4 w-4 rounded border ${t.status === "done" ? "bg-emerald-500 border-emerald-500" : "border-white/20"} flex items-center justify-center shrink-0`}
              >
                {t.status === "done" && <Check className="h-3 w-3 text-white" />}
              </button>
              <div className="min-w-0 flex-1">
                <p className={`text-sm ${t.status === "done" ? "line-through text-muted-foreground" : ""}`}>{t.title}</p>
                {t.due_at && (
                  <Badge variant="outline" className="mt-1 text-[10px]">
                    Due {new Date(t.due_at).toLocaleDateString()}
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
