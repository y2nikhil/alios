import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Brain, Sparkles, Lightbulb, Network, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Board = { id: string; title: string; description: string | null; updated_at: string; user_id?: string; owner?: boolean };

export const Route = createFileRoute("/app/mindmap/")({
  head: () => ({
    meta: [
      { title: "Mind Maps — ClassLab" },
      { name: "description", content: "Your infinite-canvas mind map boards." },
    ],
  }),
  component: BoardsPage,
});

const COVER_GRADIENTS = [
  "from-violet-500/30 via-fuchsia-500/20 to-cyan-400/25",
  "from-emerald-500/30 via-teal-400/20 to-sky-400/25",
  "from-amber-400/30 via-rose-500/20 to-fuchsia-500/25",
  "from-indigo-500/30 via-purple-500/20 to-pink-500/25",
  "from-sky-500/30 via-cyan-400/20 to-emerald-400/25",
  "from-rose-500/30 via-orange-400/20 to-amber-400/25",
];

function BoardsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("mindmap_boards")
      .select("id, title, description, updated_at, user_id")
      .order("updated_at", { ascending: false });
    const next = ((data as Board[]) ?? []).map((board) => ({
      ...board,
      owner: board.user_id === user.id,
    }));
    setBoards(next);
    setLoading(false);
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
    <div className="p-4 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-border p-6 sm:p-10 glass">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-gradient-to-br from-violet-500/40 to-cyan-400/30 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-gradient-to-tr from-fuchsia-500/30 to-amber-400/20 blur-3xl pointer-events-none" />
        <div className="relative grid gap-6 md:grid-cols-[1.4fr,1fr] items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/40 px-3 py-1 text-[11px] font-medium text-muted-foreground">
              <Sparkles className="h-3 w-3 text-amber-400" /> AI-augmented thinking canvas
            </span>
            <h1 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight text-gradient">
              Map ideas at the speed of thought
            </h1>
            <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-xl">
              Double-click to drop nodes. Connect anything. Paste a YouTube playlist and learn while you plan.
              Boards stay synced for your team in real time.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button onClick={create} size="lg" className="shadow-lg shadow-primary/30">
                <Plus className="h-4 w-4 mr-1.5" /> New board
              </Button>
              <Link to="/app/playlists">
                <Button variant="outline" size="lg" className="bg-background/40">
                  <Lightbulb className="h-4 w-4 mr-1.5" /> Browse playlists
                </Button>
              </Link>
            </div>
          </div>
          <div className="hidden md:grid grid-cols-2 gap-3">
            <FeatureChip icon={Network} title="Infinite canvas" tone="from-violet-500/40 to-fuchsia-500/30" />
            <FeatureChip icon={Wand2} title="AI summarize & expand" tone="from-emerald-500/40 to-teal-400/30" />
            <FeatureChip icon={Brain} title="Smart paste" tone="from-amber-400/40 to-rose-500/30" />
            <FeatureChip icon={Sparkles} title="Live collaboration" tone="from-sky-500/40 to-cyan-400/30" />
          </div>
        </div>
      </section>

      {loading ? (
        <div className="glass rounded-2xl p-12 text-center">
          <p className="text-sm text-muted-foreground">Loading boards…</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* New board CTA tile */}
          <button
            onClick={create}
            className="group relative overflow-hidden rounded-2xl border-2 border-dashed border-primary/40 bg-gradient-to-br from-violet-500/10 to-cyan-400/10 p-6 min-h-[180px] flex flex-col items-center justify-center gap-2 hover:border-primary transition-all hover:scale-[1.02]"
          >
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center shadow-xl shadow-primary/40 group-hover:scale-110 transition-transform">
              <Plus className="h-7 w-7 text-white" />
            </div>
            <p className="font-semibold">Create new board</p>
            <p className="text-xs text-muted-foreground">Start with a blank canvas</p>
          </button>

          {boards.map((b, i) => (
            <div key={b.id} className="glass rounded-2xl p-0 group hover:scale-[1.02] transition-all relative overflow-hidden">
              <Link to="/app/mindmap/$boardId" params={{ boardId: b.id }} className="block">
                <div className={cn(
                  "h-28 bg-gradient-to-br relative flex items-center justify-center",
                  COVER_GRADIENTS[i % COVER_GRADIENTS.length],
                )}>
                  <Brain className="h-10 w-10 text-foreground/60 drop-shadow-lg" />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,transparent,rgba(0,0,0,0.15))]" />
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold truncate">{b.title}</h3>
                    {!b.owner && <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">Shared</span>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {b.owner ? "Owned by you" : "Shared with you"} · {new Date(b.updated_at).toLocaleDateString()}
                  </p>
                </div>
              </Link>
              {b.owner && (
                <button
                  onClick={() => remove(b.id)}
                  className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity rounded-md p-1.5 bg-background/70 backdrop-blur hover:bg-destructive/80 hover:text-white"
                  title="Delete board"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FeatureChip({ icon: Icon, title, tone }: { icon: typeof Brain; title: string; tone: string }) {
  return (
    <div className={cn("rounded-xl border border-border p-3 bg-gradient-to-br backdrop-blur-sm", tone)}>
      <Icon className="h-4 w-4 text-foreground" />
      <p className="mt-2 text-xs font-medium">{title}</p>
    </div>
  );
}
