import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { CornerDownRight, Loader2, Trash2 } from "lucide-react";
import { AvatarIconRender } from "@/components/AvatarIcon";
import { ReportButton } from "@/components/ReportButton";
import { VoteControl } from "@/components/feed/VoteControl";
import { RichText } from "@/components/feed/RichText";
import { THREAD_COLORS, timeAgo, type Author, type Comment } from "@/lib/feed";
import { cn } from "@/lib/utils";

export type CommentNode = Comment & { children: CommentNode[] };

export function buildTree(comments: Comment[]): CommentNode[] {
  const map = new Map<string, CommentNode>();
  comments.forEach((c) => map.set(c.id, { ...c, children: [] }));
  const roots: CommentNode[] = [];
  map.forEach((node) => {
    const parent = node.parent_id ? map.get(node.parent_id) : null;
    if (parent) parent.children.push(node);
    else roots.push(node);
  });
  const sort = (list: CommentNode[]) => {
    list.sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
    list.forEach((n) => sort(n.children));
  };
  sort(roots);
  return roots;
}

function ReplyBox({ onSubmit, onCancel }: { onSubmit: (text: string) => Promise<void>; onCancel: () => void }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="mt-2 space-y-2">
      <textarea
        autoFocus
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Write a reply…"
        className="w-full resize-y rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-white/25"
      />
      <div className="flex gap-2">
        <button
          onClick={async () => { if (!text.trim()) return; setBusy(true); await onSubmit(text.trim()); setBusy(false); }}
          disabled={busy || !text.trim()}
          className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-3 py-1.5 text-xs font-semibold text-black disabled:opacity-50"
        >
          {busy && <Loader2 className="h-3 w-3 animate-spin" />} Reply
        </button>
        <button onClick={onCancel} className="rounded-full bg-white/5 px-3 py-1.5 text-xs text-muted-foreground hover:bg-white/10">Cancel</button>
      </div>
    </div>
  );
}

export function CommentThread({
  nodes, depth = 0, authors, votes, onVote, onReply, onDelete, canDelete,
}: {
  nodes: CommentNode[];
  depth?: number;
  authors: Record<string, Author>;
  votes: Record<string, -1 | 1>;
  onVote: (commentId: string, v: -1 | 1) => void;
  onReply: (parentId: string, text: string) => Promise<void>;
  onDelete: (commentId: string) => void;
  canDelete: (authorId: string) => boolean;
}) {
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  return (
    <div className={cn(depth > 0 && "mt-2")}>
      {nodes.map((n) => {
        const color = THREAD_COLORS[depth % THREAD_COLORS.length];
        const a = authors[n.author_id];
        const name = a?.display_name ?? a?.username ?? "Student";
        const isCollapsed = collapsed[n.id];
        return (
          <div key={n.id} className="relative pl-3" style={depth > 0 ? { borderLeft: `2px solid ${color}`, marginLeft: 4 } : undefined}>
            {depth === 0 && <span className="absolute left-0 top-1 bottom-1 w-[2px] rounded" style={{ backgroundColor: color }} />}
            <div className="py-2">
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <AvatarIconRender
                  icon={a?.avatar_icon}
                  gradient={a?.avatar_gradient}
                  initial={name[0]}
                  className="h-5 w-5 shrink-0 rounded-full grid place-items-center text-[9px] font-bold text-white"
                />
                <Link to="/app/u/$userId" params={{ userId: n.author_id }} className="font-medium text-foreground/90 hover:underline truncate">
                  {name}
                </Link>
                <span>· {timeAgo(n.created_at)}</span>
                <button
                  onClick={() => setCollapsed((c) => ({ ...c, [n.id]: !c[n.id] }))}
                  className="ml-auto rounded px-1.5 py-0.5 hover:bg-white/10"
                >
                  {isCollapsed ? `[+] ${n.children.length}` : "[−]"}
                </button>
              </div>

              {!isCollapsed && (
                <>
                  <RichText text={n.body} className="mt-1" />
                  <div className="mt-1 flex items-center gap-2">
                    <VoteControl compact up={n.up_count} down={n.down_count} mine={votes[n.id] ?? 0} onVote={(v) => onVote(n.id, v)} />
                    <button
                      onClick={() => setReplyTo(replyTo === n.id ? null : n.id)}
                      className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] text-muted-foreground hover:bg-white/10 hover:text-foreground"
                    >
                      <CornerDownRight className="h-3 w-3" /> Reply
                    </button>
                    <ReportButton targetType="post_comment" targetId={n.id} targetUserId={n.author_id} size="xs" label="" />
                    {canDelete(n.author_id) && (
                      <button
                        onClick={() => onDelete(n.id)}
                        className="rounded-full p-1 text-muted-foreground hover:bg-red-500/10 hover:text-red-400"
                        aria-label="Delete comment"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>

                  {replyTo === n.id && (
                    <ReplyBox
                      onCancel={() => setReplyTo(null)}
                      onSubmit={async (text) => { await onReply(n.id, text); setReplyTo(null); }}
                    />
                  )}

                  {n.children.length > 0 && (
                    <CommentThread
                      nodes={n.children}
                      depth={depth + 1}
                      authors={authors}
                      votes={votes}
                      onVote={onVote}
                      onReply={onReply}
                      onDelete={onDelete}
                      canDelete={canDelete}
                    />
                  )}
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
