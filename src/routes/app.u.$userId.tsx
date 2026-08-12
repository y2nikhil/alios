import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Loader2, Clock, Activity, Sparkles, UserPlus, Users, MessageSquare, ThumbsUp, CalendarDays, ArrowRight, ExternalLink } from "lucide-react";
import { formatShortDuration } from "@/lib/format";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AwardsShelf } from "@/components/AwardsShelf";
import { AvatarIconRender } from "@/components/AvatarIcon";
import { OnlineDot } from "@/components/BrandLogo";
import { timeAgo, upvotePct } from "@/lib/feed";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/u/$userId")({
  head: () => ({ meta: [{ title: "Student profile — ClassLab" }] }),
  component: ProfilePage,
});

type ProfileRow = {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_icon: string | null;
  avatar_gradient: string | null;
  created_at: string;
  timeline_visibility: string;
};

type ProfilePost = {
  id: string; slug: string | null; title: string; body: string | null;
  tag: string | null; up_count: number; down_count: number; comment_count: number; created_at: string;
};

type ProfileComment = {
  id: string; post_id: string; post_slug: string | null; post_title: string;
  body: string; up_count: number; down_count: number; created_at: string;
};

function ProfilePage() {
  const { userId } = Route.useParams();
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [online, setOnline] = useState(false);
  const [posts, setPosts] = useState<ProfilePost[]>([]);
  const [comments, setComments] = useState<ProfileComment[]>([]);
  const [stats, setStats] = useState<{ total: number; sessions: number; days: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"posts" | "comments" | "about">("posts");
  const [friendStatus, setFriendStatus] = useState<"none" | "pending_out" | "pending_in" | "friends" | "self">("none");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const { data: p } = await (supabase.from("profiles") as any)
        .select("id, display_name, username, avatar_icon, avatar_gradient, created_at, timeline_visibility")
        .eq("id", userId)
        .maybeSingle();
      if (cancelled) return;
      setProfile((p as ProfileRow) ?? null);

      const [{ data: pres }, { data: pp }, { data: pc }] = await Promise.all([
        (supabase as any).rpc("public_presence", { _ids: [userId] }),
        (supabase as any).rpc("public_user_posts", { _user: userId, _limit: 30 }),
        (supabase as any).rpc("public_user_comments", { _user: userId, _limit: 30 }),
      ]);
      if (cancelled) return;
      setOnline(Boolean((pres ?? [])[0]?.online));
      setPosts((pp ?? []) as ProfilePost[]);
      setComments((pc ?? []) as ProfileComment[]);

      const since = new Date(); since.setDate(since.getDate() - 30);
      const { data: sess } = await supabase
        .from("aux_sessions").select("started_at, ended_at")
        .eq("user_id", userId).gte("started_at", since.toISOString());
      let total = 0; const days = new Set<string>();
      (sess ?? []).forEach((s: any) => {
        const e = s.ended_at ? new Date(s.ended_at).getTime() : Date.now();
        total += Math.max(0, e - new Date(s.started_at).getTime());
        days.add(new Date(s.started_at).toISOString().slice(0, 10));
      });
      if (cancelled) return;
      setStats({ total: Math.floor(total / 1000), sessions: (sess ?? []).length, days: days.size });

      if (user) {
        if (user.id === userId) setFriendStatus("self");
        else {
          const { data: fr } = await (supabase.from("friendships") as any)
            .select("status, requester_id, addressee_id")
            .or(`and(requester_id.eq.${user.id},addressee_id.eq.${userId}),and(requester_id.eq.${userId},addressee_id.eq.${user.id})`)
            .maybeSingle();
          if (cancelled) return;
          if (!fr) setFriendStatus("none");
          else if (fr.status === "accepted") setFriendStatus("friends");
          else if (fr.requester_id === user.id) setFriendStatus("pending_out");
          else setFriendStatus("pending_in");
        }
      }
      setLoading(false);
    };
    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line
  }, [userId, user?.id]);

  const sendRequest = async () => {
    if (!user) return;
    const { error } = await (supabase.from("friendships") as any).insert({ requester_id: user.id, addressee_id: userId });
    if (error) toast.error(error.message);
    else { toast.success("Friend request sent"); setFriendStatus("pending_out"); }
  };

  if (loading) return <div className="p-8"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  if (!profile) {
    return (
      <div className="p-8 max-w-md mx-auto text-center space-y-3">
        <h2 className="font-semibold">Profile not found</h2>
        <Link to="/app" className="text-sm text-primary hover:underline">← Back home</Link>
      </div>
    );
  }

  const name = profile.display_name ?? profile.username ?? "Student";
  const postKarma = posts.reduce((n, p) => n + (p.up_count - p.down_count), 0);
  const commentKarma = comments.reduce((n, c) => n + (c.up_count - c.down_count), 0);

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-4xl mx-auto">
      <header className="glass rounded-3xl p-5 lg:p-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative">
            <AvatarIconRender
              icon={profile.avatar_icon}
              gradient={profile.avatar_gradient}
              initial={name}
              className="h-20 w-20 rounded-2xl grid place-items-center text-2xl font-bold"
            />
            {online && <OnlineDot online className="absolute -bottom-0.5 -right-0.5 h-4 w-4" />}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">{name} <OnlineDot online={online} /></h1>
            {profile.username && <p className="text-sm text-muted-foreground">u/{profile.username}</p>}
            <p className="mt-1 text-xs text-muted-foreground">
              {(postKarma + commentKarma).toLocaleString()} karma · <CalendarDays className="inline h-3 w-3" /> joined{" "}
              {new Date(profile.created_at).toLocaleDateString()}
              {online && <span className="ml-2 text-emerald-400">Online now</span>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {user && friendStatus === "none" && (
              <Button onClick={sendRequest} size="sm"><UserPlus className="h-3.5 w-3.5 mr-1.5" /> Add friend</Button>
            )}
            {friendStatus === "friends" && (
              <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-400/30">
                <Users className="h-3 w-3" /> Friends
              </span>
            )}
            {friendStatus === "pending_out" && <span className="text-xs px-3 py-1.5 rounded-full bg-white/5 text-muted-foreground">Request sent</span>}
            {friendStatus === "pending_in" && <Link to="/app/friends" className="text-xs px-3 py-1.5 rounded-full bg-primary/15 text-primary">Respond →</Link>}
            {profile.username && (
              <Link to="/u/$username" params={{ username: profile.username }} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                Public page <ExternalLink className="h-3 w-3" />
              </Link>
            )}
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Stat value={postKarma} label="Post karma" />
          <Stat value={commentKarma} label="Comment karma" />
          <Stat value={posts.length} label="Posts" />
          <Stat value={comments.length} label="Comments" />
        </div>
      </header>

      <nav className="flex gap-1 border-b border-white/10">
        {(["posts", "comments", "about"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-3 text-sm font-medium capitalize transition",
              tab === t ? "border-b-2 border-primary text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t}
          </button>
        ))}
      </nav>

      {tab === "posts" && (
        <section className="space-y-3">
          {posts.length === 0 && <p className="py-8 text-sm text-muted-foreground">No posts yet.</p>}
          {posts.map((p) => {
            const pct = upvotePct(p.up_count, p.down_count);
            return (
              <article key={p.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 hover:border-white/20">
                <Link to="/app/post/$postId" params={{ postId: p.id }} className="block">
                  <h2 className="font-semibold">{p.title}</h2>
                  {p.body && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{p.body}</p>}
                </Link>
                <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><ThumbsUp className="h-3 w-3" />{pct === null ? "—" : `${pct}%`}</span>
                  <span className="inline-flex items-center gap-1"><MessageSquare className="h-3 w-3" />{p.comment_count}</span>
                  <span>{timeAgo(p.created_at)}</span>
                  {p.tag && <span className="rounded-full bg-white/5 px-2 py-0.5">{p.tag}</span>}
                </div>
              </article>
            );
          })}
        </section>
      )}

      {tab === "comments" && (
        <section className="space-y-3">
          {comments.length === 0 && <p className="py-8 text-sm text-muted-foreground">No comments yet.</p>}
          {comments.map((c) => (
            <article key={c.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <Link to="/app/post/$postId" params={{ postId: c.post_id }} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                {c.post_title} <ArrowRight className="h-3 w-3" />
              </Link>
              <p className="mt-2 whitespace-pre-wrap text-sm">{c.body}</p>
              <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1"><ThumbsUp className="h-3 w-3" />{c.up_count - c.down_count} upvotes</span>
                <span>{timeAgo(c.created_at)}</span>
              </div>
            </article>
          ))}
        </section>
      )}

      {tab === "about" && (
        <section className="space-y-6">
          <div className="grid gap-3 md:grid-cols-3">
            <Tile icon={Clock} label="Tracked (30d)" value={formatShortDuration(stats?.total ?? 0)} />
            <Tile icon={Activity} label="Sessions" value={String(stats?.sessions ?? 0)} />
            <Tile icon={Sparkles} label="Active days" value={String(stats?.days ?? 0)} />
          </div>
          <AwardsShelf userId={userId} />
        </section>
      )}
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <p className="text-2xl font-bold tabular-nums">{value.toLocaleString()}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function Tile({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="h-3.5 w-3.5" /> {label}</div>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  );
}
