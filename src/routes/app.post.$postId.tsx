import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Loader2, Send, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useRole } from "@/lib/use-role";
import { AvatarIconRender } from "@/components/AvatarIcon";
import { VoteControl } from "@/components/feed/VoteControl";
import { PostMedia } from "@/components/feed/PostCard";
import { buildTree, CommentThread } from "@/components/feed/CommentThread";
import { fetchAuthors, timeAgo, type Author, type Comment, type Post } from "@/lib/feed";

export const Route = createFileRoute("/app/post/$postId")({
  head: () => ({
    meta: [
      { title: "Post — ClassLab" },
      { name: "description", content: "Read the discussion, add your answer and vote on the most helpful replies." },
      { property: "og:title", content: "Post — ClassLab" },
      { property: "og:description", content: "Read the discussion, add your answer and vote on the most helpful replies." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PostPage,
});

function PostPage() {
  const { postId } = Route.useParams();
  const { user } = useAuth();
  const { isSuperAdmin } = useRole();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [authors, setAuthors] = useState<Record<string, Author>>({});
  const [postVote, setPostVote] = useState<-1 | 0 | 1>(0);
  const [cVotes, setCVotes] = useState<Record<string, -1 | 1>>({});
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [{ data: p }, { data: cs }] = await Promise.all([
      supabase.from("posts").select("*").eq("id", postId).maybeSingle(),
      supabase.from("post_comments").select("*").eq("post_id", postId).order("created_at", { ascending: true }),
    ]);
    const list = (cs ?? []) as Comment[];
    setPost((p ?? null) as Post | null);
    setComments(list);
    setAuthors(await fetchAuthors([...(p ? [(p as any).author_id] : []), ...list.map((c) => c.author_id)]));
    if (user) {
      const [{ data: pv }, { data: cv }] = await Promise.all([
        supabase.from("post_votes").select("value").eq("post_id", postId).eq("user_id", user.id).maybeSingle(),
        list.length
          ? supabase.from("post_comment_votes").select("comment_id, value").eq("user_id", user.id).in("comment_id", list.map((c) => c.id))
          : Promise.resolve({ data: [] as any[] }),
      ]);
      setPostVote(((pv as any)?.value ?? 0) as -1 | 0 | 1);
      const m: Record<string, -1 | 1> = {};
      (cv ?? []).forEach((r: any) => { m[r.comment_id] = r.value; });
      setCVotes(m);
    }
    setLoading(false);
  }, [postId, user]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const ch = supabase
      .channel(`post-${postId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "post_comments", filter: `post_id=eq.${postId}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [postId, load]);

  const votePost = async (v: -1 | 1) => {
    if (!user || !post) return;
    const current = postVote;
    setPostVote(current === v ? 0 : v);
    setPost((p) => {
      if (!p) return p;
      let up = p.up_count, down = p.down_count;
      if (current === 1) up--;
      if (current === -1) down--;
      if (current !== v) { if (v === 1) up++; else down++; }
      return { ...p, up_count: Math.max(0, up), down_count: Math.max(0, down) };
    });
    if (current === v) await supabase.from("post_votes").delete().eq("post_id", post.id).eq("user_id", user.id);
    else await supabase.from("post_votes").upsert({ post_id: post.id, user_id: user.id, value: v } as any, { onConflict: "post_id,user_id" });
  };

  const voteComment = async (commentId: string, v: -1 | 1) => {
    if (!user) return;
    const current = cVotes[commentId];
    setCVotes((prev) => {
      const next = { ...prev };
      if (current === v) delete next[commentId];
      else next[commentId] = v;
      return next;
    });
    setComments((prev) => prev.map((c) => {
      if (c.id !== commentId) return c;
      let up = c.up_count, down = c.down_count;
      if (current === 1) up--;
      if (current === -1) down--;
      if (current !== v) { if (v === 1) up++; else down++; }
      return { ...c, up_count: Math.max(0, up), down_count: Math.max(0, down) };
    }));
    if (current === v) await supabase.from("post_comment_votes").delete().eq("comment_id", commentId).eq("user_id", user.id);
    else await supabase.from("post_comment_votes").upsert({ comment_id: commentId, user_id: user.id, value: v } as any, { onConflict: "comment_id,user_id" });
  };

  const addComment = async (parentId: string | null, body: string) => {
    if (!user || !body.trim()) return;
    await supabase.from("post_comments").insert({ post_id: postId, parent_id: parentId, author_id: user.id, body: body.trim() } as any);
    await load();
  };

  const deleteComment = async (id: string) => {
    await supabase.from("post_comments").delete().eq("id", id);
    await load();
  };

  const tree = useMemo(() => buildTree(comments), [comments]);
  const canDelete = (authorId: string) => !!user && (user.id === authorId || isSuperAdmin);

  if (loading) {
    return <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;
  }
  if (!post) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center text-sm text-muted-foreground">
        This post no longer exists. <Link to="/app/feed" className="text-amber-300 hover:underline">Back to feed</Link>
      </div>
    );
  }

  const a = authors[post.author_id];
  const name = a?.display_name ?? a?.username ?? "Student";

  return (
    <div className="mx-auto w-full max-w-2xl px-3 py-4 lg:px-6 lg:py-6 space-y-4">
      <Link to="/app/feed" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to feed
      </Link>

      <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <AvatarIconRender
            icon={a?.avatar_icon}
            gradient={a?.avatar_gradient}
            initial={name[0]}
            className="h-6 w-6 shrink-0 rounded-full grid place-items-center text-[10px] font-bold text-white"
          />
          <Link to="/app/u/$userId" params={{ userId: post.author_id }} className="font-medium text-foreground hover:underline truncate">{name}</Link>
          <span>· {timeAgo(post.created_at)}</span>
          {post.tag && <span className="ml-auto rounded-full bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-300">{post.tag}</span>}
        </div>
        <h1 className="mt-2 text-lg font-bold leading-snug">{post.title}</h1>
        {post.body && <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground/85">{post.body}</p>}
        {post.media_url && <PostMedia url={post.media_url} kind={post.media_kind} />}
        <div className="mt-3 flex items-center gap-3">
          <VoteControl up={post.up_count} down={post.down_count} mine={postVote} onVote={votePost} />
          <span className="text-xs text-muted-foreground">{post.comment_count} comments</span>
          {canDelete(post.author_id) && (
            <button
              onClick={async () => { await supabase.from("posts").delete().eq("id", post.id); window.history.back(); }}
              className="ml-auto inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs text-muted-foreground hover:bg-red-500/10 hover:text-red-400"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          )}
        </div>
      </article>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <textarea
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a comment…"
          className="w-full resize-y rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-white/25"
        />
        <button
          onClick={async () => { setBusy(true); await addComment(null, text); setText(""); setBusy(false); }}
          disabled={busy || !text.trim()}
          className="mt-2 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-1.5 text-sm font-semibold text-black disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Comment
        </button>
      </div>

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-3">
        <h2 className="px-1 pb-2 text-sm font-semibold">Comments</h2>
        {tree.length === 0 ? (
          <p className="px-1 pb-2 text-xs text-muted-foreground">No comments yet — start the thread.</p>
        ) : (
          <CommentThread
            nodes={tree}
            authors={authors}
            votes={cVotes}
            onVote={voteComment}
            onReply={(parentId, body) => addComment(parentId, body)}
            onDelete={deleteComment}
            canDelete={canDelete}
          />
        )}
      </section>
    </div>
  );
}
