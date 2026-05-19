import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/tasks")({
  head: () => ({ meta: [{ title: "Tasks — ALIOS" }] }),
  component: TasksPage,
});

type T = { id: string; title: string; subject: string; done: boolean };
const KEY = "alios-tasks";
const SUBJECTS = ["Math","Physics","Chem","Biology","History","English","General"];

function read(): T[] {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}

function TasksPage() {
  const [tasks, setTasks] = useState<T[]>(read);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("General");

  const save = (next: T[]) => { setTasks(next); localStorage.setItem(KEY, JSON.stringify(next)); };
  const add = () => {
    if (!title.trim()) return;
    save([...tasks, { id: String(Date.now()), title: title.trim(), subject, done: false }]);
    setTitle("");
  };
  const toggle = (id: string) => save(tasks.map((t) => t.id === id ? { ...t, done: !t.done } : t));
  const del = (id: string) => save(tasks.filter((t) => t.id !== id));

  return (
    <div className="mx-auto max-w-3xl p-4 lg:p-6 space-y-4">
      <div>
        <h1 className="text-[18px] font-semibold tracking-tight flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-brand" />Tasks
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">Saved on this device — works in guest mode too.</p>
      </div>

      <div className="card-flat p-3 flex gap-2">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") add(); }} placeholder="New task title" className="h-9" />
        <select value={subject} onChange={(e) => setSubject(e.target.value)} className="surface-2 border-soft rounded-md px-2 text-[12px] h-9">
          {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
        </select>
        <Button onClick={add} className="bg-brand text-primary-foreground hover:opacity-90 h-9"><Plus className="h-3.5 w-3.5" /></Button>
      </div>

      <div className="card-flat divide-y divide-border/60">
        {tasks.length === 0 && <p className="px-4 py-6 text-center text-[12px] text-muted-foreground">No tasks yet. Add one above.</p>}
        {tasks.map((t) => (
          <div key={t.id} className="flex items-center gap-2 px-4 py-2.5">
            <button onClick={() => toggle(t.id)} className={cn("h-4 w-4 rounded border-[0.5px] flex items-center justify-center",
              t.done ? "bg-[oklch(0.62_0.12_165)] border-[oklch(0.62_0.12_165)]" : "border-muted-foreground/40")}>
              {t.done && <svg className="h-2.5 w-2.5 text-white" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 6l3 3 5-6"/></svg>}
            </button>
            <span className={cn("flex-1 text-[13px]", t.done && "line-through text-muted-foreground")}>{t.title}</span>
            <span className="tag tag-brand">{t.subject}</span>
            <button onClick={() => del(t.id)} className="text-[11px] text-muted-foreground hover:text-destructive">remove</button>
          </div>
        ))}
      </div>
    </div>
  );
}
