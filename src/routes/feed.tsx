import { createFileRoute, Link } from "@tanstack/react-router";
import { JoinLink } from "@/components/JoinLink";
import { ArrowRight, MessageSquare, ThumbsUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { upvotePct, timeAgo, readingTime } from "@/lib/feed";
import { SiteFooter } from "@/components/SiteFooter";
import { FeedSideRail, LiveRoomsStrip } from "@/routes/post.$slug";


export type PublicPost = {
  id: string;
  slug: string | null;
  title: string;
  body: string | null;
  media_url: string | null;
  media_kind: string | null;
  tag: string | null;
  up_count: number;
  down_count: number;
  comment_count: number;
  created_at: string;
  author_id: string;
  author_name: string | null;
  author_username: string | null;
};

const URL = "https://classlab.in/feed";
const TITLE = "Student Feed | ClassLab – Ask Questions, Share Notes & Connect with Students";
const DESC =
  "Explore the ClassLab Student Feed where students ask questions, share study notes, discuss college life, collaborate on projects, prepare for exams and learn together.";

const FAQS = [
  { q: "What is the ClassLab student feed?", a: "The ClassLab feed is a student discussion platform where learners post questions, notes, resources and study updates, and the community votes the most helpful answers to the top." },
  { q: "Who can post on the feed?", a: "Any signed-in ClassLab student can post text, questions, photos and videos, and comment on other students' posts. Reading the feed is free and open to everyone." },
  { q: "How are posts ranked?", a: "Posts can be sorted by For You, Latest, Top, Rising and Controversial. Ranking uses helpful percentage, comment volume and recency." },
  { q: "Which exams are discussed here?", a: "CAT, JEE, NEET, SSC/UPSC, Banking and Railways, plus placements, coding, college life and general study tips." },
  { q: "Is the ClassLab feed moderated?", a: "Yes. Every post and comment can be reported, and admins review reports and remove content that breaks community rules." },
];

export const Route = createFileRoute("/feed")({
  loader: async () => {
    const { data } = await (supabase as any).rpc("public_posts", { _limit: 40, _offset: 0 });
    return { posts: (data ?? []) as PublicPost[] };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { name: "keywords", content: "student discussion platform, student social network, student feed, student discussion forum, study discussions, college discussions, exam discussions, CAT preparation, placement preparation, peer learning, study community" },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebPage",
              name: TITLE,
              description: DESC,
              url: URL,
              isPartOf: { "@type": "WebSite", name: "ClassLab", url: "https://classlab.in" },
            },
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "ClassLab", item: "https://classlab.in" },
                { "@type": "ListItem", position: 2, name: "Student Feed", item: URL },
              ],
            },
            {
              "@type": "ItemList",
              itemListElement: ((loaderData?.posts ?? []) as PublicPost[]).slice(0, 20).map((p: PublicPost, i: number) => ({
                "@type": "ListItem",
                position: i + 1,
                name: p.title,
                url: `https://classlab.in/post/${p.slug ?? p.id}`,
              })),
            },
            {
              "@type": "FAQPage",
              mainEntity: FAQS.map((f) => ({
                "@type": "Question",
                name: f.q,
                acceptedAnswer: { "@type": "Answer", text: f.a },
              })),
            },
          ],
        }),
      },
    ],
  }),
  component: PublicFeedPage,
});

function PublicFeedPage() {
  const { posts } = Route.useLoaderData() as { posts: PublicPost[] };

  return (
    <main className="min-h-screen bg-background">
      <section className="border-b border-white/10 bg-gradient-to-b from-amber-400/10 to-transparent">
        <div className="mx-auto max-w-3xl px-5 py-14">
          <nav aria-label="Breadcrumb" className="mb-4 text-xs text-muted-foreground">
            <Link to="/" className="hover:underline">ClassLab</Link> <span>/</span> <span className="text-foreground">Student Feed</span>
          </nav>
          <h1 className="text-3xl font-bold leading-tight sm:text-4xl">
            The Student Feed Built for Learning, Not Distractions.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            {DESC}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/app/feed" className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-5 py-2.5 text-sm font-semibold text-black">
              Start posting <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/communities" className="inline-flex items-center gap-2 rounded-full bg-white/5 px-5 py-2.5 text-sm font-semibold hover:bg-white/10">
              Explore communities
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-5 py-10">
        <h2 className="text-lg font-semibold">Latest student discussions</h2>
        <ul className="mt-4 space-y-3">
          {posts.length === 0 && (
            <li className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-muted-foreground">
              No public discussions yet — be the first to post.
            </li>
          )}
          {posts.map((p) => {
            const pct = upvotePct(p.up_count, p.down_count);
            return (
              <li key={p.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-white/20">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {p.author_username ? (
            <Link to="/u/$username" params={{ username: p.author_username }} className="font-medium text-foreground hover:underline">
              {p.author_name ?? p.author_username}
            </Link>
          ) : (
            <span className="font-medium text-foreground">{p.author_name ?? "Student"}</span>
          )}
                  <span>· {timeAgo(p.created_at)}</span>
                  <span>· {readingTime(p.body)} min read</span>
                  {p.tag && <span className="ml-auto rounded-full bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-300">{p.tag}</span>}
                </div>
                <h3 className="mt-2 text-base font-semibold leading-snug">
                  <Link to="/post/$slug" params={{ slug: p.slug ?? p.id }} className="hover:underline">{p.title}</Link>
                </h3>
                {p.body && <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm text-muted-foreground">{p.body}</p>}
                <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><ThumbsUp className="h-3.5 w-3.5" /> {pct === null ? "New" : `${pct}% helpful`}</span>
                  <span className="inline-flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" /> {p.comment_count}</span>
                  <Link to="/post/$slug" params={{ slug: p.slug ?? p.id }} className="ml-auto text-amber-300 hover:underline">Read discussion</Link>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mx-auto max-w-3xl px-5 pb-16">
        <h2 className="text-lg font-semibold">Frequently asked questions</h2>
        <div className="mt-4 space-y-3">
          {FAQS.map((f) => (
            <details key={f.q} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <summary className="cursor-pointer text-sm font-medium">{f.q}</summary>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
            </details>
          ))}
        </div>
        <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-center">
          <h2 className="text-lg font-semibold">Join thousands of students learning together.</h2>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <JoinLink className="rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-5 py-2.5 text-sm font-semibold text-black">Start posting</JoinLink>
            <Link to="/communities" className="rounded-full bg-white/5 px-5 py-2.5 text-sm font-semibold hover:bg-white/10">Explore communities</Link>
          </div>
        </div>
      </section>
    <SiteFooter />
    </main>
  );
}
