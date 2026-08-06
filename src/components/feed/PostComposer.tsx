import { useState } from "react";
import { ImagePlus, Loader2, Send, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { POST_TAGS } from "@/lib/feed";
import { cn } from "@/lib/utils";

export function PostComposer({ onCreated }: { onCreated?: () => void }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [tag, setTag] = useState(POST_TAGS[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const guessKind = (url: string) => {
    if (!url) return null;
    if (/\.(png|jpe?g|gif|webp|avif|svg)(\?|$)/i.test(url)) return "image";
    if (/\.(mp4|webm|mov)(\?|$)/i.test(url)) return "video";
    return "link";
  };

  const submit = async () => {
    if (!user || !title.trim()) return;
    setSaving(true);
    setError(null);
    const { error } = await supabase.from("posts").insert({
      author_id: user.id,
      title: title.trim(),
      body: body.trim() || null,
      media_url: mediaUrl.trim() || null,
      media_kind: guessKind(mediaUrl.trim()),
      tag,
    } as any);
    setSaving(false);
    if (error) { setError(error.message); return; }
    setTitle(""); setBody(""); setMediaUrl(""); setOpen(false);
    onCreated?.();
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left text-sm text-muted-foreground hover:border-white/20 hover:bg-white/[0.06] transition"
      >
        Share something with the campus…
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 space-y-3">
      <div className="flex items-center gap-2">
        <p className="text-sm font-semibold">New post</p>
        <button onClick={() => setOpen(false)} aria-label="Close composer" className="ml-auto h-7 w-7 grid place-items-center rounded-md text-muted-foreground hover:bg-white/10">
          <X className="h-4 w-4" />
        </button>
      </div>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-white/25"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={4}
        placeholder="Text (optional)"
        className="w-full resize-y rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-white/25"
      />
      <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
        <ImagePlus className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          value={mediaUrl}
          onChange={(e) => setMediaUrl(e.target.value)}
          placeholder="Image / video / link URL (optional)"
          className="flex-1 min-w-0 bg-transparent text-sm outline-none"
        />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {POST_TAGS.map((t) => (
          <button
            key={t}
            onClick={() => setTag(t)}
            className={cn(
              "rounded-full px-2.5 py-1 text-[11px] font-semibold transition",
              tag === t ? "bg-amber-400/20 text-amber-200" : "bg-white/5 text-muted-foreground hover:bg-white/10",
            )}
          >
            {t}
          </button>
        ))}
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <button
        onClick={submit}
        disabled={!title.trim() || saving}
        className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Post
      </button>
    </div>
  );
}
