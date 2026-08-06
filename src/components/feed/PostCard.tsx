import { Link } from "@tanstack/react-router";
import { ExternalLink, MessageSquare, Share2, Trash2 } from "lucide-react";
import { AvatarIconRender } from "@/components/AvatarIcon";
import { VoteControl } from "@/components/feed/VoteControl";
import { ReportButton } from "@/components/ReportButton";
import { postPath, timeAgo, type Author, type Post } from "@/lib/feed";


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
}: {
  post: Post;
  author?: Author;
  myVote: -1 | 0 | 1;
  onVote: (postId: string, v: -1 | 1) => void;
  canModerate?: boolean;
  onDelete?: (postId: string) => void;
}) {
  const name = author?.display_name ?? author?.username ?? "Student";
  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}${postPath(post)}` : postPath(post);

  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-white/20">
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

      <div className="mt-3 flex items-center gap-2">
        <VoteControl up={post.up_count} down={post.down_count} mine={myVote} onVote={(v) => onVote(post.id, v)} />
        <Link
          to="/app/post/$postId"
          params={{ postId: post.id }}
          className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-xs text-muted-foreground hover:bg-white/10 hover:text-foreground"
        >
          <MessageSquare className="h-3.5 w-3.5" /> {post.comment_count}
        </Link>
        <button
          onClick={() => {
            const url = `${window.location.origin}/app/post/${post.id}`;
            if (navigator.share) navigator.share({ title: post.title, url }).catch(() => {});
            else navigator.clipboard?.writeText(url);
          }}
          className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-xs text-muted-foreground hover:bg-white/10 hover:text-foreground"
        >
          <Share2 className="h-3.5 w-3.5" /> Share
        </button>
      </div>
    </article>
  );
}
