import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { PublicShell } from "@/components/PublicShell";
import { useState } from "react";
import { MessageSquare, ThumbsUp, CalendarDays, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AvatarIconRender } from "@/components/AvatarIcon";
import { OnlineDot } from "@/components/BrandLogo";
import { timeAgo, upvotePct } from "@/lib/feed";
import { cn } from "@/lib/utils";

type PublicProfile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_icon: string | null;
  avatar_gradient: string | null;
  created_at: string;
  online: boolean;
  post_count: number;
  comment_count: number;
  post_karma: number;
  comment_karma: number;
};

type ProfilePost = {
  id: string; slug: string | null; title: string; body: string | null;
  media_url: string | null; media_kind: string | null; tag: string | null;
  up_count: number; down_count: number; comment_count: number; created_at: string;
};

type ProfileComment = {
  id: string; post_id: string; post_slug: string | null; post_title: string;
  body: string; up_count: number; down_count: number; created_at: string;
};

export const Route = createFileRoute("/u/$username")({
  loader: async ({ params }) => {
    const { data } = await (supabase as any).rpc("public_user_profile", { _username: params.username });
    const profile = (data ?? [])[0] as PublicProfile | undefined;
    if (!profile) throw notFound();
    const [{ data: posts }, { data: comments }] = await Promise.all([
      (supabase as any).rpc("public_user_posts", { _user: profile.id, _limit: 30 }),
      (supabase as any).rpc("public_user_comments", { _user: profile.id, _limit: 30 }),
    ]);
    return {
      profile,
      posts: (posts ?? []) as ProfilePost[],
      comments: (comments ?? []) as ProfileComment[],
    };
  },
  head: ({ params, loaderData }) => {
    const url = `https://classlab.in/u/${params.username}`;
    if (!loaderData) {
      return { meta: [{ title: "Student profile unavailable | ClassLab" }, { name: "robots", content: "noindex" }] };
    }
    const p = loaderData.profile as PublicProfile;
    const name = p.display_name ?? p.username ?? "Student";
    const title = `${name} (@${p.username}) | ClassLab Student Profile`;
    const desc = `${name} on ClassLab — ${p.post_count} posts, ${p.comment_count} comments and ${p.post_karma + p.comment_karma} upvotes from the student community. Read their study posts, questions and answers.`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "profile" },
        { property: "og:url", content: url },
        { name: "twitter:card", content: "summary" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: desc },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ProfilePage",
            mainEntity: {
              "@type": "Person",
              name,
              alternateName: p.username ? `@${p.username}` : undefined,
              url,
            },
          }),
        },
      ],
    };
  },
  component: () => (
    <PublicShell>
      <PublicProfilePage />
    </PublicShell>
  ),
});

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <p className="text-2xl font-bold">{value.toLocaleString()}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function PublicProfilePage() {
  const data = Route.useLoaderData();
  const profile = data.profile as PublicProfile;
  const posts = data.posts as ProfilePost[];
  const comments = data.comments as ProfileComment[];
  const [tab, setTab] = useState<"posts" | "comments" | "about">("posts");
  const name = profile.display_name ?? profile.username ?? "Student";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-white/10 bg-white/[0.02]">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-4 py-8">
          <div className="relative">
            <AvatarIconRender
              icon={profile.avatar_icon}
              gradient={profile.avatar_gradient}
              initial={name}
              className="h-20 w-20 rounded-2xl grid place-items-center"
            />
            {profile.online && <OnlineDot online className="absolute -bottom-0.5 -right-0.5 h-4 w-4" />}
          </div>
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
              {name}
              <OnlineDot online={profile.online} />
            </h1>
            {profile.username && <p className="text-sm text-muted-foreground">u/{profile.username}</p>}
            <p className="mt-1 text-xs text-muted-foreground">
              {(profile.post_karma + profile.comment_karma).toLocaleString()} karma ·{" "}
              <CalendarDays className="inline h-3 w-3" /> joined {new Date(profile.created_at).toLocaleDateString()}
              {profile.online && <span className="ml-2 text-emerald-400">Online now</span>}
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4">
        <nav className="flex gap-1 border-b border-white/10">
          {(["posts", "comments", "about"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "px-4 py-3 text-sm font-medium capitalize transition",
                tab === t ? "border-b-2 border-amber-400 text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t}
            </button>
          ))}
        </nav>

        {tab === "about" && (
          <section className="grid grid-cols-2 gap-6 py-6">
            <Stat value={profile.post_karma} label="Post Karma" />
            <Stat value={profile.comment_karma} label="Comment Karma" />
            <Stat value={profile.post_count} label="Posts" />
            <Stat value={profile.comment_count} label="Comments" />
          </section>
        )}

        {tab === "posts" && (
          <section className="space-y-3 py-5">
            {posts.length === 0 && <p className="py-8 text-sm text-muted-foreground">No public posts yet.</p>}
            {posts.map((p) => {
              const pct = upvotePct(p.up_count, p.down_count);
              return (
                <article key={p.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 hover:border-white/20">
                  <Link to="/post/$slug" params={{ slug: p.slug ?? p.id }} className="block">
                    <h2 className="font-semibold">{p.title}</h2>
                    {p.body && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{p.body}</p>}
                  </Link>
                  <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><ThumbsUp className="h-3 w-3" />{pct === null ? "—" : `${pct}%`}</span>
                    <span className="inline-flex items-center gap-1"><MessageSquare className="h-3 w-3" />{p.comment_count}</span>
                    <span>{timeAgo(p.created_at)}</span>
                    {p.tag && <span className="rounded-full bg-white/5 px-2 py-0.5">{p.tag}</span>}
                  </div>
                </article>
              );
            })}
          </section>
        )}

        {tab === "comments" && (
          <section className="space-y-3 py-5">
            {comments.length === 0 && <p className="py-8 text-sm text-muted-foreground">No public comments yet.</p>}
            {comments.map((c) => (
              <article key={c.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <Link
                  to="/post/$slug"
                  params={{ slug: c.post_slug ?? c.post_id }}
                  className="inline-flex items-center gap-1 text-xs text-amber-300 hover:underline"
                >
                  {c.post_title} <ArrowRight className="h-3 w-3" />
                </Link>
                <p className="mt-2 whitespace-pre-wrap text-sm">{c.body}</p>
                <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <ThumbsUp className="h-3 w-3" />{c.up_count - c.down_count} upvotes
                  </span>
                  <span>{timeAgo(c.created_at)}</span>
                </div>
              </article>
            ))}
          </section>
        )}

        <footer className="border-t border-white/10 py-6 text-sm">
          <Link to="/feed" className="text-muted-foreground hover:text-foreground">← Back to the ClassLab student feed</Link>
        </footer>
      </div>
    </div>
  );
}
