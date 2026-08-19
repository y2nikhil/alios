import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { JoinLink } from "@/components/JoinLink";
import { ShareDialog } from "@/components/ShareDialog";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { parseBlocks, plainText, readingMinutes, type BlogPost } from "@/lib/blog";
import { BlogContent, TableOfContents } from "@/components/blog/BlogContent";
import { SignupSlider } from "@/components/blog/SignupSlider";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/blog/$slug")({
  loader: async ({ params }) => {
    const { data } = await (supabase as any)
      .from("blog_posts")
      .select("*")
      .eq("slug", params.slug)
      .eq("status", "published")
      .maybeSingle();
    if (!data) throw notFound();
    const { data: more } = await (supabase as any)
      .from("blog_posts")
      .select("id,slug,title,excerpt,cover_url,cover_alt,content,published_at,created_at,tags")
      .eq("status", "published")
      .neq("slug", params.slug)
      .order("published_at", { ascending: false })
      .limit(3);
    return { post: data as BlogPost, related: (more ?? []) as BlogPost[] };
  },
  head: ({ params, loaderData }) => {
    const url = `https://classlab.in/blog/${params.slug}`;
    if (!loaderData) {
      return { meta: [{ title: "Article unavailable | ClassLab" }, { name: "robots", content: "noindex" }] };
    }
    const p = loaderData.post;
    const title = p.seo_title || `${p.title} | ClassLab Blog`;
    const desc = (p.seo_description || p.excerpt || plainText(p.content)).slice(0, 158);
    const meta: { title?: string; name?: string; property?: string; content?: string }[] = [
      { title },
      { name: "description", content: desc },
      { property: "og:title", content: title },
      { property: "og:description", content: desc },
      { property: "og:type", content: "article" },
      { property: "og:url", content: url },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: desc },
    ];
    if (p.keywords) meta.push({ name: "keywords", content: p.keywords });
    if (p.cover_url?.startsWith("https://")) {
      meta.push({ property: "og:image", content: p.cover_url });
      meta.push({ name: "twitter:image", content: p.cover_url });
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
                "@type": "BlogPosting",
                headline: p.title,
                description: desc,
                url,
                image: p.cover_url ?? undefined,
                datePublished: p.published_at ?? p.created_at,
                dateModified: p.updated_at,
                keywords: p.keywords ?? (p.tags ?? []).join(", "),
                wordCount: plainText(p.content).split(/\s+/).length,
                author: { "@type": "Organization", name: "ClassLab" },
                publisher: { "@type": "Organization", name: "ClassLab", url: "https://classlab.in" },
                mainEntityOfPage: { "@type": "WebPage", "@id": url },
                isPartOf: { "@type": "Blog", name: "ClassLab Blog", url: "https://classlab.in/blog" },
              },
              {
                "@type": "BreadcrumbList",
                itemListElement: [
                  { "@type": "ListItem", position: 1, name: "ClassLab", item: "https://classlab.in/" },
                  { "@type": "ListItem", position: 2, name: "Blog", item: "https://classlab.in/blog" },
                  { "@type": "ListItem", position: 3, name: p.title, item: url },
                ],
              },
            ],
          }),
        },
      ],
    };
  },
  notFoundComponent: ArticleNotFound,
  component: BlogArticle,
});

function ArticleNotFound() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-24 text-center">
      <h1 className="text-2xl font-bold">Article not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">This post may have been unpublished or renamed.</p>
      <Link to="/blog" className="mt-6 inline-block rounded-full bg-white/5 px-5 py-2.5 text-sm font-semibold hover:bg-white/10">Back to the blog</Link>
    </main>
  );
}

function BlogArticle() {
  const { post, related } = Route.useLoaderData();
  const { toc } = parseBlocks(post.content);
  const published = post.published_at ?? post.created_at;

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-10">
      <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground">
        <Link to="/" className="hover:underline">ClassLab</Link> / <Link to="/blog" className="hover:underline">Blog</Link> /{" "}
        <span className="text-foreground">{post.tags?.[0] ?? "Article"}</span>
      </nav>

      <article className="mt-5">
        <header>
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {post.tags.map((t) => (
                <span key={t} className="rounded-full bg-amber-400/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-300">{t}</span>
              ))}
            </div>
          )}
          <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">{post.title}</h1>
          {post.excerpt && <p className="mt-3 text-base leading-relaxed text-muted-foreground">{post.excerpt}</p>}
          <p className="mt-3 text-xs text-muted-foreground">
            ClassLab Team · <time dateTime={published}>{new Date(published).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}</time> · {readingMinutes(post.content)} min read
          </p>
          <div className="mt-4">
            <ShareDialog url={`/blog/${post.slug}`} title={post.title} text={post.excerpt ?? undefined} />
          </div>
        </header>

        {post.cover_url && (
          <img src={post.cover_url} alt={post.cover_alt ?? post.title} className="mt-6 w-full rounded-2xl border border-white/10 object-cover" />
        )}

        {post.show_toc && <TableOfContents toc={toc} />}

        <div className="mt-6">
          <BlogContent markdown={post.content} />
        </div>
      </article>

      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="text-lg font-semibold">Keep reading</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {related.map((r) => (
              <Link key={r.id} to="/blog/$slug" params={{ slug: r.slug }} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 hover:border-white/20">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{readingMinutes(r.content ?? "")} min read</p>
                <p className="mt-1.5 text-sm font-semibold leading-snug">{r.title}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-center">
        <h2 className="text-lg font-semibold">Study with thousands of students on ClassLab</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">Focus tracking, exam communities, shared notes and watch parties — free.</p>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <JoinLink className="rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-5 py-2.5 text-sm font-semibold text-black">Create free account</JoinLink>
          <Link to="/blog" className="inline-flex items-center gap-2 rounded-full bg-white/5 px-5 py-2.5 text-sm font-semibold hover:bg-white/10">
            <ArrowLeft className="h-4 w-4" /> All articles
          </Link>
        </div>
      </div>

      <SignupSlider />
    <SiteFooter />
    </main>
  );
}
