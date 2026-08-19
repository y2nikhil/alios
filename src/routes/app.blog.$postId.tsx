import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bold, Italic, Heading1, Heading2, Heading3, Heading4, List, ListOrdered,
  Quote, LinkIcon, ImagePlus, Minus, Loader2, Save, Eye, Send,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useRole } from "@/lib/use-role";
import { uploadPostMedia } from "@/lib/feed";
import { parseBlocks, plainText, readingMinutes, slugify, type BlogPost } from "@/lib/blog";
import { BlogContent, TableOfContents } from "@/components/blog/BlogContent";

export const Route = createFileRoute("/app/blog/$postId")({
  head: () => ({
    meta: [
      { title: "Article editor — ClassLab" },
      { name: "description", content: "Compose and optimise a ClassLab blog article with headings, images and SEO metadata." },
      { property: "og:title", content: "Article editor — ClassLab" },
      { property: "og:description", content: "Compose and optimise a ClassLab blog article with headings, images and SEO metadata." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BlogEditor,
});

const INTERNAL_LINKS = [
  { label: "Student feed", path: "/feed" },
  { label: "Blog home", path: "/blog" },
  { label: "About ClassLab", path: "/about" },
  { label: "Exam prep", path: "/exam-prep" },
  { label: "JEE hub", path: "/exams/jee" },
  { label: "Study groups", path: "/study-groups" },
  { label: "Notes sharing", path: "/notes-sharing" },
  { label: "Watch party", path: "/watch-party" },
  { label: "AI study assistant", path: "/ai-study-assistant" },
  { label: "Sign up", path: "/signup" },
];

function BlogEditor() {
  const { postId } = Route.useParams();
  const isNew = postId === "new";
  const { user } = useAuth();
  const { isAdmin, loading: roleLoading } = useRole();
  const navigate = useNavigate();
  const taRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [coverAlt, setCoverAlt] = useState("");
  const [showToc, setShowToc] = useState(true);
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDesc, setSeoDesc] = useState("");
  const [keywords, setKeywords] = useState("");
  const [status, setStatus] = useState("draft");

  useEffect(() => {
    if (isNew) return;
    (async () => {
      const { data } = await (supabase as any).from("blog_posts").select("*").eq("id", postId).maybeSingle();
      const p = data as BlogPost | null;
      if (p) {
        setTitle(p.title); setSlug(p.slug); setSlugTouched(true);
        setExcerpt(p.excerpt ?? ""); setContent(p.content ?? "");
        setTags((p.tags ?? []).join(", "));
        setCoverUrl(p.cover_url ?? ""); setCoverAlt(p.cover_alt ?? "");
        setShowToc(p.show_toc); setSeoTitle(p.seo_title ?? ""); setSeoDesc(p.seo_description ?? "");
        setKeywords(p.keywords ?? ""); setStatus(p.status);
      }
      setLoading(false);
    })();
  }, [postId, isNew]);

  useEffect(() => {
    if (!slugTouched) setSlug(slugify(title));
  }, [title, slugTouched]);

  const parsed = useMemo(() => parseBlocks(content), [content]);

  const insert = (before: string, after = "", placeholder = "") => {
    const ta = taRef.current;
    if (!ta) return;
    const start = ta.selectionStart, end = ta.selectionEnd;
    const sel = content.slice(start, end) || placeholder;
    const next = content.slice(0, start) + before + sel + after + content.slice(end);
    setContent(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + before.length, start + before.length + sel.length);
    });
  };

  const insertBlock = (text: string) => {
    const ta = taRef.current;
    const pos = ta?.selectionStart ?? content.length;
    const pre = content.slice(0, pos);
    const prefix = pre.length === 0 || pre.endsWith("\n\n") ? "" : pre.endsWith("\n") ? "\n" : "\n\n";
    setContent(pre + prefix + text + "\n\n" + content.slice(pos));
  };

  const onUploadImage = async (file: File, asCover: boolean) => {
    if (!user) return;
    try {
      const { url } = await uploadPostMedia(user.id, file);
      if (asCover) {
        setCoverUrl(url);
        toast.success("Cover uploaded — add descriptive alt text");
      } else {
        const alt = prompt("Alt text for this image (describe it for search engines and screen readers):") ?? "";
        insertBlock(`![${alt}](${url})`);
        toast.success("Image inserted");
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Upload failed");
    }
  };

  const save = async (publish?: boolean) => {
    if (!user) return;
    if (!title.trim()) return toast.error("Give the article a title");
    if (!slug.trim()) return toast.error("Give the article a URL slug");
    setSaving(true);
    const nextStatus = publish === undefined ? status : publish ? "published" : "draft";
    const payload: Record<string, unknown> = {
      title: title.trim(),
      slug: slugify(slug),
      excerpt: excerpt.trim() || plainText(content).slice(0, 200),
      content,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      cover_url: coverUrl.trim() || null,
      cover_alt: coverAlt.trim() || null,
      show_toc: showToc,
      seo_title: seoTitle.trim() || null,
      seo_description: seoDesc.trim() || null,
      keywords: keywords.trim() || null,
      status: nextStatus,
      author_id: user.id,
      updated_at: new Date().toISOString(),
    };
    if (nextStatus === "published") payload.published_at = new Date().toISOString();

    if (isNew) {
      const { data, error } = await (supabase as any).from("blog_posts").insert(payload).select("id").single();
      setSaving(false);
      if (error) return toast.error(error.message);
      toast.success(nextStatus === "published" ? "Article published" : "Draft saved");
      navigate({ to: "/app/blog/$postId", params: { postId: data.id } });
    } else {
      const { error } = await (supabase as any).from("blog_posts").update(payload).eq("id", postId);
      setSaving(false);
      if (error) return toast.error(error.message);
      setStatus(nextStatus);
      toast.success(nextStatus === "published" ? "Article published" : "Saved");
    }
  };

  if (roleLoading || loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }
  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-lg py-20 text-center">
        <h1 className="text-xl font-bold">Article editor</h1>
        <p className="mt-2 text-sm text-muted-foreground">Only admins and super admins can write ClassLab articles.</p>
      </div>
    );
  }

  const titleLen = (seoTitle || `${title} | ClassLab Blog`).length;
  const descLen = (seoDesc || excerpt).length;

  const tools: { icon: any; label: string; run: () => void }[] = [
    { icon: Heading1, label: "Heading 1", run: () => insertBlock("# Heading") },
    { icon: Heading2, label: "Heading 2", run: () => insertBlock("## Heading") },
    { icon: Heading3, label: "Heading 3", run: () => insertBlock("### Heading") },
    { icon: Heading4, label: "Heading 4", run: () => insertBlock("#### Heading") },
    { icon: Bold, label: "Bold", run: () => insert("**", "**", "bold text") },
    { icon: Italic, label: "Italic", run: () => insert("*", "*", "italic text") },
    { icon: List, label: "Bullet list", run: () => insertBlock("- First point\n- Second point") },
    { icon: ListOrdered, label: "Numbered list", run: () => insertBlock("1. First step\n2. Second step") },
    { icon: Quote, label: "Quote", run: () => insertBlock("> Key takeaway") },
    { icon: Minus, label: "Divider", run: () => insertBlock("---") },
    {
      icon: LinkIcon,
      label: "Link",
      run: () => {
        const href = prompt("Link URL (internal path like /feed, or a full https:// URL):") ?? "";
        if (href) insert("[", `](${href})`, "link text");
      },
    },
    { icon: ImagePlus, label: "Insert image", run: () => fileRef.current?.click() },
  ];

  return (
    <div className="mx-auto w-full max-w-5xl px-1 py-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/app/blog" className="text-xs text-muted-foreground hover:underline">← Blog studio</Link>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button onClick={() => setPreview((v) => !v)} className="inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-sm font-semibold hover:bg-white/10">
            <Eye className="h-4 w-4" /> {preview ? "Edit" : "Preview"}
          </button>
          <button disabled={saving} onClick={() => save(false)} className="inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-sm font-semibold hover:bg-white/10">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save draft
          </button>
          <button disabled={saving} onClick={() => save(true)} className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-2 text-sm font-semibold text-black">
            <Send className="h-4 w-4" /> Publish
          </button>
        </div>
      </div>

      <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onUploadImage(f, false); e.target.value = ""; }} />
      <input ref={coverRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onUploadImage(f, true); e.target.value = ""; }} />

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Article title — put the main keyword near the front"
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-lg font-semibold outline-none focus:border-amber-400/40"
          />
          <textarea
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            rows={2}
            placeholder="Short summary shown on the blog list and in search results"
            className="mt-3 w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm outline-none focus:border-amber-400/40"
          />

          {preview ? (
            <article className="mt-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
              {coverUrl && <img src={coverUrl} alt={coverAlt || title} className="mb-5 w-full rounded-xl object-cover" />}
              <h1 className="text-3xl font-bold leading-tight">{title || "Untitled article"}</h1>
              {showToc && <TableOfContents toc={parsed.toc} />}
              <div className="mt-4"><BlogContent blocks={parsed.blocks} /></div>
            </article>
          ) : (
            <>
              <div className="mt-4 flex flex-wrap gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-2">
                {tools.map((t) => (
                  <button key={t.label} type="button" onClick={t.run} title={t.label} aria-label={t.label} className="rounded-lg p-2 text-muted-foreground hover:bg-white/10 hover:text-foreground">
                    <t.icon className="h-4 w-4" />
                  </button>
                ))}
                <select
                  onChange={(e) => { const v = e.target.value; if (v) { const l = INTERNAL_LINKS.find((x) => x.path === v)!; insert("[", `](${l.path})`, l.label); e.target.value = ""; } }}
                  className="ml-auto rounded-lg bg-white/5 px-2 py-1.5 text-xs outline-none"
                  aria-label="Insert internal link"
                >
                  <option value="">Link to a ClassLab page…</option>
                  {INTERNAL_LINKS.map((l) => <option key={l.path} value={l.path}>{l.label}</option>)}
                </select>
              </div>
              <textarea
                ref={taRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={26}
                placeholder={"## Start with the reader's problem\n\nWrite in short paragraphs. Use ## and ### headings so the table of contents builds itself.\n\n- Concrete tips\n- Real numbers\n\n![alt text describing the image](image-url)"}
                className="mt-3 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 font-mono text-[13px] leading-6 outline-none focus:border-amber-400/40"
              />
              <p className="mt-2 text-[11px] text-muted-foreground">
                {plainText(content).split(/\s+/).filter(Boolean).length} words · {readingMinutes(content)} min read · {parsed.toc.length} headings
              </p>
            </>
          )}
        </div>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <h2 className="text-sm font-semibold">Publishing</h2>
            <label className="mt-3 block text-[11px] uppercase tracking-wider text-muted-foreground">URL slug</label>
            <input value={slug} onChange={(e) => { setSlugTouched(true); setSlug(e.target.value); }} className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs outline-none" />
            <p className="mt-1 text-[10px] text-muted-foreground">classlab.in/blog/{slugify(slug) || "your-slug"}</p>
            <label className="mt-3 block text-[11px] uppercase tracking-wider text-muted-foreground">Tags (comma separated)</label>
            <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="JEE, Study tips" className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs outline-none" />
            <label className="mt-3 flex items-center gap-2 text-xs">
              <input type="checkbox" checked={showToc} onChange={(e) => setShowToc(e.target.checked)} /> Show table of contents
            </label>
            <p className="mt-3 text-[11px] text-muted-foreground">Status: <span className="font-semibold text-foreground">{status}</span></p>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <h2 className="text-sm font-semibold">Cover image</h2>
            {coverUrl && <img src={coverUrl} alt={coverAlt || "Cover preview"} className="mt-3 h-28 w-full rounded-lg object-cover" />}
            <button onClick={() => coverRef.current?.click()} className="mt-3 w-full rounded-lg bg-white/5 px-3 py-2 text-xs font-semibold hover:bg-white/10">Upload cover</button>
            <input value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder="or paste an image URL" className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs outline-none" />
            <input value={coverAlt} onChange={(e) => setCoverAlt(e.target.value)} placeholder="Alt text (required for SEO)" className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs outline-none" />
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <h2 className="text-sm font-semibold">SEO</h2>
            <label className="mt-3 block text-[11px] uppercase tracking-wider text-muted-foreground">Meta title <span className={titleLen > 60 ? "text-rose-300" : "text-emerald-300"}>{titleLen}/60</span></label>
            <input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} placeholder={`${title} | ClassLab Blog`} className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs outline-none" />
            <label className="mt-3 block text-[11px] uppercase tracking-wider text-muted-foreground">Meta description <span className={descLen > 158 ? "text-rose-300" : "text-emerald-300"}>{descLen}/158</span></label>
            <textarea value={seoDesc} onChange={(e) => setSeoDesc(e.target.value)} rows={3} placeholder="Falls back to the excerpt" className="mt-1 w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs outline-none" />
            <label className="mt-3 block text-[11px] uppercase tracking-wider text-muted-foreground">Keywords</label>
            <input value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="jee preparation, study plan" className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs outline-none" />
          </section>
        </aside>
      </div>
    </div>
  );
}
