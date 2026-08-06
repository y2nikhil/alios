import { Link } from "@tanstack/react-router";
import { Bookmark, ExternalLink, MessageSquare, Pin, Share2, Trash2 } from "lucide-react";
import { AvatarIconRender } from "@/components/AvatarIcon";
import { VoteControl } from "@/components/feed/VoteControl";
import { PostReactions } from "@/components/feed/PostReactions";
import { ReportButton } from "@/components/ReportButton";
import { postPath, timeAgo, type Author, type Post } from "@/lib/feed";
import { cn } from "@/lib/utils";


export function PostMedia({ url, kind }: { url: string; kind: string | null }) {
  if (kind === "video") {
    return (
      <video src={url} controls className="mt-3 w-full max-h-[420px] rounded-xl border border-white/10 bg-black" />
    );
  }
  if (kind === "image") {
    return (
      <img src={url} alt="Post attachment" loading="lazy" className="mt-3 w-full max-h-[420px] rounded-xl border border-white/10 object-cover" />
    );
  }
  return (
    <a href={url} target="_blank" rel="noreferrer" className="mt-3 block truncate rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-sky-300 hover:bg-white/10">
      {url}
    </a>
  );
}

export function PostCard({
  post, author, myVote, onVote, canModerate, onDelete,
  saved, onToggleSave, canPin, onTogglePin,
  reactions = {}, myReaction = null, onReact,
}: {
  post: Post;
  author?: Author;
  myVote: -1 | 0 | 1;
  onVote: (postId: string, v: -1 | 1) => void;
  canModerate?: boolean;
  onDelete?: (postId: string) => void;
  saved?: boolean;
  onToggleSave?: (postId: string) => void;
  canPin?: boolean;
  onTogglePin?: (postId: string) => void;
  reactions?: Record<string, number>;
  myReaction?: string | null;
  onReact?: (postId: string, emoji: string | null) => void;
}) {
  const name = author?.display_name ?? author?.username ?? "Student";
  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}${postPath(post)}` : postPath(post);

  return (
    <article className={cn(
      "rounded-2xl border p-4 transition",
      post.pinned ? "border-amber-400/40 bg-amber-400/[0.06]" : "border-white/10 bg-white/[0.03] hover:border-white/20",
    )}>
      {post.pinned && (
        <p className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-amber-300">
          <Pin className="h-3 w-3" /> Pinned
        </p>
      )}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <AvatarIconRender
          icon={author?.avatar_icon}
          gradient={author?.avatar_gradient}
          initial={name[0]}
          className="h-6 w-6 shrink-0 rounded-full grid place-items-center text-[10px] font-bold text-white"
        />
        <Link to="/app/u/$userId" params={{ userId: post.author_id }} className="font-medium text-foreground hover:underline truncate">
          {name}
        </Link>
        {author?.username && <span className="truncate hidden sm:inline">@{author.username}</span>}
        <span>· {timeAgo(post.created_at)}</span>
        {post.tag && (
          <span className="ml-auto shrink-0 rounded-full bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-300">
            {post.tag}
          </span>
        )}
      </div>

      <Link to="/app/post/$postId" params={{ postId: post.id }} className="block">
        <h3 className="mt-2 text-base font-semibold leading-snug hover:underline">{post.title}</h3>
        {post.body && <p className="mt-1 text-sm text-muted-foreground line-clamp-4 whitespace-pre-wrap">{post.body}</p>}
      </Link>
      {post.media_url && <PostMedia url={post.media_url} kind={post.media_kind} />}

      {onReact && (
        <div className="mt-3">
          <PostReactions counts={reactions} mine={myReaction} onReact={(e) => onReact(post.id, e)} />
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <VoteControl up={post.up_count} down={post.down_count} mine={myVote} onVote={(v) => onVote(post.id, v)} />
        <Link
          to="/app/post/$postId"
          params={{ postId: post.id }}
          className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-xs text-muted-foreground hover:bg-white/10 hover:text-foreground"
        >
          <MessageSquare className="h-3.5 w-3.5" /> {post.comment_count}
        </Link>
        {onToggleSave && (
          <button
            onClick={() => onToggleSave(post.id)}
            aria-label={saved ? "Remove bookmark" : "Save post"}
            title={saved ? "Saved" : "Save post"}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition",
              saved ? "bg-amber-400/20 text-amber-200" : "bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground",
            )}
          >
            <Bookmark className={cn("h-3.5 w-3.5", saved && "fill-current")} />
          </button>
        )}
        <a
          href={postPath(post)}
          target="_blank"
          rel="noreferrer"
          title="Open public page"
          className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-xs text-muted-foreground hover:bg-white/10 hover:text-foreground"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
        <button
          onClick={() => {
            if (navigator.share) navigator.share({ title: post.title, url: shareUrl }).catch(() => {});
            else navigator.clipboard?.writeText(shareUrl);
          }}
          className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-xs text-muted-foreground hover:bg-white/10 hover:text-foreground"
        >
          <Share2 className="h-3.5 w-3.5" /> Share
        </button>
        {canPin && onTogglePin && (
          <button
            onClick={() => onTogglePin(post.id)}
            aria-label={post.pinned ? "Unpin post" : "Pin post"}
            title={post.pinned ? "Unpin for everyone" : "Pin for everyone"}
            className={cn(
              "rounded-full p-1.5 transition",
              post.pinned ? "bg-amber-400/20 text-amber-200" : "text-muted-foreground hover:bg-white/10 hover:text-foreground",
            )}
          >
            <Pin className="h-3.5 w-3.5" />
          </button>
        )}
        <ReportButton targetType="post" targetId={post.id} targetUserId={post.author_id} size="xs" label="" />
        {canModerate && onDelete && (
          <button
            onClick={() => onDelete(post.id)}
            aria-label="Delete post"
            className="rounded-full p-1.5 text-muted-foreground hover:bg-red-500/10 hover:text-red-400"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

    </article>
  );
}
