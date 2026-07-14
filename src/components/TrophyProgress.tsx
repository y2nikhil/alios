import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import * as Icons from "lucide-react";
import { Trophy, ChevronLeft, ChevronRight, Info, Sparkles, Loader2, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Award = {
  code: string; title: string; description: string;
  icon: string; tier: string; threshold_hours: number | null; category: string;
};
type UserAward = { award_code: string };

const TIER_STYLES: Record<string, { ring: string; bg: string; text: string; grad: string }> = {
  bronze:    { ring: "ring-amber-700/60",   bg: "bg-amber-900/30",   text: "text-amber-300",   grad: "from-amber-700 to-amber-500" },
  silver:    { ring: "ring-slate-300/60",   bg: "bg-slate-400/20",   text: "text-slate-100",   grad: "from-slate-400 to-slate-200" },
  gold:      { ring: "ring-yellow-400/70",  bg: "bg-yellow-400/20",  text: "text-yellow-200",  grad: "from-yellow-500 to-amber-300" },
  platinum:  { ring: "ring-cyan-300/70",    bg: "bg-cyan-400/20",    text: "text-cyan-100",    grad: "from-cyan-400 to-teal-300" },
  legendary: { ring: "ring-fuchsia-400/70", bg: "bg-fuchsia-500/20", text: "text-fuchsia-200", grad: "from-fuchsia-500 to-pink-400" },
};

export function TrophyProgress({ userId }: { userId?: string }) {
  const [awards, setAwards] = useState<Award[]>([]);
  const [unlocked, setUnlocked] = useState<Set<string>>(new Set());
  const [hoursTracked, setHoursTracked] = useState(0);
  const [infoOpen, setInfoOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: a }, u] = await Promise.all([
        (supabase.from("awards") as any).select("*"),
        userId
          ? (supabase.from("user_awards") as any).select("award_code").eq("user_id", userId)
          : Promise.resolve({ data: [] as UserAward[] }),
      ]);
      setAwards((a ?? []) as Award[]);
      setUnlocked(new Set(((u.data ?? []) as UserAward[]).map((x) => x.award_code)));

      if (userId) {
        const { data: sess } = await (supabase.from("aux_sessions") as any)
          .select("started_at,ended_at")
          .eq("user_id", userId)
          .limit(2000);
        let ms = 0;
        for (const s of (sess ?? []) as any[]) {
          const end = s.ended_at ? new Date(s.ended_at).getTime() : Date.now();
          ms += Math.max(0, end - new Date(s.started_at).getTime());
        }
        setHoursTracked(ms / 3_600_000);
      }
    })();
  }, [userId]);

  // Hours-based journey: prev unlocked → next locked
  const hoursAwards = useMemo(
    () => [...awards]
      .filter((a) => a.category === "hours" && a.threshold_hours != null)
      .sort((a, b) => (a.threshold_hours! - b.threshold_hours!)),
    [awards],
  );

  const nextIdx = useMemo(() => {
    const i = hoursAwards.findIndex((a) => !unlocked.has(a.code));
    return i === -1 ? hoursAwards.length - 1 : i;
  }, [hoursAwards, unlocked]);

  // Carousel step: user can browse across all hour milestones
  const [idx, setIdx] = useState(0);
  useEffect(() => { setIdx(nextIdx); }, [nextIdx]);

if (hoursAwards.length === 0) return null;

  const safeIdx = Math.max(0, Math.min(idx, hoursAwards.length - 1));
  const next = hoursAwards[safeIdx];
  if (!next) return null;

  const prev = idx > 0 ? hoursAwards[idx - 1] : null;
  const prevThreshold = prev?.threshold_hours ?? 0;
  const nextThreshold = next.threshold_hours!;
  const span = Math.max(1, nextThreshold - prevThreshold);
  const done = Math.min(nextThreshold, Math.max(prevThreshold, hoursTracked));
  const pct = Math.max(0, Math.min(100, ((done - prevThreshold) / span) * 100));
  const isNextUnlocked = unlocked.has(next.code);
  const remaining = Math.max(0, nextThreshold - hoursTracked);

  const PrevIcon = prev ? ((Icons as any)[prev.icon] ?? Trophy) : Trophy;
  const NextIcon = (Icons as any)[next.icon] ?? Trophy;
  const prevStyle = prev ? (TIER_STYLES[prev.tier] ?? TIER_STYLES.bronze) : TIER_STYLES.bronze;
  const nextStyle = TIER_STYLES[next.tier] ?? TIER_STYLES.bronze;

  return (
    <>
      <div className="glass rounded-3xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Trophy className="h-3.5 w-3.5 text-amber-400" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
              Trophy Journey
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setInfoOpen(true)}
              className="h-7 w-7 grid place-items-center rounded-full hover:bg-white/10 transition text-cyan-300"
              aria-label="Ask AI about trophies"
              title="Ask AI what trophies are for"
            >
              <Sparkles className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setIdx((i) => Math.max(0, i - 1))}
              disabled={idx <= 0}
              className="h-7 w-7 grid place-items-center rounded-full hover:bg-white/10 disabled:opacity-30"
              aria-label="Previous trophy"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setIdx((i) => Math.min(hoursAwards.length - 1, i + 1))}
              disabled={idx >= hoursAwards.length - 1}
              className="h-7 w-7 grid place-items-center rounded-full hover:bg-white/10 disabled:opacity-30"
              aria-label="Next trophy"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Left — previous / current */}
          <div className="flex flex-col items-center gap-1 shrink-0 w-16">
            <div className={cn(
              "h-12 w-12 rounded-full grid place-items-center ring-2",
              prev ? `${prevStyle.ring} ${prevStyle.bg}` : "ring-muted/30 bg-muted/10",
            )}>
              <PrevIcon className={cn("h-5 w-5", prev ? prevStyle.text : "text-muted-foreground")} />
            </div>
            <p className="text-[10px] font-semibold text-center leading-tight">
              {prev ? prev.title : "Start"}
            </p>
            <p className="text-[9px] text-muted-foreground">{prevThreshold}h</p>
          </div>

          {/* Progress bar */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-semibold text-emerald-300 bg-emerald-400/15 rounded-full px-2 py-0.5">
                {isNextUnlocked ? "UNLOCKED" : "IN PROGRESS"}
              </span>
              <span className="text-[10px] font-semibold text-muted-foreground">
                {Math.round(pct)}%
              </span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-muted/30 overflow-hidden">
              <div
                className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-500", nextStyle.grad)}
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
              {isNextUnlocked
                ? `You've logged ${hoursTracked.toFixed(1)}h`
                : `${remaining.toFixed(1)}h to go · ${hoursTracked.toFixed(1)}h logged`}
            </p>
          </div>

          {/* Right — next */}
          <div className="flex flex-col items-center gap-1 shrink-0 w-16">
            <div className={cn(
              "h-12 w-12 rounded-full grid place-items-center ring-2",
              isNextUnlocked ? `${nextStyle.ring} ${nextStyle.bg}` : "ring-muted/30 bg-muted/10 opacity-70",
            )}>
              <NextIcon className={cn("h-5 w-5", isNextUnlocked ? nextStyle.text : "text-muted-foreground")} />
            </div>
            <p className="text-[10px] font-semibold text-center leading-tight">{next.title}</p>
            <p className="text-[9px] text-muted-foreground">{nextThreshold}h</p>
          </div>
        </div>
      </div>

      <TrophyInfoDialog open={infoOpen} onOpenChange={setInfoOpen} awards={awards} unlocked={unlocked} />
    </>
  );
}

export function TrophyInfoDialog({
  open, onOpenChange, awards, unlocked,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  awards: Award[];
  unlocked: Set<string>;
}) {
  const [answer, setAnswer] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const askAi = async () => {
    setLoading(true);
    setAnswer("");
    try {
      const list = awards.map((a) => `- ${a.title} (${a.tier})${a.threshold_hours ? `, ${a.threshold_hours}h` : ""}: ${a.description}`).join("\n");
      const question = `Explain the following trophies briefly for a student using our study app. Give a friendly one-line meaning for each, and a short tip to earn the ones they haven't yet.\n\nUnlocked: ${Array.from(unlocked).join(", ") || "none"}\n\nAll trophies:\n${list}`;
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/ai-ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ question }),
      });
      const j = await res.json();
      setAnswer(j.answer ?? "No response.");
    } catch (e: any) {
      setAnswer("Couldn't reach the AI right now.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && !answer && !loading) askAi();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-cyan-400" /> What are these trophies for?
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-xl bg-accent/40 p-3">
            <p className="text-xs text-muted-foreground mb-2">
              Trophies celebrate your consistency. Log study time with the AUX timer to unlock hour-based badges, keep daily streaks alive for streak awards, and connect with friends for social ones.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {awards.slice().sort((a, b) => (a.threshold_hours ?? 9999) - (b.threshold_hours ?? 9999)).map((a) => {
                const Icon = (Icons as any)[a.icon] ?? Trophy;
                const earned = unlocked.has(a.code);
                const style = TIER_STYLES[a.tier] ?? TIER_STYLES.bronze;
                return (
                  <div key={a.code} className={cn(
                    "flex items-start gap-2 rounded-lg p-2 text-[11px]",
                    earned ? `ring-1 ${style.ring} ${style.bg}` : "bg-muted/20 opacity-70",
                  )}>
                    <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", earned ? style.text : "text-muted-foreground")} />
                    <div className="min-w-0">
                      <p className="font-semibold leading-tight">{a.title}</p>
                      <p className="text-muted-foreground text-[10px] leading-snug">{a.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-3">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
              <p className="text-xs font-semibold">AI coach</p>
              <Button size="sm" variant="ghost" className="ml-auto h-6 text-[10px]" onClick={askAi} disabled={loading}>
                Refresh
              </Button>
            </div>
            {loading ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Asking the AI…
              </div>
            ) : (
              <p className="text-xs whitespace-pre-wrap leading-relaxed">{answer}</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
