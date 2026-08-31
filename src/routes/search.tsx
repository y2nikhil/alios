import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Search, FileText, Newspaper, Tv, MessageSquare, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteFooter } from "@/components/SiteFooter";
import { timeAgo } from "@/lib/feed";

type SearchParams = { q: string };

type PostHit = { id: string; slug: string | null; title: string; body: string | null; created_at: string };
type BlogHit = { id: string; slug: string; title: string; excerpt: string | null; content: string | null; published_at: string | null; created_at: string };
type GroupHit = { id: string; name: string; emoji: string | null };
type PartyHit = { id: string; title: string };

function snippet(text: string | null | undefined, term: string) {
  if (!text) return null;
  const plain = text.replace(/[#*`>_[\]()!]/g, " ").replace(/\s+/g, " ").trim();
  const i = plain.toLowerCase().indexOf(term.toLowerCase());
  if (i < 0) return plain.slice(0, 180);
  return `${i > 40 ? "…" : ""}${plain.slice(Math.max(0, i - 40), i + 160)}…`;
}

export const Route = createFileRoute("/search")({
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    q: typeof search.q === "string" ? search.q : "",
  }),
  loaderDeps: ({ search }) => ({ q: search.q }),
  loader: async ({ deps }) => {
    const term = (deps.q ?? "").trim();
    const safe = term.replace(/[%,()]/g, " ").trim();
    if (!safe) return { posts: [], blogs: [], groups: [], parties: [] };

    const [postsRes, blogsRes, groupsRes, partiesRes] = await Promise.all([
      (supabase as any)
        .from("posts")
        .select("id, slug, title, body, created_at")
        .or(`title.ilike.%${safe}%,body.ilike.%${safe}%`)
        .order("created_at", { ascending: false })
        .limit(20),
      (supabase as any)
        .from("blog_posts")
        .select("id, slug, title, excerpt, content, published_at, created_at")
        .eq("status", "published")
        .or(`title.ilike.%${safe}%,excerpt.ilike.%${safe}%,content.ilike.%${safe}%,keywords.ilike.%${safe}%`)
        .order("published_at", { ascending: false })
        .limit(20),
      (supabase as any).from("groups").select("id, name, emoji").ilike("name", `%${safe}%`).limit(8),
      (supabase as any)
        .from("watch_parties")
        .select("id, title, visibility, ended_at")
        .is("ended_at", null)
        .ilike("title", `%${safe}%`)
        .limit(8),
    ]);

    return {
      posts: ((postsRes?.data ?? []) as PostHit[]).filter((p) => p.slug),
      blogs: (blogsRes?.data ?? []) as BlogHit[],
      groups: (groupsRes?.data ?? []) as GroupHit[],
      parties: ((partiesRes?.data ?? []) as any[]).filter((p) => p.visibility !== "private") as PartyHit[],
    };
  },
  head: ({ search }) => {
    const q = (search as SearchParams | undefined)?.q?.trim();
    const title = q ? `Search results for "${q}" | ClassLab` : "Search | ClassLab";
    const description = q
      ? `Posts, blog articles, study groups and live rooms on ClassLab matching "${q}".`
      : "Search ClassLab for student posts, blog articles, study groups and live study rooms.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { name: "robots", content: "noindex, follow" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
      ],
    };
  },
  component: SearchPage,
});

function SearchPage() {
  const { q } = Route.useSearch();
  const { posts, blogs, groups, parties } = Route.useLoaderData();
  const navigate = useNavigate();
  const [draft, setDraft] = useState(q);

  const total = posts.length + blogs.length + groups.length + parties.length;

  return (
    <>
      <main className="mx-auto w-full max-w-5xl px-5 py-10">
        <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground">
          <Link to="/" className="hover:underline">ClassLab</Link> / <span className="text-foreground">Search</span>
        </nav>

        <header className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">Search</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
            {q ? <>Results for &ldquo;{q}&rdquo;</> : "Search ClassLab"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {q ? `${total} matching ${total === 1 ? "result" : "results"} across posts, articles, groups and live rooms.` : "Find posts, blog articles, study groups and live study rooms."}
          </p>

          <form
            className="mt-5 flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.03] px-4 py-2.5 focus-within:border-amber-300/50"
            onSubmit={(e) => {
              e.preventDefault();
              navigate({ to: "/search", search: { q: draft.trim() } });
            }}
          >
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Search posts, articles, groups, rooms…"
              aria-label="Search ClassLab"
              className="flex-1 bg-transparent text-sm outline-none"
            />
            <button type="submit" className="rounded-full bg-amber-300 px-4 py-1.5 text-xs font-semibold text-black hover:bg-amber-200">
              Search
            </button>
          </form>
        </header>

        {q && total === 0 ? (
          <p className="mt-12 rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center text-sm text-muted-foreground">
            No matching results found.
          </p>
        ) : (
          <div className="mt-8 space-y-10">
            {blogs.length > 0 && (
              <section>
                <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  <Newspaper className="h-4 w-4 text-amber-300" /> Articles
                </h2>
                <div className="mt-3 grid gap-3">
                  {blogs.map((b) => (
                    <article key={b.id} className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 transition hover:border-white/20">
                      <Link to="/blog/$slug" params={{ slug: b.slug }} className="block">
                        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                          Blog · {timeAgo(b.published_at ?? b.created_at)}
                        </p>
                        <h3 className="mt-1.5 text-base font-semibold leading-snug">{b.title}</h3>
                        <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{snippet(b.excerpt || b.content, q)}</p>
                        <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-300">
                          Read article <ArrowRight className="h-3.5 w-3.5" />
                        </span>
                      </Link>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {posts.length > 0 && (
              <section>
                <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  <FileText className="h-4 w-4 text-sky-300" /> Feed posts
                </h2>
                <div className="mt-3 grid gap-3">
                  {posts.map((p) => (
                    <article key={p.id} className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 transition hover:border-white/20">
                      <Link to="/post/$slug" params={{ slug: p.slug as string }} className="block">
                        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Feed · {timeAgo(p.created_at)}</p>
                        <h3 className="mt-1.5 text-base font-semibold leading-snug">{p.title}</h3>
                        {snippet(p.body, q) && <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{snippet(p.body, q)}</p>}
                      </Link>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {groups.length > 0 && (
              <section>
                <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  <MessageSquare className="h-4 w-4 text-violet-300" /> Study groups
                </h2>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {groups.map((g) => (
                    <Link
                      key={g.id}
                      to="/app/collaborate"
                      className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4 transition hover:border-white/20"
                    >
                      <span className="text-lg">{g.emoji ?? "💬"}</span>
                      <span className="truncate text-sm font-medium">{g.name}</span>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {parties.length > 0 && (
              <section>
                <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  <Tv className="h-4 w-4 text-pink-300" /> Live rooms
                </h2>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {parties.map((p) => (
                    <Link
                      key={p.id}
                      to="/app/hangout/$partyId"
                      params={{ partyId: p.id }}
                      className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4 transition hover:border-white/20"
                    >
                      <Tv className="h-4 w-4 text-pink-300" />
                      <span className="truncate text-sm font-medium">{p.title}</span>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {!q && (
              <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-sm text-muted-foreground">
                Type something above and press Enter to search ClassLab.
              </p>
            )}
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
