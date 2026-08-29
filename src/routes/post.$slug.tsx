import { createFileRoute, Link, notFound, redirect } from "@tanstack/react-router";
import { JoinLink } from "@/components/JoinLink";
import { ArrowLeft, Flame, MessageSquare, Radio, ThumbsUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { readingTime, timeAgo, upvotePct } from "@/lib/feed";
import { SiteFooter } from "@/components/SiteFooter";
import type { PublicPost } from "@/routes/feed";

type PublicComment = {
  id: string;
  post_id: string;
  parent_id: string | null;
  body: string;
  up_count: number;
  down_count: number;
  created_at: string;
  author_id: string;
  author_name: string | null;
  author_username: string | null;
};

type BlogCard = { id: string; slug: string; title: string; excerpt: string | null };

type LiveParty = {
  id: string;
  title: string | null;
  poster_url: string | null;
  media_kind: string | null;
  is_playing: boolean | null;
};

const THREAD_COLORS = ["#f97316", "#22c55e", "#38bdf8", "#a855f7", "#ef4444", "#eab308", "#ec4899"];

export const Route = createFileRoute("/post/$slug")({
  loader: async ({ params }) => {
    const { data } = await (supabase as any).rpc("public_post_by_slug", { _slug: params.slug });
    const post = (data ?? [])[0] as PublicPost | undefined;
    if (!post) {
      // Legacy URL (old slug with a random id suffix) — permanently forward to the clean one.
      const { data: alias } = await (supabase as any).rpc("public_post_slug_alias", { _slug: params.slug });
      if (alias && alias !== params.slug) {
        throw redirect({ to: "/post/$slug", params: { slug: alias as string }, statusCode: 301 });
      }
      throw notFound();
    }
    const [csRes, moreRes, blogRes, partiesRes] = await Promise.all([
      (supabase as any).rpc("public_post_comments", { _post_id: post.id }),
      (supabase as any).rpc("public_posts", { _limit: 8, _offset: 0 }),
      (supabase as any)
        .from("blog_posts")
        .select("id,slug,title,excerpt")
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(5),
      supabase
        .from("watch_parties")
        .select("id,title,poster_url,media_kind,visibility,is_playing")
        .eq("visibility", "public")
        .is("ended_at", null)
        .limit(4),
    ]);
    const more = ((moreRes?.data ?? []) as PublicPost[]).filter((p) => p.id !== post.id).slice(0, 6);
    return {
      post,
      comments: (csRes?.data ?? []) as PublicComment[],
      morePosts: more,
      articles: (blogRes?.data ?? []) as BlogCard[],
      parties: (partiesRes?.data ?? []) as LiveParty[],
    };
  },

  head: ({ params, loaderData }) => {
    const url = `https://classlab.in/post/${params.slug}`;
    if (!loaderData) {
      return {
        meta: [{ title: "Discussion unavailable | ClassLab" }, { name: "robots", content: "noindex" }],
      };
    }
    const post = loaderData.post as PublicPost;
    const desc = (post.body ?? post.title).replace(/\s+/g, " ").slice(0, 155);
    const author = post.author_name ?? post.author_username ?? "ClassLab student";
    const meta: { title?: string; name?: string; property?: string; content?: string }[] = [
      { title: `${post.title} | ClassLab Student Feed` },
      { name: "description", content: desc },
      { property: "og:title", content: post.title },
      { property: "og:description", content: desc },
      { property: "og:type", content: "article" },
      { property: "og:url", content: url },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: post.title },
      { name: "twitter:description", content: desc },
    ];
    if (post.media_kind === "image" && post.media_url?.startsWith("https://")) {
      meta.push({ property: "og:image", content: post.media_url });
      meta.push({ name: "twitter:image", content: post.media_url });
    }
    return {
      meta,
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "DiscussionForumPosting",
                headline: post.title,
                articleBody: post.body ?? post.title,
                url,
                datePublished: post.created_at,
                author: { "@type": "Person", name: author },
                interactionStatistic: [
                  { "@type": "InteractionCounter", interactionType: "https://schema.org/LikeAction", userInteractionCount: post.up_count },
                  { "@type": "InteractionCounter", interactionType: "https://schema.org/CommentAction", userInteractionCount: post.comment_count },
                ],
                comment: (loaderData.comments as PublicComment[]).slice(0, 20).map((c) => ({
                  "@type": "Comment",
                  text: c.body,
                  datePublished: c.created_at,
                  author: { "@type": "Person", name: c.author_name ?? c.author_username ?? "ClassLab student" },
                })),
                isPartOf: { "@type": "WebSite", name: "ClassLab", url: "https://classlab.in" },
              },
              {
                "@type": "BreadcrumbList",
                itemListElement: [
                  { "@type": "ListItem", position: 1, name: "ClassLab", item: "https://classlab.in" },
                  { "@type": "ListItem", position: 2, name: "Student Feed", item: "https://classlab.in/feed" },
                  { "@type": "ListItem", position: 3, name: post.title, item: url },
                ],
              },
            ],
          }),
        },
      ],
    };
  },
  notFoundComponent: PostNotFound,
  component: PublicPostPage,
});

function PostNotFound() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-24 text-center">
      <h1 className="text-2xl font-bold">Discussion not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">This post may have been removed by its author or a moderator.</p>
      <Link to="/feed" className="mt-6 inline-block rounded-full bg-white/5 px-5 py-2.5 text-sm font-semibold hover:bg-white/10">Back to the feed</Link>
    </main>
  );
}

function CommentList({ comments, parentId = null, depth = 0 }: { comments: PublicComment[]; parentId?: string | null; depth?: number }) {
  const children = comments.filter((c) => c.parent_id === parentId);
  if (children.length === 0) return null;
  return (
    <div className={depth > 0 ? "mt-2" : "mt-3 space-y-3"}>
      {children.map((c) => {
        const pct = upvotePct(c.up_count, c.down_count);
        return (
          <div
            key={c.id}
            className="pl-3"
            style={{ borderLeft: `2px solid ${THREAD_COLORS[depth % THREAD_COLORS.length]}`, marginLeft: depth > 0 ? 4 : 0 }}
          >
            <div className="py-1.5">
              <p className="text-[11px] text-muted-foreground">
                <span className="font-medium text-foreground/90">{c.author_name ?? c.author_username ?? "Student"}</span> · {timeAgo(c.created_at)}
                {pct !== null && <> · {pct}% helpful</>}
              </p>
              <RichText text={c.body} className="mt-1" />
            </div>
            <CommentList comments={comments} parentId={c.id} depth={depth + 1} />
          </div>
        );
      })}
    </div>
  );
}

export function FeedSideRail({
  posts,
  articles,
  title = "Trending discussions",
}: {
  posts: PublicPost[];
  articles: BlogCard[];
  title?: string;
}) {
  return (
    <div className="lg:sticky lg:top-6 lg:space-y-5 space-y-5">
      {posts.length > 0 && (
        <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-amber-300">
            <Flame className="h-3.5 w-3.5" /> {title}
          </h2>
          <ul className="mt-3 space-y-3">
            {posts.slice(0, 6).map((p) => (
              <li key={p.id}>
                <Link to="/post/$slug" params={{ slug: p.slug ?? p.id }} className="block hover:text-amber-200">
                  <p className="text-[13px] font-semibold leading-snug">{p.title}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {p.up_count ?? 0} upvotes · {p.comment_count ?? 0} comments
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {articles.length > 0 && (
        <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-amber-300">
            <MessageSquare className="h-3.5 w-3.5" /> From the ClassLab blog
          </h2>
          <ul className="mt-3 space-y-3">
            {articles.map((a) => (
              <li key={a.id}>
                <Link to="/blog/$slug" params={{ slug: a.slug }} className="block hover:text-amber-200">
                  <p className="text-[13px] font-semibold leading-snug">{a.title}</p>
                  {a.excerpt && <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{a.excerpt}</p>}
                </Link>
              </li>
            ))}
          </ul>
          <Link to="/blog" className="mt-3 inline-block text-[12px] font-semibold text-amber-300 hover:underline">
            Read the blog →
          </Link>
        </section>
      )}
    </div>
  );
}

export function LiveRoomsStrip({ parties }: { parties: LiveParty[] }) {
  if (parties.length === 0) return null;
  return (
    <section className="mx-auto mt-12 w-full max-w-[1600px]">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <Radio className="h-4 w-4 text-amber-300" /> Live study rooms right now
      </h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {parties.map((pt) => (
          <Link key={pt.id} to="/watch-party" className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] hover:border-amber-300/30">
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
  );
}

function PublicPostPage() {
  const { post, comments, morePosts, articles, parties } = Route.useLoaderData() as {
    post: PublicPost;
    comments: PublicComment[];
    morePosts: PublicPost[];
    articles: BlogCard[];
    parties: LiveParty[];
  };
  const pct = upvotePct(post.up_count, post.down_count);

  return (
    <div className="w-full px-4 py-8 lg:px-8">
      <div className="mx-auto grid w-full max-w-[1600px] gap-8 lg:grid-cols-[210px_minmax(0,1fr)_300px]">
        {/* LEFT — nav rail */}
        <aside className="hidden lg:block">
          <div className="sticky top-6 space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Browse</p>
            <Link to="/feed" className="block text-sm font-semibold hover:text-amber-200">Student feed</Link>
            <Link to="/communities" className="block text-sm font-semibold hover:text-amber-200">Communities</Link>
            <Link to="/blog" className="block text-sm font-semibold hover:text-amber-200">Blog</Link>
            <Link to="/watch-party" className="block text-sm font-semibold hover:text-amber-200">Watch parties</Link>
            <Link to="/feed" className="inline-flex items-center gap-2 pt-2 text-xs font-semibold text-muted-foreground hover:text-amber-200">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to feed
            </Link>
          </div>
        </aside>

        {/* CENTER — post */}
        <main className="min-w-0">
          <nav aria-label="Breadcrumb" className="mb-4 text-xs text-muted-foreground">
            <Link to="/" className="hover:underline">ClassLab</Link> / <Link to="/feed" className="hover:underline">Student Feed</Link> / <span className="text-foreground">{post.tag ?? "Discussion"}</span>
          </nav>

          <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {post.author_username ? (
                <Link to="/u/$username" params={{ username: post.author_username }} className="font-medium text-foreground hover:underline">
                  {post.author_name ?? post.author_username}
                </Link>
              ) : (
                <span className="font-medium text-foreground">{post.author_name ?? "Student"}</span>
              )}
              <span>· {timeAgo(post.created_at)}</span>
              <span>· {readingTime(post.body)} min read</span>
              {post.tag && <span className="ml-auto rounded-full bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-300">{post.tag}</span>}
            </div>
            <h1 className="mt-3 text-2xl font-bold leading-snug">{post.title}</h1>
            {post.body && <RichText text={post.body} className="mt-3 text-foreground/85" />}
            {post.media_url && post.media_kind === "image" && (
              <img src={post.media_url} alt={post.title} loading="lazy" className="mt-4 w-full rounded-xl border border-white/10 object-cover" />
            )}
            {post.media_url && post.media_kind === "video" && (
              <video src={post.media_url} controls className="mt-4 w-full rounded-xl border border-white/10 bg-black" />
            )}
            {post.media_url && post.media_kind === "link" && (
              <a href={post.media_url} target="_blank" rel="noreferrer nofollow" className="mt-4 block truncate rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-sky-300">{post.media_url}</a>
            )}
            <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1"><ThumbsUp className="h-3.5 w-3.5" /> {pct === null ? "New" : `${pct}% helpful`}</span>
              <span className="inline-flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" /> {post.comment_count} comments</span>
              <Link to="/app/post/$postId" params={{ postId: post.id }} className="ml-auto rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-1.5 text-xs font-semibold text-black">
                Vote, comment & join
              </Link>
            </div>
          </article>

          <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <h2 className="text-sm font-semibold">Discussion ({comments.length})</h2>
            {comments.length === 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">No replies yet. Sign in to start the discussion.</p>
            ) : (
              <CommentList comments={comments} />
            )}
          </section>

          {morePosts.length > 0 && (
            <section className="mt-8">
              <h2 className="text-lg font-semibold">More student discussions</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {morePosts.slice(0, 4).map((p) => (
                  <Link key={p.id} to="/post/$slug" params={{ slug: p.slug ?? p.id }} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 hover:border-white/20">
                    <p className="text-sm font-semibold leading-snug">{p.title}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{p.up_count ?? 0} upvotes · {p.comment_count ?? 0} comments</p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-center">
            <h2 className="text-lg font-semibold">Join thousands of students learning together.</h2>
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              <JoinLink className="rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-5 py-2.5 text-sm font-semibold text-black">Start posting</JoinLink>
              <Link to="/feed" className="inline-flex items-center gap-2 rounded-full bg-white/5 px-5 py-2.5 text-sm font-semibold hover:bg-white/10">
                <ArrowLeft className="h-4 w-4" /> Back to feed
              </Link>
            </div>
          </div>
        </main>

        {/* RIGHT — trending + blog */}
        <aside className="min-w-0">
          <FeedSideRail posts={morePosts} articles={articles} />
        </aside>
      </div>

      <LiveRoomsStrip parties={parties} />
      <SiteFooter />
    </div>
  );
}
