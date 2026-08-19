import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, PenLine, Plus, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/lib/use-role";
import { readingMinutes, type BlogPost } from "@/lib/blog";

export const Route = createFileRoute("/app/blog/")({
  head: () => ({
    meta: [
      { title: "Blog studio — ClassLab" },
      { name: "description", content: "Write, edit and publish SEO-optimised ClassLab articles." },
      { property: "og:title", content: "Blog studio — ClassLab" },
      { property: "og:description", content: "Write, edit and publish SEO-optimised ClassLab articles." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BlogStudio,
});

function BlogStudio() {
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

  useEffect(() => {
    load();
  }, []);

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

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-lg py-20 text-center">
        <h1 className="text-xl font-bold">Blog studio</h1>
        <p className="mt-2 text-sm text-muted-foreground">Only admins and super admins can write ClassLab articles.</p>
        <Link to="/blog" className="mt-5 inline-block rounded-full bg-white/5 px-5 py-2.5 text-sm font-semibold hover:bg-white/10">Read the blog</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-1 py-6">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Blog studio</h1>
          <p className="text-sm text-muted-foreground">Write SEO-ready articles that rank and bring students to ClassLab.</p>
        </div>
        <button
          onClick={() => navigate({ to: "/app/blog/$postId", params: { postId: "new" } })}
          className="ml-auto inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-2 text-sm font-semibold text-black"
        >
          <Plus className="h-4 w-4" /> New article
        </button>
      </div>

      {posts.length === 0 ? (
        <p className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-sm text-muted-foreground">
          No articles yet. Publish your first guide — long, specific, genuinely useful posts rank best.
        </p>
      ) : (
        <div className="mt-6 space-y-3">
          {posts.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${p.status === "published" ? "bg-emerald-400/10 text-emerald-300" : "bg-white/10 text-muted-foreground"}`}>
                    {p.status}
                  </span>
                  <span className="text-[11px] text-muted-foreground">{readingMinutes(p.content)} min · /blog/{p.slug}</span>
                </div>
                <p className="mt-1 truncate text-sm font-semibold">{p.title}</p>
              </div>
              {p.status === "published" && (
                <Link to="/blog/$slug" params={{ slug: p.slug }} className="rounded-full bg-white/5 p-2 hover:bg-white/10" aria-label="View live article">
                  <ExternalLink className="h-4 w-4" />
                </Link>
              )}
              <Link to="/app/blog/$postId" params={{ postId: p.id }} className="rounded-full bg-white/5 p-2 hover:bg-white/10" aria-label="Edit article">
                <PenLine className="h-4 w-4" />
              </Link>
              <button onClick={() => remove(p.id)} className="rounded-full bg-white/5 p-2 text-rose-300 hover:bg-white/10" aria-label="Delete article">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
