import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Plus, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Note = {
  id: string;
  author_id: string;
  recipient_id: string;
  body: string;
  color: string;
  created_at: string;
};

const COLORS = ["#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#3b82f6"];

export function ManagerNotes() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [composing, setComposing] = useState(false);
  const [body, setBody] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("manager_notes")
      .select("*")
      .or(`author_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) setNotes(data as Note[]);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const addNote = async () => {
    if (!user || !body.trim()) return;
    setLoading(true);
    const { error } = await supabase.from("manager_notes").insert({
      author_id: user.id,
      recipient_id: user.id, // self-note for now (admin-to-member in Wave 2)
      body: body.trim(),
      color,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setBody("");
    setComposing(false);
    toast.success("Note added");
    load();
  };

  const deleteNote = async (id: string) => {
    await supabase.from("manager_notes").delete().eq("id", id);
    setNotes((n) => n.filter((x) => x.id !== id));
  };

  const visible = showAll ? notes : notes.slice(0, 3);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-cyan-400">
            <MessageSquare className="h-3.5 w-3.5 text-white" />
          </div>
          <h3 className="text-sm font-semibold">Manager Notes</h3>
          <span className="text-[10px] text-muted-foreground">{notes.length}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setComposing((v) => !v)}>
          {composing ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3 mr-1" />}
          {composing ? "Cancel" : "Add note"}
        </Button>
      </div>

      <AnimatePresence>
        {composing && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mt-3"
          >
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write a note or feedback…"
              rows={3}
              className="bg-white/5 border-white/10 resize-none"
              autoFocus
            />
            <div className="mt-2 flex items-center justify-between">
              <div className="flex gap-1.5">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={cn(
                      "h-5 w-5 rounded-full border transition-transform",
                      color === c ? "border-white/60 scale-110" : "border-white/10",
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <Button size="sm" onClick={addNote} disabled={loading || !body.trim()}>
                Save
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-4 flex-1 space-y-2 overflow-y-auto scrollbar-thin pr-1 max-h-[280px]">
        {notes.length === 0 && !composing ? (
          <div className="flex h-full min-h-[100px] items-center justify-center text-center">
            <p className="text-xs text-muted-foreground">
              No notes yet. Add your first note or wait for feedback from your manager.
            </p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {visible.map((n) => (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                className="group relative rounded-lg border border-white/5 bg-white/[0.03] p-3 pl-4 hover:bg-white/[0.06] transition-colors"
                style={{ borderLeftColor: n.color, borderLeftWidth: 3 }}
              >
                <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">{n.body}</p>
                <div className="mt-1.5 flex items-center justify-between">
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(n.created_at).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                    {n.author_id === user?.id && " · you"}
                  </p>
                  {n.author_id === user?.id && (
                    <button
                      onClick={() => deleteNote(n.id)}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {notes.length > 3 && (
        <button
          onClick={() => setShowAll((v) => !v)}
          className="mt-2 text-xs text-muted-foreground hover:text-foreground"
        >
          {showAll ? "Show less" : `View all ${notes.length} →`}
        </button>
      )}
    </div>
  );
}
