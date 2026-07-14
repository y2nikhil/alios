import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Loader2, Send, Paperclip, ArrowLeft, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ReportButton } from "@/components/ReportButton";
import { AvatarIconRender } from "@/components/AvatarIcon";
import { FileAttachment } from "@/components/chat/FileAttachment";
import { MessageReactions } from "@/components/chat/MessageReactions";
import { MentionText } from "@/lib/mentions";

export const Route = createFileRoute("/app/dm/$threadId")({
  head: () => ({ meta: [{ title: "Direct message — ALIOS" }] }),
  component: DmPage,
});

type Msg = {
  id: string; thread_id: string; sender_id: string;
  body: string | null; attachment_url: string | null;
  attachment_name: string | null; attachment_mime: string | null; attachment_size: number | null;
  kind: string | null;
  read_at: string | null; created_at: string;
};

type Thread = { id: string; user_a: string; user_b: string };
type Profile = { id: string; display_name: string | null; username: string | null; avatar_url: string | null; avatar_icon: string | null; avatar_gradient: string | null };

function DmPage() {
  const { threadId } = Route.useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [thread, setThread] = useState<Thread | null>(null);
  const [other, setOther] = useState<Profile | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [signedCache, setSignedCache] = useState<Record<string, string>>({});
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data: t } = await (supabase.from("dm_threads") as any).select("*").eq("id", threadId).maybeSingle();
      if (cancelled) return;
      if (!t) { toast.error("Thread not found"); nav({ to: "/app/friends" }); return; }
      setThread(t as Thread);
      const otherId = t.user_a === user.id ? t.user_b : t.user_a;
      const { data: p } = await supabase.from("profiles").select("id, display_name, username, avatar_url, avatar_icon, avatar_gradient").eq("id", otherId).maybeSingle();
      setOther((p as Profile) ?? null);
      const { data: m } = await (supabase.from("dm_messages") as any)
        .select("*").eq("thread_id", threadId).order("created_at").limit(500);
      setMsgs((m ?? []) as Msg[]);
      // mark unread from other as read
      await (supabase.from("dm_messages") as any)
        .update({ read_at: new Date().toISOString() })
        .eq("thread_id", threadId).is("read_at", null).neq("sender_id", user.id);
    })();
    return () => { cancelled = true; };
  }, [threadId, user, nav]);

  useEffect(() => {
    if (!threadId) return;
    const ch = supabase.channel(`dm-${threadId}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "dm_messages", filter: `thread_id=eq.${threadId}` },
        (payload) => {
          setMsgs((prev) => [...prev, payload.new as Msg]);
          if (user && (payload.new as Msg).sender_id !== user.id) {
            (supabase.from("dm_messages") as any).update({ read_at: new Date().toISOString() }).eq("id", (payload.new as Msg).id);
          }
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [threadId, user]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs.length]);

  // Resolve signed URLs for image attachments
  useEffect(() => {
    const missing = msgs
      .filter((m) => m.attachment_url && !signedCache[m.attachment_url])
      .map((m) => m.attachment_url!) as string[];
    if (missing.length === 0) return;
    (async () => {
      const uniq = Array.from(new Set(missing));
      const entries: [string, string][] = [];
      for (const path of uniq) {
        const { data } = await supabase.storage.from("chat-attachments").createSignedUrl(path, 3600);
        if (data?.signedUrl) entries.push([path, data.signedUrl]);
      }
      if (entries.length) setSignedCache((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
    })();
  }, [msgs, signedCache]);

  const send = async (attachment?: { path: string; file: File }) => {
    if (!user || !thread) return;
    const text = body.trim();
    if (!text && !attachment) return;
    setSending(true);
    const isImage = attachment?.file.type.startsWith("image/");
    const { error } = await (supabase.from("dm_messages") as any).insert({
      thread_id: thread.id, sender_id: user.id,
      body: text || null,
      attachment_url: attachment?.path ?? null,
      attachment_name: attachment?.file.name ?? null,
      attachment_mime: attachment?.file.type ?? null,
      attachment_size: attachment?.file.size ?? null,
      kind: attachment ? (isImage ? "image" : "file") : "text",
    });
    setSending(false);
    if (error) { toast.error(error.message); return; }
    setBody("");
  };

  const upload = async (file: File) => {
    if (!user) return;
    if (file.size > 20 * 1024 * 1024) { toast.error("Max 20 MB"); return; }
    const safe = file.name.replace(/[^A-Za-z0-9._-]/g, "_");
    const path = `${user.id}/dm-${Date.now()}-${safe}`;
    const { error } = await supabase.storage.from("chat-attachments").upload(path, file, { contentType: file.type });
    if (error) { toast.error(error.message); return; }
    await send({ path, file });
  };


  const otherName = other?.display_name ?? other?.username ?? "User";

  return (
    <div className="flex flex-col h-[calc(100dvh-3.5rem)]">
      <div className="border-b border-white/5 px-4 py-3 flex items-center gap-3 bg-background/80 backdrop-blur">
        <Button size="icon" variant="ghost" onClick={() => nav({ to: "/app/friends" })}><ArrowLeft className="h-4 w-4" /></Button>
        <AvatarIconRender
          icon={other?.avatar_icon}
          gradient={other?.avatar_gradient}
          initial={otherName[0] ?? "?"}
          className="h-9 w-9 rounded-full grid place-items-center"
        />
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate">{otherName}</p>
          {other?.username && <p className="text-[11px] text-muted-foreground truncate">@{other.username}</p>}
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin">
        {msgs.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-16">
            Say hi to {otherName} 👋
          </div>
        )}
        {msgs.map((m, i) => {
          const mine = m.sender_id === user?.id;
          const prev = msgs[i - 1];
          const showTime = !prev || new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() > 5 * 60_000;
          const signed = m.attachment_url ? signedCache[m.attachment_url] : null;
          return (
            <div key={m.id} className={cn("flex flex-col", mine ? "items-end" : "items-start")}>
              {showTime && (
                <div className="text-[10px] text-muted-foreground my-1">
                  {new Date(m.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                </div>
              )}
              <div className={cn("group inline-flex items-start gap-1.5 max-w-[75%]", mine && "flex-row-reverse")}>
                <div className={cn("rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words",
                  mine ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-accent/60 rounded-tl-sm")}>
                  {m.attachment_url && (m.kind === "file" || (m.attachment_mime && !m.attachment_mime.startsWith("image/"))) ? (
                    <div className="mb-1">
                      <FileAttachment path={m.attachment_url} name={m.attachment_name} mime={m.attachment_mime} size={m.attachment_size} mine={mine} />
                    </div>
                  ) : m.attachment_url ? (
                    signed ? (
                      <a href={signed} target="_blank" rel="noreferrer">
                        <img src={signed} alt="attachment" className="mb-1 rounded-lg max-h-64" />
                      </a>
                    ) : (
                      <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <ImageIcon className="h-3.5 w-3.5" /> loading image…
                      </div>
                    )
                  ) : null}
                  {m.body && <MentionText text={m.body} meId={user?.id} />}
                </div>
                {!mine && (
                  <div className="opacity-0 group-hover:opacity-100 transition self-center">
                    <ReportButton targetType="dm_message" targetId={m.id} targetUserId={m.sender_id} size="xs" label="" />
                  </div>
                )}
              </div>
              <MessageReactions messageId={m.id} table="dm_message_reactions" align={mine ? "right" : "left"} />
            </div>
          );
        })}
      </div>

      <div
        className={cn("relative border-t border-white/5 p-3 flex gap-2", dragging && "bg-primary/10")}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault(); setDragging(false);
          const f = e.dataTransfer.files?.[0]; if (f) upload(f);
        }}
      >
        {dragging && (
          <div className="absolute inset-2 rounded-xl border-2 border-dashed border-primary/60 grid place-items-center pointer-events-none bg-background/80 z-10">
            <p className="text-sm text-primary font-semibold flex items-center gap-2">
              <ImageIcon className="h-4 w-4" /> Drop to send
            </p>
          </div>
        )}
        <input ref={fileRef} type="file"
          accept="image/*,application/pdf,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.currentTarget.value = ""; }} />
        <Button size="icon" variant="ghost" onClick={() => fileRef.current?.click()}><Paperclip className="h-4 w-4" /></Button>
        <textarea
          value={body} onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          onPaste={(e) => {
            const f = Array.from(e.clipboardData.files).find((x) => x.type.startsWith("image/"));
            if (f) { e.preventDefault(); upload(f); }
          }}
          placeholder={`Message ${otherName} — drop images or files, @mention friends`} rows={1}

          className="flex-1 resize-none rounded-xl bg-accent/40 border border-border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary max-h-32"
        />
        <Button onClick={() => send()} disabled={sending || !body.trim()} size="icon"><Send className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}
