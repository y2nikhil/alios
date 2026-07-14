import { useRef, useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Paperclip, Send, Plus, BarChart3, Brain, Loader2, X, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Props = {
  channelId: string;
  channelName: string;
  disabled?: boolean;
};

export function ChatComposer({ channelId, channelName, disabled }: Props) {
  const { user } = useAuth();
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [pollOpen, setPollOpen] = useState(false);
  const [mindmapOpen, setMindmapOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(async (file: File) => {
    if (!user) return;
    if (file.size > 20 * 1024 * 1024) { toast.error("Max 20 MB"); return; }
    const isImage = file.type.startsWith("image/");
    setSending(true);
    const safe = file.name.replace(/[^A-Za-z0-9._-]/g, "_");
    const path = `${user.id}/chat-${Date.now()}-${safe}`;
    const { error: upErr } = await supabase.storage.from("chat-attachments").upload(path, file, { contentType: file.type });
    if (upErr) { toast.error(upErr.message); setSending(false); return; }
    const { error } = await (supabase.from("chat_messages") as any).insert({
      channel_id: channelId, user_id: user.id, body: body.trim() || null,
      kind: isImage ? "image" : "file",
      attachment_url: path,
      attachment_name: file.name,
      attachment_mime: file.type || null,
      attachment_size: file.size,
    });
    setSending(false);
    if (error) toast.error(error.message);
    else setBody("");
  }, [user, channelId, body]);

  const sendText = async () => {
    if (!user || !body.trim()) return;
    setSending(true);
    const text = body.trim();
    setBody("");
    const { error } = await (supabase.from("chat_messages") as any).insert({
      channel_id: channelId, user_id: user.id, body: text, kind: "text",
    });
    setSending(false);
    if (error) { setBody(text); toast.error("Couldn't send"); }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) uploadFile(f);
  };


  return (
    <div
      className={cn("sticky bottom-0 z-20 border-t border-border bg-background/95 backdrop-blur-xl p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]", dragging && "bg-primary/10")}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      {dragging && (
        <div className="absolute inset-2 rounded-xl border-2 border-dashed border-primary/60 grid place-items-center pointer-events-none bg-background/80 z-10">
          <p className="text-sm text-primary font-semibold flex items-center gap-2">
            <ImageIcon className="h-4 w-4" /> Drop image to share
          </p>
        </div>
      )}
      <input ref={fileRef} type="file" accept="image/*,application/pdf,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f); e.currentTarget.value = ""; }} />

      <div className="flex gap-2 items-end">
        <div className="relative">
          <Button size="icon" variant="ghost" onClick={() => setMenuOpen((v) => !v)} disabled={disabled}>
            <Plus className={cn("h-4 w-4 transition-transform", menuOpen && "rotate-45")} />
          </Button>
          {menuOpen && (
            <div className="absolute bottom-11 left-0 z-20 w-52 rounded-xl border border-border bg-popover shadow-lg p-1 space-y-0.5">
              <MenuItem icon={<Paperclip className="h-3.5 w-3.5" />} label="Attach file or image"
                onClick={() => { setMenuOpen(false); fileRef.current?.click(); }} />
              <MenuItem icon={<BarChart3 className="h-3.5 w-3.5 text-emerald-400" />} label="Create poll"
                onClick={() => { setMenuOpen(false); setPollOpen(true); }} />
              <MenuItem icon={<Brain className="h-3.5 w-3.5 text-fuchsia-400" />} label="Share mind map"
                onClick={() => { setMenuOpen(false); setMindmapOpen(true); }} />
            </div>
          )}
        </div>

        <textarea
          value={body} onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendText(); } }}
          onPaste={(e) => {
            const f = Array.from(e.clipboardData.files).find((x) => x.type.startsWith("image/"));
            if (f) { e.preventDefault(); uploadFile(f); }
          }}
          placeholder={disabled ? "Read-only" : `Message #${channelName} — drop images or use +`} rows={1}
          disabled={disabled}
          className="flex-1 resize-none rounded-xl bg-accent/40 border border-border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary max-h-32"
        />
        <Button onClick={sendText} disabled={sending || disabled || !body.trim()} size="icon" className="shrink-0">
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>

      <PollDialog open={pollOpen} onOpenChange={setPollOpen} channelId={channelId} />
      <MindmapPickerDialog open={mindmapOpen} onOpenChange={setMindmapOpen} channelId={channelId} />
    </div>
  );
}

function MenuItem({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm hover:bg-accent transition">
      {icon}{label}
    </button>
  );
}

function PollDialog({ open, onOpenChange, channelId }:
  { open: boolean; onOpenChange: (v: boolean) => void; channelId: string }) {
  const { user } = useAuth();
  const [question, setQuestion] = useState("");
  const [opts, setOpts] = useState<string[]>(["", ""]);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!user) return;
    const q = question.trim();
    const validOpts = opts.map((o) => o.trim()).filter(Boolean);
    if (!q || validOpts.length < 2) { toast.error("Add a question and at least 2 options"); return; }
    setBusy(true);
    const { data: msg, error } = await (supabase.from("chat_messages") as any).insert({
      channel_id: channelId, user_id: user.id,
      body: q, kind: "poll",
      metadata: { question: q },
    }).select("id").single();
    if (error || !msg) { toast.error(error?.message ?? "Failed"); setBusy(false); return; }
    const { error: oErr } = await (supabase.from("poll_options") as any).insert(
      validOpts.map((label, i) => ({ message_id: msg.id, label, sort_order: i })),
    );
    setBusy(false);
    if (oErr) { toast.error(oErr.message); return; }
    setQuestion(""); setOpts(["", ""]); onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-emerald-400" /> Create a poll</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ask a question…" />
          <div className="space-y-2">
            {opts.map((o, i) => (
              <div key={i} className="flex gap-2">
                <Input value={o} onChange={(e) => { const n = [...opts]; n[i] = e.target.value; setOpts(n); }}
                  placeholder={`Option ${i + 1}`} />
                {opts.length > 2 && (
                  <Button size="icon" variant="ghost" onClick={() => setOpts(opts.filter((_, j) => j !== i))}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            {opts.length < 6 && (
              <Button size="sm" variant="ghost" onClick={() => setOpts([...opts, ""])}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add option
              </Button>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>{busy ? "Posting…" : "Post poll"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MindmapPickerDialog({ open, onOpenChange, channelId }:
  { open: boolean; onOpenChange: (v: boolean) => void; channelId: string }) {
  const { user } = useAuth();
  const [boards, setBoards] = useState<{ id: string; title: string; description: string | null }[]>([]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    (async () => {
      const { data } = await supabase.from("mindmap_boards")
        .select("id,title,description").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(50);
      setBoards((data ?? []) as any);
    })();
  }, [open, user]);

  const share = async (b: { id: string; title: string }) => {
    if (!user) return;
    setBusy(true);
    const { error } = await (supabase.from("chat_messages") as any).insert({
      channel_id: channelId, user_id: user.id,
      body: note.trim() || null, kind: "mindmap_share",
      metadata: { board_id: b.id, title: b.title, note: note.trim() || null },
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else { setNote(""); onOpenChange(false); toast.success("Mind map shared"); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Brain className="h-4 w-4 text-fuchsia-400" /> Share a mind map</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note (optional)…" rows={2} />
          <p className="text-[11px] uppercase text-muted-foreground tracking-wider">Pick a board</p>
          <div className="space-y-1.5 max-h-72 overflow-y-auto scrollbar-thin">
            {boards.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No mind maps yet.</p>}
            {boards.map((b) => (
              <button key={b.id} onClick={() => share(b)} disabled={busy}
                className="w-full text-left rounded-lg p-2.5 border border-border bg-accent/30 hover:bg-accent transition">
                <p className="text-sm font-semibold">{b.title}</p>
                {b.description && <p className="text-[11px] text-muted-foreground line-clamp-1">{b.description}</p>}
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
