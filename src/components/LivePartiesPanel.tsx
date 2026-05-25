import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Tv, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type Party = { id: string; title: string; media_kind: string; host_id: string; started_at: string };

export function LivePartiesPanel() {
  const [parties, setParties] = useState<Party[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const load = async () => {
      const { data } = await (supabase.from("watch_parties") as any)
        .select("id,title,media_kind,host_id,started_at,visibility")
        .is("ended_at", null)
        .eq("visibility", "public")
        .order("started_at", { ascending: false })
        .limit(6);
      const list = (data ?? []) as Party[];
      setParties(list);
      if (list.length) {
        const { data: parts } = await supabase
          .from("watch_party_participants")
          .select("party_id, left_at")
          .in("party_id", list.map((p) => p.id))
          .is("left_at", null);
        const map: Record<string, number> = {};
        (parts ?? []).forEach((p: any) => { map[p.party_id] = (map[p.party_id] ?? 0) + 1; });
        setCounts(map);
      }
    };
    load();
    const ch = supabase
      .channel("home-live-parties")
      .on("postgres_changes", { event: "*", schema: "public", table: "watch_parties" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "watch_party_participants" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  return (
    <section className="glass rounded-2xl p-5 lg:p-6">
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 shadow-lg shadow-pink-500/30">
          <Tv className="h-4 w-4 text-white" />
        </div>
        <div>
          <h3 className="text-sm font-semibold">🎬 Live watch parties</h3>
          <p className="text-[11px] text-muted-foreground">Hop into a public room — anyone can join.</p>
        </div>
        <div className="ml-auto flex gap-2">
          <Link to="/app/party"><Button size="sm" variant="outline" className="bg-white/5">Browse</Button></Link>
          <Link to="/app/party"><Button size="sm" className="bg-gradient-to-r from-pink-500 to-rose-500"><Plus className="h-3.5 w-3.5 mr-1" /> Start</Button></Link>
        </div>
      </div>
      {parties.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 p-6 text-center text-xs text-muted-foreground">
          No one is hosting right now. Be the first to throw a party 🎉
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {parties.map((p) => (
            <Link
              key={p.id}
              to="/app/hangout/$partyId"
              params={{ partyId: p.id }}
              className="group rounded-xl border border-white/10 bg-gradient-to-br from-pink-500/10 to-violet-500/10 p-3 hover:border-pink-500/40 transition"
            >
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-pink-300">
                <span className="h-1.5 w-1.5 rounded-full bg-pink-400 animate-pulse" /> Live · {p.media_kind}
              </div>
              <p className="mt-1 font-semibold text-sm truncate">{p.title}</p>
              <p className="mt-2 text-[11px] text-muted-foreground">{counts[p.id] ?? 0} watching</p>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
