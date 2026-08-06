import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PostCard } from "@/components/feed/PostCard";
import { PostComposer } from "@/components/feed/PostComposer";
import { fetchAuthors, sortPosts, type Author, type Post, type SortKey } from "@/lib/feed";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/feed")({
  head: () => ({
    meta: [
      { title: "Feed — ClassLab" },
      { name: "description", content: "Campus feed: post questions, notes and media, upvote the best answers and join the discussion." },
      { property: "og:title", content: "Feed — ClassLab" },
      { property: "og:description", content: "Campus feed: post questions, notes and media, upvote the best and join the discussion." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FeedPage,
});

const SORTS: { key: SortKey; label: string }[] = [
  { key: "for-you", label: "For You" },
  { key: "latest", label: "Latest" },
  { key: "top", label: "Top" },
  { key: "rising", label: "Rising" },
  { key: "controversial", label: "Controversial" },
];

function FeedPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [authors, setAuthors] = useState<Record<string, Author>>({});
  const [votes, setVotes] = useState<Record<string, -1 | 1>>({});
  const [sort, setSort] = useState<SortKey>("for-you");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(120);
    const list = (data ?? []) as Post[];
    setPosts(list);
    setAuthors(await fetchAuthors(list.map((p) => p.author_id)));
    if (user && list.length) {
      const { data: v } = await supabase
        .from("post_votes")
        .select("post_id, value")
        .eq("user_id", user.id)
        .in("post_id", list.map((p) => p.id));
      const map: Record<string, -1 | 1> = {};
      (v ?? []).forEach((row: any) => { map[row.post_id] = row.value; });
      setVotes(map);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const ch = supabase
      .channel("feed-posts")
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const vote = async (postId: string, v: -1 | 1) => {
    if (!user) return;
    const current = votes[postId];
    setPosts((prev) => prev.map((p) => {
      if (p.id !== postId) return p;
      let up = p.up_count, down = p.down_count;
      if (current === 1) up--;
      if (current === -1) down--;
      if (current !== v) { if (v === 1) up++; else down++; }
      return { ...p, up_count: Math.max(0, up), down_count: Math.max(0, down) };
    }));
    setVotes((prev) => {
      const next = { ...prev };
      if (current === v) delete next[postId];
      else next[postId] = v;
      return next;
    });
    if (current === v) {
      await supabase.from("post_votes").delete().eq("post_id", postId).eq("user_id", user.id);
    } else {
      await supabase.from("post_votes").upsert({ post_id: postId, user_id: user.id, value: v } as any, { onConflict: "post_id,user_id" });
    }
  };

  const sorted = useMemo(() => sortPosts(posts, sort), [posts, sort]);

  return (
    <div className="mx-auto w-full max-w-2xl px-3 py-4 lg:px-6 lg:py-6 space-y-4">
      <PostComposer onCreated={load} />

      <div className="flex gap-2 overflow-x-auto scrollbar-thin">
        {SORTS.map((s) => (
          <button
            key={s.key}
            onClick={() => setSort(s.key)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition",
              sort === s.key ? "bg-white/15 text-foreground" : "bg-white/5 text-muted-foreground hover:bg-white/10",
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-10 justify-center text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading feed…
        </div>
      ) : sorted.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-muted-foreground">
          No posts yet — be the first to start a discussion.
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((p) => (
            <PostCard key={p.id} post={p} author={authors[p.author_id]} myVote={votes[p.id] ?? 0} onVote={vote} />
          ))}
        </div>
      )}
    </div>
  );
}
