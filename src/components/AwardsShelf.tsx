import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import * as Icons from "lucide-react";
import { Trophy } from "lucide-react";

type Award = {
  code: string; title: string; description: string;
  icon: string; tier: string; threshold_hours: number | null; category: string;
};
type UserAward = { award_code: string; earned_at: string };

const TIER_STYLES: Record<string, { ring: string; bg: string; text: string }> = {
  bronze:    { ring: "ring-amber-700/50", bg: "bg-amber-900/20", text: "text-amber-400" },
  silver:    { ring: "ring-slate-300/50", bg: "bg-slate-400/10", text: "text-slate-200" },
  gold:      { ring: "ring-yellow-400/60",bg: "bg-yellow-400/10",text: "text-yellow-300" },
  platinum:  { ring: "ring-cyan-300/60",  bg: "bg-cyan-400/10",  text: "text-cyan-200" },
  legendary: { ring: "ring-fuchsia-400/60",bg:"bg-fuchsia-500/10",text:"text-fuchsia-300"},
};

export function AwardsShelf({ userId, showLocked = true }: { userId?: string; showLocked?: boolean }) {
  const [awards, setAwards] = useState<Award[]>([]);
  const [unlocked, setUnlocked] = useState<UserAward[]>([]);

  useEffect(() => {
    (async () => {
      const [{ data: a }, { data: u }] = await Promise.all([
        (supabase.from("awards") as any).select("*"),
        userId
          ? (supabase.from("user_awards") as any).select("award_code, earned_at").eq("user_id", userId)
          : Promise.resolve({ data: [] as UserAward[] }),
      ]);
      setAwards((a ?? []) as Award[]);
      setUnlocked(((u ?? []) as UserAward[]));
    })();
  }, [userId]);

  const unlockedMap = useMemo(
    () => new Map(unlocked.map((u) => [u.award_code, u.earned_at])),
    [unlocked],
  );

  const list = useMemo(() => {
    const sorted = [...awards].sort((a, b) => {
      const at = a.threshold_hours ?? 9999;
      const bt = b.threshold_hours ?? 9999;
      return at - bt;
    });
    return showLocked ? sorted : sorted.filter((a) => unlockedMap.has(a.code));
  }, [awards, unlockedMap, showLocked]);

  if (list.length === 0) return null;

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="h-4 w-4 text-yellow-400" />
        <h3 className="font-semibold text-sm">Trophy shelf</h3>
        <span className="text-xs text-muted-foreground ml-auto">
          {unlocked.length} / {awards.length} unlocked
        </span>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
        {list.map((a) => {
          const Icon = (Icons as any)[a.icon] ?? Trophy;
          const earned = unlockedMap.has(a.code);
          const style = TIER_STYLES[a.tier] ?? TIER_STYLES.bronze;
          return (
            <div key={a.code}
              title={`${a.title} — ${a.description}${earned ? `\nEarned ${new Date(unlockedMap.get(a.code)!).toLocaleDateString()}` : "\nLocked"}`}
              className={`aspect-square rounded-xl grid place-items-center gap-1 p-2 text-center transition ${
                earned ? `ring-2 ${style.ring} ${style.bg}` : "bg-muted/20 opacity-40"
              }`}
            >
              <Icon className={`h-6 w-6 ${earned ? style.text : "text-muted-foreground"}`} />
              <p className={`text-[10px] font-semibold leading-tight ${earned ? "" : "text-muted-foreground"}`}>
                {a.title}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
