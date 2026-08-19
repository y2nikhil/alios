import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { parseBlocks, readingMinutes, type BlogPost } from "@/lib/blog";
import { BlogContent, TableOfContents } from "@/components/blog/BlogContent";
import { ShareDialog } from "@/components/ShareDialog";

export const Route = createFileRoute("/app/article/$slug")({
  head: () => ({
    meta: [
      { title: "Article — ClassLab Blog" },
      { name: "description", content: "Read a ClassLab study guide inside the app." },
      { property: "og:title", content: "Article — ClassLab Blog" },
      { property: "og:description", content: "Read a ClassLab study guide inside the app." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InAppArticle,
});

function InAppArticle() {
  const { slug } = Route.useParams();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await (supabase as any)
        .from("blog_posts")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (cancelled) return;
      setPost((data ?? null) as BlogPost | null);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [slug]);

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  if (!post) {
    return (
      <div className="mx-auto max-w-lg py-20 text-center">
        <h1 className="text-xl font-bold">Article not found</h1>
        <Link to="/app/blog" className="mt-5 inline-block rounded-full bg-white/5 px-5 py-2.5 text-sm font-semibold hover:bg-white/10">Back to the blog</Link>
      </div>
    );
  }

  const { blocks, toc } = parseBlocks(post.content);
  const published = post.published_at ?? post.created_at;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <div className="flex items-center justify-between gap-3">
        <Link to="/app/blog" className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> All articles
        </Link>
        <ShareDialog url={`/blog/${post.slug}`} title={post.title} text={post.excerpt ?? undefined} />
      </div>

      <article className="mt-5">
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {post.tags.map((t) => (
              <span key={t} className="rounded-full bg-amber-400/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-300">{t}</span>
            ))}
          </div>
        )}
        <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight">{post.title}</h1>
        {post.excerpt && <p className="mt-3 text-base leading-relaxed text-muted-foreground">{post.excerpt}</p>}
        <p className="mt-3 text-xs text-muted-foreground">
          ClassLab Team · <time dateTime={published}>{new Date(published).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}</time> · {readingMinutes(post.content)} min read
        </p>

        {post.cover_url && (
          <img src={post.cover_url} alt={post.cover_alt ?? post.title} className="mt-6 w-full rounded-2xl border border-white/10 object-cover" />
        )}

        {post.show_toc && <TableOfContents toc={toc} />}

        <div className="mt-6">
          <BlogContent blocks={blocks} />
        </div>
      </article>
    </div>
  );
}
