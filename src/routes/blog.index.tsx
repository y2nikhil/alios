import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, PenLine } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { readingMinutes, type BlogPost } from "@/lib/blog";
import { timeAgo } from "@/lib/feed";
import { SignupSlider } from "@/components/blog/SignupSlider";
import { SiteFooter } from "@/components/SiteFooter";

const URL = "https://classlab.in/blog";
const TITLE = "ClassLab Blog | Study Guides, Exam Strategy & Student Productivity";
const DESC =
  "Study guides, exam preparation strategies, productivity systems and student life advice from the ClassLab team — practical articles for CAT, JEE, NEET, SSC, Banking and college students.";

export const Route = createFileRoute("/blog/")({
  loader: async () => {
    const { data } = await (supabase as any)
      .from("blog_posts")
      .select("id,slug,title,excerpt,cover_url,cover_alt,content,tags,published_at,created_at")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(60);
    return { posts: (data ?? []) as BlogPost[] };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { name: "keywords", content: "student blog, exam preparation blog, study tips, CAT preparation blog, JEE preparation blog, NEET study guide, student productivity, college advice" },
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
              "@type": "Blog",
              name: "ClassLab Blog",
              description: DESC,
              url: URL,
              publisher: { "@type": "Organization", name: "ClassLab", url: "https://classlab.in" },
              blogPost: (loaderData?.posts ?? []).slice(0, 20).map((p) => ({
                "@type": "BlogPosting",
                headline: p.title,
                url: `https://classlab.in/blog/${p.slug}`,
                datePublished: p.published_at ?? p.created_at,
                description: p.excerpt ?? undefined,
              })),
            },
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "ClassLab", item: "https://classlab.in/" },
                { "@type": "ListItem", position: 2, name: "Blog", item: URL },
              ],
            },
          ],
        }),
      },
    ],
  }),
  component: BlogIndex,
});

function BlogIndex() {
  const { posts } = Route.useLoaderData();
  const [hero, ...rest] = posts;

  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-12">
      <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground">
        <Link to="/" className="hover:underline">ClassLab</Link> / <span className="text-foreground">Blog</span>
      </nav>

      <header className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">ClassLab Blog</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Study guides, exam strategy & student productivity</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Long-form, practical articles from the ClassLab team on preparing for CAT, JEE, NEET, SSC, Banking and placements —
          plus focus systems, note-taking methods and study-group tactics you can use the same day.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link to="/feed" className="rounded-full bg-white/5 px-4 py-2 text-sm font-semibold hover:bg-white/10">Student feed</Link>
          <Link to="/app/blog" className="inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-sm font-semibold hover:bg-white/10">
            <PenLine className="h-4 w-4" /> Write a post
          </Link>
        </div>
      </header>

      {posts.length === 0 ? (
        <p className="mt-12 rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-sm text-muted-foreground">
          The first articles are on the way. Meanwhile, join the discussions on the{" "}
          <Link to="/feed" className="text-amber-300 hover:underline">student feed</Link>.
        </p>
      ) : (
        <>
          <article className="mt-10 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
            <Link to="/blog/$slug" params={{ slug: hero.slug }} className="block">
              {hero.cover_url && (
                <img src={hero.cover_url} alt={hero.cover_alt ?? hero.title} className="h-56 w-full object-cover sm:h-72" />
              )}
              <div className="p-6">
                <p className="text-[11px] uppercase tracking-wider text-amber-300">
                  {(hero.tags?.[0] ?? "Featured")} · {readingMinutes(hero.content ?? "")} min read
                </p>
                <h2 className="mt-2 text-2xl font-bold leading-snug">{hero.title}</h2>
                {hero.excerpt && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{hero.excerpt}</p>}
                <p className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-amber-300">
                  Read article <ArrowRight className="h-4 w-4" />
                </p>
              </div>
            </Link>
          </article>

          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            {rest.map((p) => (
              <article key={p.id} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] transition hover:border-white/20">
                <Link to="/blog/$slug" params={{ slug: p.slug }} className="block">
                  {p.cover_url && <img src={p.cover_url} alt={p.cover_alt ?? p.title} loading="lazy" className="h-40 w-full object-cover" />}
                  <div className="p-5">
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      {(p.tags?.[0] ?? "Article")} · {readingMinutes(p.content ?? "")} min · {timeAgo(p.published_at ?? p.created_at)}
                    </p>
                    <h2 className="mt-2 text-base font-semibold leading-snug">{p.title}</h2>
                    {p.excerpt && <p className="mt-1.5 line-clamp-3 text-sm text-muted-foreground">{p.excerpt}</p>}
                  </div>
                </Link>
              </article>
            ))}
          </div>
        </>
      )}

      <SignupSlider />
    <SiteFooter />
    </main>
  );
}
