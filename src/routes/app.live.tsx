import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Activity, Users, Tv, Zap, Square, Loader2, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/lib/use-role";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/app/live")({
  beforeLoad: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw redirect({ to: "/login" });
  },
  head: () => ({ meta: [{ title: "Live Feed — ALIOS" }] }),
  component: LiveFeedPage,
});

type ActiveSession = { id: string; user_id: string; started_at: string; status_id: string; email?: string; status_name?: string };
type LiveParty = { id: string; title: string; host_id: string; visibility: string; started_at: string; viewers: number };

function LiveFeedPage() {
  const { isAdmin, loading: roleLoading } = useRole();
  const [active, setActive] = useState<ActiveSession[]>([]);
  const [parties, setParties] = useState<LiveParty[]>([]);
  const [signups, setSignups] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [{ data: sess }, { data: ps }, { data: ev }] = await Promise.all([
      supabase.from("aux_sessions").select("*").is("ended_at", null).order("started_at", { ascending: false }).limit(50),
      (supabase.from("watch_parties") as any).select("id,title,host_id,visibility,started_at").is("ended_at", null).order("started_at", { ascending: false }),
      supabase.from("account_events").select("id").eq("event_type", "signup").gte("created_at", new Date(Date.now() - 24 * 3600 * 1000).toISOString()),
    ]);
    const rows = (sess ?? []) as ActiveSession[];
    // enrich emails + status name
    await Promise.all(rows.map(async (r) => {
      const { data: e } = await supabase.rpc("get_user_email", { _user_id: r.user_id });
      r.email = (e as string) ?? undefined;
      const { data: s } = await supabase.from("aux_statuses").select("name").eq("id", r.status_id).maybeSingle();
      r.status_name = (s as any)?.name;
    }));
    setActive(rows);

    const list = (ps ?? []) as any[];
    if (list.length) {
      const { data: parts } = await supabase.from("watch_party_participants")
        .select("party_id").in("party_id", list.map((p) => p.id)).is("left_at", null);
      const map: Record<string, number> = {};
      (parts ?? []).forEach((p: any) => { map[p.party_id] = (map[p.party_id] ?? 0) + 1; });
      setParties(list.map((p) => ({ ...p, viewers: map[p.id] ?? 0 })));
    } else setParties([]);

    setSignups((ev ?? []).length);
    setLoading(false);
  };

  useEffect(() => {
    if (!isAdmin) return;
    load();
    const ch = supabase
      .channel("live-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "aux_sessions" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "watch_parties" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "watch_party_participants" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const endParty = async (id: string) => {
    const { error } = await supabase.rpc("end_watch_party" as any, { _party_id: id });
    if (error) toast.error(error.message); else toast.success("Party ended");
  };

  if (roleLoading) return <div className="p-8"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  if (!isAdmin) {
    return (
      <div className="p-8 max-w-md mx-auto text-center space-y-3">
        <Shield className="h-8 w-8 mx-auto text-muted-foreground" />
        <h2 className="font-semibold">Admins only</h2>
        <p className="text-sm text-muted-foreground">The live feed is reserved for admins and super admins.</p>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <p className="text-xs uppercase tracking-widest text-cyan-300">🛰 Live Feed</p>
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">What's happening right now</h1>
        <p className="text-sm text-muted-foreground">Realtime activity across the whole org.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Tile icon={Activity} label="Active sessions" value={String(active.length)} tone="from-cyan-500 to-blue-500" />
        <Tile icon={Tv} label="Live parties" value={String(parties.length)} tone="from-pink-500 to-rose-500" />
        <Tile icon={Users} label="People watching" value={String(parties.reduce((a, p) => a + p.viewers, 0))} tone="from-violet-500 to-fuchsia-500" />
        <Tile icon={Zap} label="Signups (24h)" value={String(signups)} tone="from-emerald-500 to-teal-500" />
      </div>

      <section className="glass rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Tv className="h-4 w-4 text-pink-400" />
          <h3 className="font-semibold text-sm">Active watch parties</h3>
        </div>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : parties.length === 0 ? (
          <p className="text-xs text-muted-foreground">No live parties.</p>
        ) : (
          <div className="space-y-2">
            {parties.map((p) => (
              <div key={p.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                <span className="h-2 w-2 rounded-full bg-pink-400 animate-pulse" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.title}</p>
                  <p className="text-[10px] text-muted-foreground">{p.visibility} · {p.viewers} watching · since {new Date(p.started_at).toLocaleTimeString()}</p>
                </div>
                <Link to="/app/hangout/$partyId" params={{ partyId: p.id }}>
                  <Button size="sm" variant="outline" className="bg-white/5">Open</Button>
                </Link>
                <Button size="sm" variant="destructive" onClick={() => endParty(p.id)}>
                  <Square className="h-3 w-3 mr-1" /> End
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="glass rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="h-4 w-4 text-cyan-400" />
          <h3 className="font-semibold text-sm">Active users right now</h3>
        </div>
        {active.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nobody punched in.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {active.map((s) => (
              <div key={s.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 grid place-items-center text-xs font-bold text-white">
                  {(s.email?.[0] ?? "?").toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{s.email ?? "unknown"}</p>
                  <p className="text-[10px] text-muted-foreground">{s.status_name ?? "—"} · {Math.round((Date.now() - new Date(s.started_at).getTime()) / 60000)}m</p>
                </div>
                <Link to="/app/u/$userId" params={{ userId: s.user_id }} className="text-[10px] text-primary hover:underline">view</Link>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Tile({ icon: Icon, label, value, tone }: { icon: any; label: string; value: string; tone: string }) {
  return (
    <div className="glass rounded-2xl p-5 relative overflow-hidden">
      <div className={`absolute -top-8 -right-8 h-24 w-24 rounded-full opacity-20 blur-2xl bg-gradient-to-br ${tone}`} />
      <div className="relative">
        <div className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="h-3.5 w-3.5" /> {label}</div>
        <p className="mt-2 text-3xl font-bold">{value}</p>
      </div>
    </div>
  );
}
