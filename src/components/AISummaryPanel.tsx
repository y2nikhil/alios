import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Lightbulb, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useDailyStats } from "@/lib/use-daily-stats";
import { useAux } from "@/lib/aux-store";
import { formatShortDuration } from "@/lib/format";

export function AISummaryPanel() {
  const stats = useDailyStats();
  const { activeStatus, todaySessions, statuses } = useAux();
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const productivePct = stats.productiveSeconds + stats.unproductiveSeconds + stats.neutralSeconds > 0
    ? Math.round((stats.productiveSeconds / (stats.productiveSeconds + stats.unproductiveSeconds + stats.neutralSeconds)) * 100)
    : 0;

  // Top status of the day
  const topStatus = (() => {
    const totals = new Map<string, number>();
    for (const s of todaySessions) {
      const end = s.ended_at ? new Date(s.ended_at).getTime() : Date.now();
      const dur = Math.floor((end - new Date(s.started_at).getTime()) / 1000);
      totals.set(s.status_id, (totals.get(s.status_id) ?? 0) + dur);
    }
    let bestId: string | null = null; let bestDur = 0;
    for (const [id, dur] of totals) if (dur > bestDur) { bestDur = dur; bestId = id; }
    const st = statuses.find((s) => s.id === bestId);
    return st ? { name: st.name, color: st.color, seconds: bestDur } : null;
  })();

  const fetchInsight = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/ai-insights", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
      });
      const json = await res.json();
      setInsight(json.insight ?? "No insight available.");
    } catch {
      setInsight("AI insight unavailable right now.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void fetchInsight(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const greeting = (() => {
    const h = new Date().getHours();
    if (productivePct >= 70) return "You're having an amazing day! 🎉";
    if (productivePct >= 40) return "Solid progress so far 💪";
    if (h < 12) return "Fresh start — let's build momentum ☀️";
    return "Every session counts — keep going 🌱";
  })();

  return (
    <div className="relative overflow-hidden rounded-3xl glass p-5 lg:p-6">
      {/* Ambient glow */}
      <div aria-hidden className="pointer-events-none absolute -top-16 -right-16 h-56 w-56 rounded-full bg-gradient-to-br from-violet-500/40 to-cyan-400/30 blur-3xl" />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -left-16 h-48 w-48 rounded-full bg-fuchsia-500/20 blur-3xl"
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-cyan-400 shadow-lg shadow-violet-500/30">
            <Sparkles className="h-3.5 w-3.5 text-white" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">ALIOS AI Summary</p>
        </div>
        <button
          onClick={fetchInsight}
          disabled={loading}
          title="Regenerate insight"
          className="h-7 w-7 grid place-items-center rounded-lg hover:bg-white/5 text-muted-foreground hover:text-foreground transition disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
        </button>
      </div>

      <p className="relative mt-4 text-lg font-bold tracking-tight">{greeting}</p>

      <div className="relative mt-4 space-y-2.5 text-sm">
        {topStatus && (
          <div className="flex items-start gap-2">
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: topStatus.color }} />
            <p className="text-foreground/90">
              You spent <strong>{formatShortDuration(topStatus.seconds)}</strong> in <strong>{topStatus.name}</strong> today.
            </p>
          </div>
        )}
        {stats.longestStreak > 0 && (
          <div className="flex items-start gap-2">
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-400" />
            <p className="text-foreground/90">
              Your longest focus session was <strong>{formatShortDuration(stats.longestStreak)}</strong>.
            </p>
          </div>
        )}
        {activeStatus && (
          <div className="flex items-start gap-2">
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full animate-pulse-glow" style={{ backgroundColor: activeStatus.color, color: activeStatus.color }} />
            <p className="text-foreground/90">
              Currently on <strong>{activeStatus.name}</strong>.
            </p>
          </div>
        )}
      </div>

      <div className="relative mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-violet-300">
          <Lightbulb className="h-3 w-3" /> AI Recommendation
        </div>
        <p className="mt-2 text-sm leading-relaxed text-foreground/90 min-h-[2.5rem]">
          {loading && !insight ? (
            <span className="inline-flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking about your day…
            </span>
          ) : (
            insight ?? "Track a few sessions and I'll surface patterns."
          )}
        </p>
      </div>
    </div>
  );
}
