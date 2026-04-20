import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

type Schedule = {
  day_of_week: number;
  start_time: string; // "HH:MM:SS"
  end_time: string;
  required_status_category: "productive" | "neutral" | "unproductive";
  break_minutes: number;
};

type Session = {
  status_id: string;
  started_at: string;
  ended_at: string | null;
};

type Status = {
  id: string;
  category: "productive" | "neutral" | "unproductive";
};

function parseHMS(t: string) {
  const [h, m, s] = t.split(":").map(Number);
  return h * 3600 + m * 60 + (s || 0);
}

/**
 * Compute today's schedule adherence (0-100).
 * Penalty for missing scheduled productive minutes; penalty for break overrun.
 */
export function useTodayAdherence() {
  const { user } = useAuth();
  const [score, setScore] = useState<number | null>(null);
  const [hasSchedule, setHasSchedule] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    async function compute() {
      setLoading(true);
      const today = new Date();
      const dow = today.getDay();
      const dayStart = new Date(today);
      dayStart.setHours(0, 0, 0, 0);

      const [schRes, sessRes, statRes] = await Promise.all([
        supabase
          .from("schedules")
          .select("day_of_week,start_time,end_time,required_status_category,break_minutes,user_id")
          .or(`user_id.eq.${user!.id},user_id.is.null`)
          .eq("day_of_week", dow),
        supabase
          .from("aux_sessions")
          .select("status_id,started_at,ended_at")
          .eq("user_id", user!.id)
          .gte("started_at", dayStart.toISOString()),
        supabase.from("aux_statuses").select("id,category").eq("user_id", user!.id),
      ]);

      if (cancelled) return;

      const schedules: Schedule[] = (schRes.data ?? []) as Schedule[];
      const sessions: Session[] = (sessRes.data ?? []) as Session[];
      const statuses: Status[] = (statRes.data ?? []) as Status[];
      const catById = new Map(statuses.map((s) => [s.id, s.category]));

      if (schedules.length === 0) {
        setHasSchedule(false);
        setScore(null);
        setLoading(false);
        return;
      }
      setHasSchedule(true);

      // For each schedule window, compute scheduled seconds and how many of those overlap
      // with sessions whose status category matches required.
      let scheduledSec = 0;
      let workedSec = 0;
      let breakOverrunMin = 0;
      const nowSec = (Date.now() - dayStart.getTime()) / 1000;

      for (const sch of schedules) {
        const startSec = parseHMS(sch.start_time);
        const endSec = parseHMS(sch.end_time);
        const windowEnd = Math.min(endSec, nowSec); // only count up to "now"
        if (windowEnd <= startSec) continue;
        const winSec = windowEnd - startSec;
        scheduledSec += winSec;

        // total time spent in correct category during window
        let breakSec = 0;
        for (const sess of sessions) {
          const sStart = (new Date(sess.started_at).getTime() - dayStart.getTime()) / 1000;
          const sEnd = sess.ended_at
            ? (new Date(sess.ended_at).getTime() - dayStart.getTime()) / 1000
            : nowSec;
          const overlap = Math.max(0, Math.min(sEnd, windowEnd) - Math.max(sStart, startSec));
          if (overlap === 0) continue;
          const cat = catById.get(sess.status_id);
          if (cat === sch.required_status_category) {
            workedSec += overlap;
          } else if (cat === "neutral") {
            breakSec += overlap;
          }
        }
        const allowedBreakSec = sch.break_minutes * 60;
        if (breakSec > allowedBreakSec) {
          breakOverrunMin += (breakSec - allowedBreakSec) / 60;
        }
      }

      let s = 100;
      if (scheduledSec > 0) {
        const ratio = workedSec / scheduledSec;
        s = Math.round(ratio * 100);
        // break overrun penalty: -2 per min over, capped at -30
        s -= Math.min(30, Math.round(breakOverrunMin * 2));
      }
      s = Math.max(0, Math.min(100, s));
      setScore(s);
      setLoading(false);

      // Persist cache
      const todayDate = today.toISOString().slice(0, 10);
      await supabase.from("daily_adherence").upsert(
        {
          user_id: user!.id,
          for_date: todayDate,
          score: s,
          scheduled_minutes: Math.round(scheduledSec / 60),
          worked_minutes: Math.round(workedSec / 60),
          break_overrun_minutes: Math.round(breakOverrunMin),
        },
        { onConflict: "user_id,for_date" },
      );
    }
    compute();
    const i = setInterval(compute, 60_000);
    return () => {
      cancelled = true;
      clearInterval(i);
    };
  }, [user]);

  return { score, hasSchedule, loading };
}
