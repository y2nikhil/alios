import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Flame, Loader2, MessageSquare, Radio } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { parseBlocks, readingMinutes, type BlogPost } from "@/lib/blog";
import { BlogContent, TableOfContents } from "@/components/blog/BlogContent";
import { ShareDialog } from "@/components/ShareDialog";

type FeedPost = { id: string; title: string; up_count: number; comment_count: number };
type LiveParty = { id: string; title: string | null; poster_url: string | null; media_kind: string | null; is_playing: boolean | null };

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
  const [related, setRelated] = useState<BlogPost[]>([]);
  const [feedPosts, setFeedPosts] = useState<FeedPost[]>([]);
  const [parties, setParties] = useState<LiveParty[]>([]);
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

      const [moreRes, feedRes, partiesRes] = await Promise.all([
        (supabase as any)
          .from("blog_posts")
          .select("id,slug,title,excerpt,content,published_at,created_at")
          .eq("status", "published")
          .neq("slug", slug)
          .order("published_at", { ascending: false })
          .limit(5),
        supabase.from("posts").select("id,title,up_count,comment_count").order("up_count", { ascending: false }).limit(5),
        supabase
          .from("watch_parties")
          .select("id,title,poster_url,media_kind,visibility,is_playing")
          .eq("visibility", "public")
          .is("ended_at", null)
          .limit(4),
      ]);
      if (cancelled) return;
      setRelated((moreRes?.data ?? []) as BlogPost[]);
      setFeedPosts((feedRes?.data ?? []) as FeedPost[]);
      setParties((partiesRes?.data ?? []) as LiveParty[]);
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

  const { toc } = parseBlocks(post.content);
  const published = post.published_at ?? post.created_at;

  return (
    <div className="w-full px-4 py-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-[1600px] gap-8 lg:grid-cols-[210px_minmax(0,1fr)_300px]">
        {/* LEFT — table of contents */}
        <aside className="hidden lg:block">
          <div className="sticky top-6 space-y-4">
            {post.show_toc && <TableOfContents toc={toc} variant="sidebar" />}
            <Link to="/app/blog" className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-amber-200">
              <ArrowLeft className="h-3.5 w-3.5" /> All articles
            </Link>
          </div>
        </aside>

        {/* CENTER — article */}
        <main className="min-w-0">
          <div className="flex items-center justify-between gap-3">
            <Link to="/app/blog" className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground lg:invisible">
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

            {post.show_toc && (
              <div className="lg:hidden">
                <TableOfContents toc={toc} />
              </div>
            )}

            <div className="mt-6">
              <BlogContent markdown={post.content} />
            </div>
          </article>

          {related.length > 0 && (
            <section className="mt-12">
              <h2 className="text-lg font-semibold">Keep reading</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                {related.slice(0, 3).map((r) => (
                  <Link key={r.id} to="/app/article/$slug" params={{ slug: r.slug }} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 hover:border-white/20">
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{readingMinutes(r.content ?? "")} min read</p>
                    <p className="mt-1.5 text-sm font-semibold leading-snug">{r.title}</p>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </main>

        {/* RIGHT — trending + feed */}
        <aside className="min-w-0">
          <div className="space-y-5 lg:sticky lg:top-6">
            {related.length > 0 && (
              <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-amber-300">
                  <Flame className="h-3.5 w-3.5" /> Trending articles
                </h2>
                <ul className="mt-3 space-y-3">
                  {related.map((r) => (
                    <li key={r.id}>
                      <Link to="/app/article/$slug" params={{ slug: r.slug }} className="block hover:text-amber-200">
                        <p className="text-[13px] font-semibold leading-snug">{r.title}</p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">{readingMinutes(r.content ?? "")} min read</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {feedPosts.length > 0 && (
              <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-amber-300">
                  <MessageSquare className="h-3.5 w-3.5" /> From the student feed
                </h2>
                <ul className="mt-3 space-y-3">
                  {feedPosts.map((p) => (
                    <li key={p.id}>
                      <Link to="/app/post/$postId" params={{ postId: p.id }} className="block hover:text-amber-200">
                        <p className="text-[13px] font-semibold leading-snug">{p.title}</p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">{p.up_count ?? 0} upvotes · {p.comment_count ?? 0} comments</p>
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link to="/app/feed" className="mt-3 inline-block text-[12px] font-semibold text-amber-300 hover:underline">Open the feed →</Link>
              </section>
            )}
          </div>
        </aside>
      </div>

      {parties.length > 0 && (
        <section className="mx-auto mt-12 w-full max-w-[1600px]">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Radio className="h-4 w-4 text-amber-300" /> Live study rooms right now
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {parties.map((pt) => (
              <Link key={pt.id} to="/app/hangout/$partyId" params={{ partyId: pt.id }} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] hover:border-amber-300/30">
                {pt.poster_url ? (
                  <img src={pt.poster_url} alt={pt.title ?? "Live room"} loading="lazy" className="h-28 w-full object-cover" />
                ) : (
                  <div className="h-28 w-full bg-gradient-to-br from-amber-300/25 to-orange-500/20" />
                )}
                <div className="p-4">
                  <p className="text-sm font-semibold leading-snug">{pt.title ?? "Study room"}</p>
                  <p className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                    {pt.is_playing ? "Playing now" : "Live"} · {pt.media_kind ?? "video"}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

