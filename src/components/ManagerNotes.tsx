import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Plus, Trash2, X, Pin, MessageCircle, Send, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Note = {
  id: string;
  author_id: string;
  recipient_id: string | null;
  team_id: string | null;
  body: string;
  color: string;
  pinned: boolean;
  created_at: string;
  author_email?: string;
};

type Team = { id: string; name: string };
type Comment = { id: string; note_id: string; author_id: string; body: string; created_at: string; author_email?: string };

const COLORS = ["#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#3b82f6"];

export function ManagerNotes() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [composing, setComposing] = useState(false);
  const [body, setBody] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [target, setTarget] = useState<string>("__self__"); // __self__ | team:<id>
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("manager_notes")
      .select("*")
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50);
    const authors = Array.from(new Set((data ?? []).map((n) => n.author_id)));
    const emails = new Map<string, string>();
    await Promise.all(
      authors.map(async (a) => {
        const { data: e } = await supabase.rpc("get_user_email", { _user_id: a });
        if (e) emails.set(a, e as string);
      }),
    );
    setNotes(((data ?? []) as Note[]).map((n) => ({ ...n, author_email: emails.get(n.author_id) })));
  }, [user]);

  const loadTeams = useCallback(async () => {
    if (!user) return;
    const { data: mems } = await supabase.from("team_members").select("team_id").eq("user_id", user.id).eq("status", "active");
    const { data: owned } = await supabase.from("teams").select("id,name").eq("owner_id", user.id);
    const ids = new Set<string>();
    (mems ?? []).forEach((m) => ids.add(m.team_id));
    (owned ?? []).forEach((t) => ids.add(t.id));
    if (ids.size === 0) return setTeams([]);
    const { data } = await supabase.from("teams").select("id,name").in("id", Array.from(ids));
    setTeams((data ?? []) as Team[]);
  }, [user]);

  useEffect(() => {
    load();
    loadTeams();
  }, [load, loadTeams]);

  const addNote = async () => {
    if (!user || !body.trim()) return;
    setLoading(true);
    const isTeam = target.startsWith("team:");
    const payload: Record<string, unknown> = {
      author_id: user.id,
      body: body.trim(),
      color,
    };
    if (isTeam) payload.team_id = target.slice(5);
    else payload.recipient_id = user.id;
    const { error } = await supabase.from("manager_notes").insert(payload as never);
    setLoading(false);
    if (error) return toast.error(error.message);
    setBody("");
    setComposing(false);
    toast.success("Note added");
    load();
  };

  const deleteNote = async (id: string) => {
    await supabase.from("manager_notes").delete().eq("id", id);
    setNotes((n) => n.filter((x) => x.id !== id));
  };

  const togglePin = async (n: Note) => {
    await supabase.from("manager_notes").update({ pinned: !n.pinned }).eq("id", n.id);
    load();
  };

  const visible = notes.slice(0, 4);

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
              className="bg-accent/40 border-border resize-none"
              autoFocus
            />
            <div className="mt-2 flex flex-wrap items-center gap-2 justify-between">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      className={cn(
                        "h-5 w-5 rounded-full border transition-transform",
                        color === c ? "border-foreground scale-110" : "border-border",
                      )}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <Select value={target} onValueChange={setTarget}>
                  <SelectTrigger className="h-8 w-44 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__self__">For myself</SelectItem>
                    {teams.map((t) => (
                      <SelectItem key={t.id} value={`team:${t.id}`}>
                        <span className="flex items-center gap-1.5"><Users className="h-3 w-3" /> {t.name}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button size="sm" onClick={addNote} disabled={loading || !body.trim()}>
                Save
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-4 flex-1 space-y-2 overflow-y-auto scrollbar-thin pr-1 max-h-[300px]">
        {notes.length === 0 && !composing ? (
          <div className="flex h-full min-h-[100px] items-center justify-center text-center">
            <p className="text-xs text-muted-foreground">
              No notes yet. Add a note for yourself or your team.
            </p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {visible.map((n) => (
              <NoteCard key={n.id} note={n} userId={user?.id} onDelete={deleteNote} onPin={togglePin} />
            ))}
          </AnimatePresence>
        )}
      </div>

      {notes.length > 4 && (
        <Sheet>
          <SheetTrigger asChild>
            <button className="mt-2 text-xs text-primary hover:underline">
              View all {notes.length} →
            </button>
          </SheetTrigger>
          <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
            <SheetHeader>
              <SheetTitle>All Manager Notes</SheetTitle>
            </SheetHeader>
            <div className="mt-4 space-y-2">
              {notes.map((n) => (
                <NoteCard key={n.id} note={n} userId={user?.id} onDelete={deleteNote} onPin={togglePin} expanded />
              ))}
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}

function NoteCard({
  note,
  userId,
  onDelete,
  onPin,
  expanded,
}: {
  note: Note;
  userId?: string;
  onDelete: (id: string) => void;
  onPin: (n: Note) => void;
  expanded?: boolean;
}) {
  const [showComments, setShowComments] = useState(!!expanded);
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState("");

  const loadComments = useCallback(async () => {
    const { data } = await supabase
      .from("note_comments")
      .select("*")
      .eq("note_id", note.id)
      .order("created_at");
    const authors = Array.from(new Set((data ?? []).map((c) => c.author_id)));
    const emails = new Map<string, string>();
    await Promise.all(
      authors.map(async (a) => {
        const { data: e } = await supabase.rpc("get_user_email", { _user_id: a });
        if (e) emails.set(a, e as string);
      }),
    );
    setComments(((data ?? []) as Comment[]).map((c) => ({ ...c, author_email: emails.get(c.author_id) })));
  }, [note.id]);

  useEffect(() => {
    if (showComments) loadComments();
  }, [showComments, loadComments]);

  const send = async () => {
    if (!userId || !body.trim()) return;
    const text = body.trim();
    setBody("");
    const { error } = await supabase.from("note_comments").insert({
      note_id: note.id,
      author_id: userId,
      body: text,
    });
    if (error) {
      setBody(text);
      toast.error(error.message);
      return;
    }
    loadComments();
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 8 }}
      className="group relative rounded-lg border bg-card p-3 pl-4 hover:bg-accent/30 transition-colors"
      style={{ borderLeftColor: note.color, borderLeftWidth: 3 }}
    >
      <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">{note.body}</p>
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <p className="text-[10px] text-muted-foreground truncate">
          {note.author_id === userId ? "you" : note.author_email ?? "manager"} ·{" "}
          {new Date(note.created_at).toLocaleString(undefined, {
            month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
          })}
          {note.team_id && " · team"}
        </p>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowComments((v) => !v)}
            className="text-muted-foreground hover:text-foreground transition-colors"
            title="Comments"
          >
            <MessageCircle className="h-3 w-3" />
          </button>
          {note.author_id === userId && (
            <>
              <button
                onClick={() => onPin(note)}
                className={cn("text-muted-foreground hover:text-foreground transition-colors", note.pinned && "text-amber-500")}
                title={note.pinned ? "Unpin" : "Pin"}
              >
                <Pin className="h-3 w-3" />
              </button>
              <button
                onClick={() => onDelete(note.id)}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </>
          )}
        </div>
      </div>

      {showComments && (
        <div className="mt-3 pt-3 border-t border-border space-y-2">
          {comments.map((c) => (
            <div key={c.id} className="text-xs">
              <p className="text-[10px] text-muted-foreground">
                {c.author_id === userId ? "you" : c.author_email ?? "user"} · {new Date(c.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
              </p>
              <p className="text-foreground/90">{c.body}</p>
            </div>
          ))}
          <div className="flex gap-1.5">
            <input
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); send(); } }}
              placeholder="Reply…"
              className="flex-1 rounded-md bg-accent/40 border border-border px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button onClick={send} disabled={!body.trim()} className="rounded-md bg-primary text-primary-foreground p-1.5 disabled:opacity-50">
              <Send className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
