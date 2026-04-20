import { useMemo } from "react";
import { useAux } from "@/lib/aux-store";

export type DailyStats = {
  totalSeconds: number;
  productiveSeconds: number;
  unproductiveSeconds: number;
  neutralSeconds: number;
  focusScore: number;
  longestStreak: number;
  avgBreak: number;
  breakCount: number;
};

export function useDailyStats(): DailyStats {
  const { todaySessions, statuses, activeSession } = useAux();

  return useMemo(() => {
    const statusMap = new Map(statuses.map((s) => [s.id, s]));
    let total = 0;
    let prod = 0;
    let unprod = 0;
    let neu = 0;
    let longest = 0;
    let breakSum = 0;
    let breakCount = 0;

    const now = Date.now();
    for (const sess of todaySessions) {
      const start = new Date(sess.started_at).getTime();
      const end = sess.ended_at ? new Date(sess.ended_at).getTime() : now;
      const dur = Math.max(0, Math.floor((end - start) / 1000));
      total += dur;
      const status = statusMap.get(sess.status_id);
      if (!status) continue;
      if (status.category === "productive") {
        prod += dur;
        if (dur > longest) longest = dur;
      } else if (status.category === "unproductive") {
        unprod += dur;
      } else {
        neu += dur;
      }
      const lname = status.name.toLowerCase();
      if (lname.includes("break") || lname.includes("lunch")) {
        breakSum += dur;
        breakCount += 1;
      }
    }

    const score = total > 0 ? Math.round(((prod + neu * 0.3) / total) * 100) : 0;
    const avgBreak = breakCount > 0 ? Math.floor(breakSum / breakCount) : 0;

    return {
      totalSeconds: total,
      productiveSeconds: prod,
      unproductiveSeconds: unprod,
      neutralSeconds: neu,
      focusScore: Math.min(100, score),
      longestStreak: longest,
      avgBreak,
      breakCount,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todaySessions, statuses, activeSession?.id]);
}
