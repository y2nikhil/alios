import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Loader2, Clock, Activity, Sparkles, Lock, UserPlus, Users } from "lucide-react";
import { formatShortDuration } from "@/lib/format";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AwardsShelf } from "@/components/AwardsShelf";

export const Route = createFileRoute("/app/u/$userId")({
  head: () => ({ meta: [{ title: "Shared timeline — ALIOS" }] }),
  component: PublicTimelinePage,
});

function PublicTimelinePage() {
  const { userId } = Route.useParams();
  const { user } = useAuth();
  const [profile, setProfile] = useState<{ display_name: string | null; username: string | null; timeline_visibility: string } | null>(null);
  const [stats, setStats] = useState<{ total: number; sessions: number; days: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [friendStatus, setFriendStatus] = useState<"none" | "pending_out" | "pending_in" | "friends" | "self">("none");
  const [accessDenied, setAccessDenied] = useState(false);

  const loadAll = async () => {
    const { data: p } = await (supabase.from("profiles") as any)
      .select("display_name, username, timeline_visibility")
      .eq("id", userId).maybeSingle();
    if (!p) { setAccessDenied(true); setLoading(false); return; }
    setProfile(p as any);
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
    setStats({ total: Math.floor(total / 1000), sessions: (sess ?? []).length, days: days.size });

    if (user) {
      if (user.id === userId) setFriendStatus("self");
      else {
        const { data: fr } = await (supabase.from("friendships") as any)
          .select("status, requester_id, addressee_id")
          .or(`and(requester_id.eq.${user.id},addressee_id.eq.${userId}),and(requester_id.eq.${userId},addressee_id.eq.${user.id})`)
          .maybeSingle();
        if (!fr) setFriendStatus("none");
        else if (fr.status === "accepted") setFriendStatus("friends");
        else if (fr.requester_id === user.id) setFriendStatus("pending_out");
        else setFriendStatus("pending_in");
      }
    }
    setLoading(false);
  };

  useEffect(() => { loadAll(); /* eslint-disable-next-line */ }, [userId, user?.id]);

  const sendRequest = async () => {
    if (!user) return;
    const { error } = await (supabase.from("friendships") as any).insert({ requester_id: user.id, addressee_id: userId });
    if (error) toast.error(error.message);
    else { toast.success("Friend request sent"); setFriendStatus("pending_out"); }
  };

  if (loading) return <div className="p-8"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  if (accessDenied || !profile) {
    return (
      <div className="p-8 max-w-md mx-auto text-center space-y-3">
        <Lock className="h-8 w-8 mx-auto text-muted-foreground" />
        <h2 className="font-semibold">This timeline is private</h2>
        <p className="text-sm text-muted-foreground">
          {profile?.timeline_visibility === "friends"
            ? "Only friends can see this timeline. Send a friend request to unlock it."
            : "The user has set their timeline to private."}
        </p>
        {user && friendStatus === "none" && (
          <Button onClick={sendRequest} size="sm" className="bg-gradient-to-r from-violet-500 to-cyan-400">
            <UserPlus className="h-3.5 w-3.5 mr-1.5" /> Send friend request
          </Button>
        )}
        <div><Link to="/app" className="text-sm text-primary hover:underline">← Back home</Link></div>
      </div>
    );
  }
  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-5xl mx-auto">
      <div className="rounded-3xl bg-gradient-to-br from-violet-500/20 via-cyan-500/10 to-pink-500/10 border border-white/10 p-6 lg:p-8">
        <p className="text-xs uppercase tracking-widest text-violet-200">🌐 Shared timeline</p>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">{profile.display_name ?? profile.username ?? "Someone"}</h1>
            {profile.username && <p className="text-sm text-muted-foreground">@{profile.username}</p>}
          </div>
          {user && friendStatus === "none" && (
            <Button onClick={sendRequest} size="sm" className="bg-gradient-to-r from-violet-500 to-cyan-400">
              <UserPlus className="h-3.5 w-3.5 mr-1.5" /> Add friend
            </Button>
          )}
          {friendStatus === "friends" && (
            <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-400/30">
              <Users className="h-3 w-3" /> Friends
            </span>
          )}
          {friendStatus === "pending_out" && <span className="text-xs px-3 py-1.5 rounded-full bg-white/5 text-muted-foreground">Request sent</span>}
          {friendStatus === "pending_in" && <Link to="/app/friends" className="text-xs px-3 py-1.5 rounded-full bg-violet-500/15 text-violet-200">Respond to request →</Link>}
        </div>
        <p className="text-sm text-muted-foreground mt-2">Last 30 days of activity</p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <Tile icon={Clock} label="Total tracked" value={formatShortDuration(stats?.total ?? 0)} />
        <Tile icon={Activity} label="Sessions" value={String(stats?.sessions ?? 0)} />
        <Tile icon={Sparkles} label="Active days" value={String(stats?.days ?? 0)} />
      </div>
      <AwardsShelf userId={userId} />
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
