import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Tv, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ytThumb } from "@/lib/youtube";
import { cn } from "@/lib/utils";

export type LiveParty = {
  id: string;
  title: string;
  media_kind: string;
  media_id: string | null;
  poster_url: string | null;
  started_at: string;
};

export function partyThumb(p: { poster_url: string | null; media_kind: string; media_id: string | null }) {
  if (p.poster_url) return p.poster_url;
  if (p.media_id && (p.media_kind === "youtube" || p.media_kind === "video" || p.media_kind === "playlist")) {
    return ytThumb(p.media_id);
  }
  return null;
}

export function useLiveParties(limit = 12) {
  const [parties, setParties] = useState<LiveParty[]>([]);
  useEffect(() => {
    const load = async () => {
      const { data } = await (supabase.from("watch_parties") as any)
        .select("id,title,media_kind,media_id,poster_url,started_at,visibility")
        .is("ended_at", null)
        .eq("visibility", "public")
        .order("started_at", { ascending: false })
        .limit(limit);
      setParties((data ?? []) as LiveParty[]);
    };
    load();
    const ch = supabase
      .channel("live-parties-slider")
      .on("postgres_changes", { event: "*", schema: "public", table: "watch_parties" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [limit]);
  return parties;
}

/** Auto-rotating banner slider of live public watch parties. */
export function LivePartiesSlider({ className }: { className?: string }) {
  const parties = useLiveParties(8);
  const [idx, setIdx] = useState(0);
  const hover = useRef(false);

  useEffect(() => { if (idx >= parties.length) setIdx(0); }, [parties.length, idx]);

  useEffect(() => {
    if (parties.length < 2) return;
    const t = setInterval(() => { if (!hover.current) setIdx((i) => (i + 1) % parties.length); }, 4500);
    return () => clearInterval(t);
  }, [parties.length]);

  if (parties.length === 0) {
    return (
      <div className={cn("rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-4 flex items-center gap-3", className)}>
        <div className="h-9 w-9 shrink-0 grid place-items-center rounded-xl bg-white/5">
          <Tv className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">No live watch parties</p>
          <p className="text-[11px] text-muted-foreground">Start one and study together.</p>
        </div>
        <Link
          to="/app/party"
          className="shrink-0 inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold hover:bg-white/10"
        >
          <Plus className="h-3 w-3" /> Start
        </Link>
      </div>
    );
  }

  const p = parties[idx];
  const thumb = partyThumb(p);

  return (
    <div
      onMouseEnter={() => (hover.current = true)}
      onMouseLeave={() => (hover.current = false)}
      className={cn("relative rounded-2xl border border-white/10 overflow-hidden", className)}
    >
      <Link to="/app/hangout/$partyId" params={{ partyId: p.id }} className="flex items-stretch gap-3">
        <div className="relative h-20 w-32 shrink-0 bg-white/5">
          {thumb ? (
            <img src={thumb} alt={`${p.title} watch party thumbnail`} loading="lazy" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full grid place-items-center"><Tv className="h-5 w-5 text-muted-foreground" /></div>
          )}
        </div>
        <div className="flex-1 min-w-0 py-2.5 pr-3">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-pink-300">
            <span className="h-1.5 w-1.5 rounded-full bg-pink-400 animate-pulse" /> Live · {p.media_kind}
          </div>
          <p className="mt-1 text-sm font-semibold truncate">{p.title}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Tap to join the room</p>
        </div>
      </Link>

      {parties.length > 1 && (
        <>
          <button
            onClick={() => setIdx((i) => (i - 1 + parties.length) % parties.length)}
            aria-label="Previous watch party"
            className="absolute left-1 top-1/2 -translate-y-1/2 h-7 w-7 grid place-items-center rounded-full bg-black/50 hover:bg-black/70 text-foreground"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setIdx((i) => (i + 1) % parties.length)}
            aria-label="Next watch party"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 grid place-items-center rounded-full bg-black/50 hover:bg-black/70 text-foreground"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
          <div className="absolute bottom-1.5 right-2 flex gap-1">
            {parties.map((x, i) => (
              <button
                key={x.id}
                onClick={() => setIdx(i)}
                aria-label={`Show ${x.title}`}
                className={cn("h-1.5 rounded-full transition-all", i === idx ? "w-4 bg-foreground" : "w-1.5 bg-foreground/30")}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
