import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { JoinLink } from "@/components/JoinLink";
import { ArrowLeft, MessageSquare, ThumbsUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { readingTime, timeAgo, upvotePct } from "@/lib/feed";
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

const THREAD_COLORS = ["#f97316", "#22c55e", "#38bdf8", "#a855f7", "#ef4444", "#eab308", "#ec4899"];

export const Route = createFileRoute("/post/$slug")({
  loader: async ({ params }) => {
    const { data } = await (supabase as any).rpc("public_post_by_slug", { _slug: params.slug });
    const post = (data ?? [])[0] as PublicPost | undefined;
    if (!post) throw notFound();
    const { data: cs } = await (supabase as any).rpc("public_post_comments", { _post_id: post.id });
    return { post, comments: (cs ?? []) as PublicComment[] };
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
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{c.body}</p>
            </div>
            <CommentList comments={comments} parentId={c.id} depth={depth + 1} />
          </div>
        );
      })}
    </div>
  );
}

function PublicPostPage() {
  const { post, comments } = Route.useLoaderData() as { post: PublicPost; comments: PublicComment[] };
  const pct = upvotePct(post.up_count, post.down_count);

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-10">
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
        {post.body && <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground/85">{post.body}</p>}
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
  );
}
