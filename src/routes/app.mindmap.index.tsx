import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Brain } from "lucide-react";
import { toast } from "sonner";

type Board = { id: string; title: string; description: string | null; updated_at: string };

export const Route = createFileRoute("/app/mindmap/")({
  head: () => ({
    meta: [
      { title: "Mind Maps — ALIOS" },
      { name: "description", content: "Your infinite-canvas mind map boards." },
    ],
  }),
  component: BoardsPage,
});

function BoardsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [boards, setBoards] = useState<Board[]>([]);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("mindmap_boards").select("id, title, description, updated_at").eq("user_id", user.id).order("updated_at", { ascending: false });
    setBoards((data as Board[]) ?? []);
  };

  useEffect(() => { load(); }, [user]); // eslint-disable-line

  const create = async () => {
    if (!user) return;
    const { data, error } = await supabase.from("mindmap_boards").insert({ user_id: user.id, title: "Untitled board" }).select().single();
    if (error) return toast.error(error.message);
    navigate({ to: "/app/mindmap/$boardId", params: { boardId: data.id } });
  };

  const remove = async (id: string) => {
    await supabase.from("mindmap_boards").delete().eq("id", id);
    load();
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mind Maps</h1>
          <p className="text-sm text-muted-foreground">Capture ideas on an infinite canvas.</p>
        </div>
        <Button onClick={create}><Plus className="h-3.5 w-3.5 mr-1" /> New board</Button>
      </div>

      {boards.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center">
            <Brain className="h-6 w-6 text-white" />
          </div>
          <h3 className="mt-4 font-semibold">No boards yet</h3>
          <p className="text-sm text-muted-foreground">Create your first board to start mapping ideas.</p>
          <Button className="mt-4" onClick={create}><Plus className="h-3.5 w-3.5 mr-1" /> Create board</Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {boards.map((b) => (
            <div key={b.id} className="glass rounded-2xl p-5 group hover:bg-white/[0.07] transition-colors relative">
              <Link to="/app/mindmap/$boardId" params={{ boardId: b.id }} className="block">
                <div className="h-24 rounded-xl bg-gradient-to-br from-violet-500/20 to-cyan-400/20 flex items-center justify-center mb-3">
                  <Brain className="h-8 w-8 text-foreground/40" />
                </div>
                <h3 className="font-semibold truncate">{b.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">Updated {new Date(b.updated_at).toLocaleDateString()}</p>
              </Link>
              <button
                onClick={() => remove(b.id)}
                className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity rounded-md p-1.5 bg-black/40 hover:bg-destructive/40"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
