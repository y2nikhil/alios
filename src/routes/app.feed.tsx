import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useRole } from "@/lib/use-role";
import { PostCard } from "@/components/feed/PostCard";
import { PostComposer } from "@/components/feed/PostComposer";
import { FeedSidebar } from "@/components/feed/FeedSidebar";
import { fetchAuthors, sortPosts, type Author, type Post, type SortKey } from "@/lib/feed";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/feed")({
  validateSearch: (s: Record<string, unknown>): { compose?: string } => ({
    compose: typeof s.compose === "string" ? s.compose : undefined,
  }),
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

type TabKey = SortKey | "following" | "communities" | "saved";

const TABS: { key: TabKey; label: string }[] = [
  { key: "for-you", label: "For You" },
  { key: "latest", label: "Latest" },
  { key: "top", label: "Top" },
  { key: "rising", label: "Rising" },
  { key: "controversial", label: "Controversial" },
  { key: "following", label: "Following" },
  { key: "communities", label: "Communities" },
  { key: "saved", label: "Saved" },
];

function FeedPage() {
  const { user } = useAuth();
  const { isAdmin, isSuperAdmin } = useRole();
  const search = useSearch({ from: "/app/feed" });
  const [posts, setPosts] = useState<Post[]>([]);
  const [authors, setAuthors] = useState<Record<string, Author>>({});
  const [onlineIds, setOnlineIds] = useState<Record<string, true>>({});
  const [votes, setVotes] = useState<Record<string, -1 | 1>>({});
  const [saved, setSaved] = useState<Record<string, true>>({});
  const [reactions, setReactions] = useState<Record<string, Record<string, number>>>({});
  const [myReactions, setMyReactions] = useState<Record<string, string>>({});
  const [friendIds, setFriendIds] = useState<string[]>([]);
  const [tab, setTab] = useState<TabKey>("for-you");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(10);

  useEffect(() => {
    if (search.compose === "1") {
      window.dispatchEvent(new CustomEvent("classlab:open-post-composer"));
    }
  }, [search.compose]);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    const list = (data ?? []) as Post[];
    setPosts(list);
    setAuthors(await fetchAuthors(list.map((p) => p.author_id)));
    const authorIds = [...new Set(list.map((p) => p.author_id))];
    if (authorIds.length) {
      const { data: pres } = await (supabase as any).rpc("public_presence", { _ids: authorIds });
      const map: Record<string, true> = {};
      (pres ?? []).forEach((r: { id: string; online: boolean }) => { if (r.online) map[r.id] = true; });
      setOnlineIds(map);
    }

    const ids = list.map((p) => p.id);
    if (ids.length) {
      const { data: allReactions } = await (supabase.from("post_reactions") as any)
        .select("post_id, user_id, emoji")
        .in("post_id", ids);
      const counts: Record<string, Record<string, number>> = {};
      const mine: Record<string, string> = {};
      (allReactions ?? []).forEach((r: any) => {
        counts[r.post_id] = counts[r.post_id] ?? {};
        counts[r.post_id][r.emoji] = (counts[r.post_id][r.emoji] ?? 0) + 1;
        if (user && r.user_id === user.id) mine[r.post_id] = r.emoji;
      });
      setReactions(counts);
      setMyReactions(mine);
    }

    if (user && ids.length) {
      const { data: v } = await supabase
        .from("post_votes")
        .select("post_id, value")
        .eq("user_id", user.id)
        .in("post_id", ids);
      const map: Record<string, -1 | 1> = {};
      (v ?? []).forEach((row: any) => { map[row.post_id] = row.value; });
      setVotes(map);

      const { data: s } = await (supabase.from("post_saves") as any)
        .select("post_id")
        .eq("user_id", user.id);
      const smap: Record<string, true> = {};
      (s ?? []).forEach((row: any) => { smap[row.post_id] = true; });
      setSaved(smap);
    }
    setLoading(false);
  }, [user, limit]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!user) { setFriendIds([]); return; }
    (async () => {
      const { data } = await supabase
        .from("friendships")
        .select("requester_id, addressee_id, status")
        .eq("status", "accepted")
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);
      setFriendIds((data ?? []).map((f: any) => (f.requester_id === user.id ? f.addressee_id : f.requester_id)));
    })();
  }, [user]);

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

  const react = async (postId: string, emoji: string | null) => {
    if (!user) return;
    const prevEmoji = myReactions[postId] ?? null;
    setReactions((prev) => {
      const counts = { ...(prev[postId] ?? {}) };
      if (prevEmoji) counts[prevEmoji] = Math.max(0, (counts[prevEmoji] ?? 1) - 1);
      if (emoji) counts[emoji] = (counts[emoji] ?? 0) + 1;
      return { ...prev, [postId]: counts };
    });
    setMyReactions((prev) => {
      const next = { ...prev };
      if (emoji) next[postId] = emoji; else delete next[postId];
      return next;
    });
    if (emoji) {
      await (supabase.from("post_reactions") as any).upsert(
        { post_id: postId, user_id: user.id, emoji },
        { onConflict: "post_id,user_id" },
      );
    } else {
      await (supabase.from("post_reactions") as any).delete().eq("post_id", postId).eq("user_id", user.id);
    }
  };

  const toggleSave = async (postId: string) => {
    if (!user) return;
    const isSaved = !!saved[postId];
    setSaved((prev) => {
      const next = { ...prev };
      if (isSaved) delete next[postId]; else next[postId] = true;
      return next;
    });
    if (isSaved) {
      await (supabase.from("post_saves") as any).delete().eq("post_id", postId).eq("user_id", user.id);
    } else {
      await (supabase.from("post_saves") as any).insert({ post_id: postId, user_id: user.id });
    }
  };

  const togglePin = async (postId: string) => {
    const target = posts.find((p) => p.id === postId);
    if (!target || !user) return;
    const next = !target.pinned;
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, pinned: next } : p)));
    await (supabase.from("posts") as any)
      .update({ pinned: next, pinned_at: next ? new Date().toISOString() : null, pinned_by: next ? user.id : null })
      .eq("id", postId);
  };

  const deletePost = async (postId: string) => {
    const target = posts.find((p) => p.id === postId);
    if (!target) return;
    if (!confirm("Delete this post permanently?")) return;
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    await supabase.from("posts").delete().eq("id", postId);
    load();
  };

  const visible = useMemo(() => {
    let list = posts;
    if (tagFilter) list = list.filter((p) => p.tag === tagFilter);
    if (tab === "saved") list = list.filter((p) => saved[p.id]);
    if (tab === "following") list = list.filter((p) => friendIds.includes(p.author_id));
    if (tab === "communities") {
      const tags = new Set(posts.map((p) => p.tag).filter(Boolean) as string[]);
      list = list.filter((p) => !!p.tag && tags.has(p.tag));
    }
    const sortKey: SortKey = (["for-you", "latest", "top", "rising", "controversial"] as string[]).includes(tab)
      ? (tab as SortKey)
      : "latest";
    const sorted = sortPosts(list, sortKey);
    return [...sorted].sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned));
  }, [posts, tab, saved, friendIds, tagFilter]);

  const emptyMessage =
    tab === "saved" ? "No saved posts yet — tap the bookmark icon on a post."
    : tab === "following" ? "Posts from your friends will show up here."
    : "No posts yet — be the first to start a discussion.";

  return (
    <div className="mx-auto flex w-full max-w-6xl gap-6 px-3 py-4 lg:px-6 lg:py-6">
      <div className="min-w-0 flex-1 space-y-4">
        <PostComposer onCreated={load} />

        <div className="flex gap-2 overflow-x-auto scrollbar-thin">
          {TABS.map((s) => (
            <button
              key={s.key}
              onClick={() => setTab(s.key)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition",
                tab === s.key ? "bg-white/15 text-foreground" : "bg-white/5 text-muted-foreground hover:bg-white/10",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>

        {tagFilter && (
          <button
            onClick={() => setTagFilter(null)}
            className="rounded-full bg-amber-400/20 px-3 py-1 text-xs font-semibold text-amber-200"
          >
            #{tagFilter} · clear filter ✕
          </button>
        )}

        {loading ? (
          <div className="flex items-center gap-2 py-10 justify-center text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading feed…
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-muted-foreground">
            {emptyMessage}
          </div>
        ) : (
          <div className="space-y-3">
            {visible.map((p) => (
              <PostCard
                key={p.id}
                post={p}
                author={authors[p.author_id]}
                online={!!onlineIds[p.author_id]}
                myVote={votes[p.id] ?? 0}
                onVote={vote}
                canModerate={isAdmin || p.author_id === user?.id}
                onDelete={deletePost}
                saved={!!saved[p.id]}
                onToggleSave={toggleSave}
                canPin={isSuperAdmin}
                onTogglePin={togglePin}
                reactions={reactions[p.id] ?? {}}
                myReaction={myReactions[p.id] ?? null}
                onReact={react}
              />
            ))}
            {posts.length >= limit && (
              <button
                onClick={() => setLimit((n) => n + 10)}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.03] py-3 text-sm font-semibold text-amber-200 hover:bg-white/[0.07] transition"
              >
                Show more posts
              </button>
            )}
          </div>
        )}
      </div>

      <FeedSidebar posts={posts} onPickTag={(t) => setTagFilter(t)} />
    </div>
  );
}
