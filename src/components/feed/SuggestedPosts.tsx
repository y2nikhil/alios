import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { MessageSquare, Sparkles, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { timeAgo, type Post } from "@/lib/feed";

export function SuggestedPosts({ postId, tag }: { postId?: string; tag?: string | null }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const collected: Post[] = [];
      if (tag) {
        const { data } = await supabase
          .from("posts")
          .select("*")
          .eq("tag", tag)
          .order("up_count", { ascending: false })
          .limit(8);
        collected.push(...((data ?? []) as Post[]));
      }
      const { data: recent } = await supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(12);
      collected.push(...((recent ?? []) as Post[]));

      const seen = new Set<string>();
      const list = collected.filter((p) => {
        if (p.id === postId || seen.has(p.id)) return false;
        seen.add(p.id);
        return true;
      }).slice(0, 6);

      if (alive) { setPosts(list); setLoading(false); }
    })();
    return () => { alive = false; };
  }, [postId, tag]);

  return (
    <aside className="space-y-3">
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <TrendingUp className="h-4 w-4 text-amber-300" /> Suggested posts
        </h2>

        {loading ? (
          <div className="mt-3 space-y-2">
            {[0, 1, 2].map((i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-white/5" />)}
          </div>
        ) : posts.length === 0 ? (
          <div className="mt-3 rounded-xl border border-dashed border-white/10 p-4 text-center">
            <Sparkles className="mx-auto h-5 w-5 text-amber-300/70" />
            <p className="mt-2 text-xs text-muted-foreground">
              No other posts yet. As the community grows, related discussions will show up here.
            </p>
            <Link to="/app/feed" className="mt-2 inline-block text-xs font-medium text-amber-300 hover:underline">
              Start a discussion
            </Link>
          </div>
        ) : (
          <ul className="mt-3 space-y-1">
            {posts.map((p) => (
              <li key={p.id}>
                <Link
                  to="/app/post/$postId"
                  params={{ postId: p.id }}
                  className="block rounded-xl px-2 py-2 hover:bg-white/5"
                >
                  <p className="line-clamp-2 text-sm font-medium leading-snug">{p.title}</p>
                  <p className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                    {p.tag && <span className="rounded-full bg-amber-400/10 px-1.5 py-0.5 uppercase tracking-wider text-amber-300">{p.tag}</span>}
                    <span>{timeAgo(p.created_at)}</span>
                    <span className="inline-flex items-center gap-1"><MessageSquare className="h-3 w-3" />{p.comment_count}</span>
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </aside>
  );
}
