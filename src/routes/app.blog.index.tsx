import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BookOpen, Loader2, PenLine, Plus, Sparkles, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/lib/use-role";
import { readingMinutes, type BlogPost } from "@/lib/blog";
import { ShareDialog } from "@/components/ShareDialog";

const GRADIENTS = [
  "from-amber-300 to-orange-500",
  "from-cyan-300 to-blue-500",
  "from-violet-400 to-fuchsia-500",
  "from-emerald-300 to-teal-500",
  "from-rose-300 to-pink-500",
];

export const Route = createFileRoute("/app/blog/")({
  head: () => ({
    meta: [
      { title: "Blog — ClassLab" },
      { name: "description", content: "Read ClassLab study guides, exam strategy and productivity articles." },
      { property: "og:title", content: "Blog — ClassLab" },
      { property: "og:description", content: "Read ClassLab study guides, exam strategy and productivity articles." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AppBlog,
});

function AppBlog() {
  const { isAdmin, loading: roleLoading } = useRole();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await (supabase as any)
      .from("blog_posts")
      .select("*")
      .order("updated_at", { ascending: false });
    setPosts((data ?? []) as BlogPost[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const remove = async (id: string) => {
    if (!confirm("Delete this article permanently?")) return;
    const { error } = await (supabase as any).from("blog_posts").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setPosts((p) => p.filter((x) => x.id !== id));
    toast.success("Article deleted");
  };

  if (roleLoading || loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  const visible = isAdmin ? posts : posts.filter((p) => p.status === "published");

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-amber-400/15 via-background to-background p-7 sm:p-9">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-amber-400/25 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative flex flex-wrap items-end gap-4">
          <div className="min-w-0 flex-1">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/30 bg-amber-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-300">
              <BookOpen className="h-3 w-3" /> ClassLab Journal
            </span>
            <h1 className="mt-4 font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
              Study guides that actually<br className="hidden sm:block" /> move your rank.
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Exam strategy, revision systems, focus science and campus stories — written by the
              ClassLab team and the students using it every day.
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={() => navigate({ to: "/app/blog/$postId", params: { postId: "new" } })}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-2 text-sm font-semibold text-black shadow-[0_10px_30px_-12px_rgba(245,190,60,0.9)]"
            >
              <Plus className="h-4 w-4" /> New article
            </button>
          )}
        </div>
      </section>

      {visible.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-sm text-muted-foreground">
          No articles published yet — the first guides are on the way.
        </p>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {visible.map((p, i) => (
            <article
              key={p.id}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition-colors hover:border-amber-300/30 hover:bg-white/[0.06]"
            >
              <Link to="/app/article/$slug" params={{ slug: p.slug }} className="block">
                {p.cover_url ? (
                  <img
                    src={p.cover_url}
                    alt={p.cover_alt ?? p.title}
                    loading="lazy"
                    className="h-36 w-full object-cover"
                  />
                ) : (
                  <div className={`flex h-36 w-full items-center justify-center bg-gradient-to-br ${GRADIENTS[i % GRADIENTS.length]}`}>
                    <Sparkles className="h-7 w-7 text-black/40" />
                  </div>
                )}
                <div className="p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    {isAdmin && (
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${p.status === "published" ? "bg-emerald-400/10 text-emerald-300" : "bg-white/10 text-muted-foreground"}`}>
                        {p.status}
                      </span>
                    )}
                    {(p.tags ?? []).slice(0, 2).map((t) => (
                      <span key={t} className="rounded-full bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-300">{t}</span>
                    ))}
                    <span className="text-[11px] text-muted-foreground">{readingMinutes(p.content)} min read</span>
                  </div>
                  <h2 className="mt-2 text-base font-semibold leading-snug group-hover:text-amber-200">{p.title}</h2>
                  {p.excerpt && <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{p.excerpt}</p>}
                </div>
              </Link>

              <div className="flex items-center gap-2 border-t border-white/5 px-4 py-2.5">
                {p.status === "published" && (
                  <ShareDialog url={`/blog/${p.slug}`} title={p.title} text={p.excerpt ?? undefined} className="h-8 rounded-full border-white/10 bg-transparent px-3 text-xs" />
                )}
                {p.status === "published" && (
                  <Link to="/blog/$slug" params={{ slug: p.slug }} className="rounded-full bg-white/5 p-2 hover:bg-white/10" aria-label="View public article page">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                )}
                {isAdmin && (
                  <>
                    <Link to="/app/blog/$postId" params={{ postId: p.id }} className="ml-auto rounded-full bg-white/5 p-2 hover:bg-white/10" aria-label="Edit article">
                      <PenLine className="h-3.5 w-3.5" />
                    </Link>
                    <button onClick={() => remove(p.id)} className="rounded-full bg-white/5 p-2 text-rose-300 hover:bg-white/10" aria-label="Delete article">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
