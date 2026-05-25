import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Clock, Activity, Sparkles, Lock } from "lucide-react";
import { formatShortDuration } from "@/lib/format";

export const Route = createFileRoute("/app/u/$userId")({
  head: () => ({ meta: [{ title: "Shared timeline — ALIOS" }] }),
  component: PublicTimelinePage,
});

function PublicTimelinePage() {
  const { userId } = Route.useParams();
  const [profile, setProfile] = useState<{ display_name: string | null; timeline_public: boolean } | null>(null);
  const [stats, setStats] = useState<{ total: number; sessions: number; days: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: p } = await supabase.from("profiles").select("display_name, timeline_public").eq("id", userId).maybeSingle();
      setProfile(p as any);
      if (p && (p as any).timeline_public) {
        const since = new Date(); since.setDate(since.getDate() - 30);
        const { data: sess } = await supabase
          .from("aux_sessions")
          .select("started_at, ended_at")
          .eq("user_id", userId)
          .gte("started_at", since.toISOString());
        let total = 0;
        const days = new Set<string>();
        (sess ?? []).forEach((s: any) => {
          const e = s.ended_at ? new Date(s.ended_at).getTime() : Date.now();
          total += Math.max(0, e - new Date(s.started_at).getTime());
          days.add(new Date(s.started_at).toISOString().slice(0, 10));
        });
        setStats({ total: Math.floor(total / 1000), sessions: (sess ?? []).length, days: days.size });
      }
      setLoading(false);
    })();
  }, [userId]);

  if (loading) return <div className="p-8"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  if (!profile?.timeline_public) {
    return (
      <div className="p-8 max-w-md mx-auto text-center space-y-3">
        <Lock className="h-8 w-8 mx-auto text-muted-foreground" />
        <h2 className="font-semibold">This timeline is private</h2>
        <p className="text-sm text-muted-foreground">The user hasn't enabled public timeline sharing.</p>
        <Link to="/app" className="text-sm text-primary hover:underline">← Back home</Link>
      </div>
    );
  }
  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-5xl mx-auto">
      <div className="rounded-3xl bg-gradient-to-br from-violet-500/20 via-cyan-500/10 to-pink-500/10 border border-white/10 p-6 lg:p-8">
        <p className="text-xs uppercase tracking-widest text-violet-200">🌐 Shared timeline</p>
        <h1 className="mt-1 text-3xl lg:text-4xl font-bold tracking-tight">{profile.display_name ?? "Someone"}</h1>
        <p className="text-sm text-muted-foreground mt-1">Last 30 days of activity, shared publicly.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <Tile icon={Clock} label="Total tracked" value={formatShortDuration(stats?.total ?? 0)} />
        <Tile icon={Activity} label="Sessions" value={String(stats?.sessions ?? 0)} />
        <Tile icon={Sparkles} label="Active days" value={String(stats?.days ?? 0)} />
      </div>
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
