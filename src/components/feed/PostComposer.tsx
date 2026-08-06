import { useRef, useState } from "react";
import { FileText, HelpCircle, ImagePlus, Link2, Loader2, Network, Paperclip, PenLine, Plus, Send, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { POST_TAGS, uploadPostMedia } from "@/lib/feed";
import { cn } from "@/lib/utils";

const QUICK_TYPES: { label: string; icon: typeof PenLine; tag?: string; attach?: boolean }[] = [
  { label: "Post", icon: PenLine },
  { label: "Question", icon: HelpCircle, tag: "General" },
  { label: "Image", icon: ImagePlus, attach: true },
  { label: "Note", icon: FileText, tag: "Resources" },
  { label: "Mind Map", icon: Network, tag: "Study Tips" },
  { label: "Link", icon: Link2 },
];


export function PostComposer({ onCreated }: { onCreated?: () => void }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaKind, setMediaKind] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [tag, setTag] = useState(POST_TAGS[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const guessKind = (url: string) => {
    if (!url) return null;
    if (/\.(png|jpe?g|gif|webp|avif|svg)(\?|$)/i.test(url)) return "image";
    if (/\.(mp4|webm|mov)(\?|$)/i.test(url)) return "video";
    return "link";
  };

  const pickFile = async (file?: File | null) => {
    if (!file || !user) return;
    if (file.size > 50 * 1024 * 1024) { setError("File must be under 50 MB"); return; }
    setError(null);
    setUploading(true);
    try {
      const { url, kind } = await uploadPostMedia(user.id, file);
      setMediaUrl(url);
      setMediaKind(kind);
      setFileName(file.name);
    } catch (e: any) {
      setError(e?.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const clearMedia = () => { setMediaUrl(""); setMediaKind(null); setFileName(null); };

  const submit = async () => {
    if (!user || !title.trim()) return;
    setSaving(true);
    setError(null);
    const { error } = await supabase.from("posts").insert({
      author_id: user.id,
      title: title.trim(),
      body: body.trim() || null,
      media_url: mediaUrl.trim() || null,
      media_kind: mediaKind ?? guessKind(mediaUrl.trim()),
      tag,
    } as any);
    setSaving(false);
    if (error) { setError(error.message); return; }
    setTitle(""); setBody(""); clearMedia(); setOpen(false);
    onCreated?.();
  };

  if (!open) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
        <button
          onClick={() => setOpen(true)}
          className="w-full rounded-xl px-2 py-2 text-left text-sm text-muted-foreground hover:text-foreground"
        >
          What&apos;s on your mind?
        </button>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {QUICK_TYPES.map((q) => (
            <button
              key={q.label}
              onClick={() => {
                setTag(q.tag ?? POST_TAGS[0]);
                setOpen(true);
                if (q.attach) setTimeout(() => fileRef.current?.click(), 100);
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-white/10 hover:text-foreground"
            >
              <q.icon className="h-3.5 w-3.5" /> {q.label}
            </button>
          ))}
          <button
            onClick={() => setOpen(true)}
            className="ml-auto rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-1.5 text-xs font-semibold text-black"
          >
            Post
          </button>
        </div>
      </div>
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

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={(e) => { pickFile(e.target.files?.[0]); e.target.value = ""; }}
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-white/10 hover:text-foreground disabled:opacity-50"
        >
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Paperclip className="h-3.5 w-3.5" />}
          {uploading ? "Uploading…" : "Attach photo / video"}
        </button>
        {fileName && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-3 py-1.5 text-xs text-emerald-300">
            {fileName}
            <button onClick={clearMedia} aria-label="Remove attachment"><X className="h-3 w-3" /></button>
          </span>
        )}
      </div>

      {mediaUrl && mediaKind === "image" && (
        <img src={mediaUrl} alt="Attachment preview" className="max-h-64 w-full rounded-xl border border-white/10 object-cover" />
      )}
      {mediaUrl && mediaKind === "video" && (
        <video src={mediaUrl} controls className="max-h-64 w-full rounded-xl border border-white/10 bg-black" />
      )}

      {!fileName && (
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
          <ImagePlus className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            value={mediaUrl}
            onChange={(e) => { setMediaUrl(e.target.value); setMediaKind(guessKind(e.target.value)); }}
            placeholder="…or paste an image / video / link URL"
            className="flex-1 min-w-0 bg-transparent text-sm outline-none"
          />
        </div>
      )}

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
        disabled={!title.trim() || saving || uploading}
        className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Post
      </button>
    </div>
  );
}
