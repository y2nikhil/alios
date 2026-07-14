import { useEffect, useRef } from "react";
import { useAux } from "@/lib/aux-store";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

const MILESTONES = [30, 60, 90, 120] as const;

/**
 * Watches the active AUX session and, when it crosses 30/60/90/120 productive
 * minutes, inserts a self-notification (dedup'd via focus_milestone_events).
 */
export function useFocusMilestones() {
  const { user } = useAuth();
  const { activeSession, activeStatus } = useAux();
  const firedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user || !activeSession || !activeStatus) return;
    if (activeStatus.category !== "productive") return;

    const check = async () => {
      const startedMs = new Date(activeSession.started_at).getTime();
      const elapsedMin = (Date.now() - startedMs) / 60000;
      for (const m of MILESTONES) {
        if (elapsedMin < m) continue;
        const key = `${activeSession.id}:${m}`;
        if (firedRef.current.has(key)) continue;
        firedRef.current.add(key);
        // Reserve the milestone (unique constraint prevents dupes across tabs)
        const { error: mErr } = await supabase
          .from("focus_milestone_events")
          .insert({ user_id: user.id, session_id: activeSession.id, milestone_minutes: m });
        if (mErr) continue; // already fired elsewhere
        const label = activeStatus.name;
        const celebration = m === 30
          ? `🎉 ${m} minutes of ${label} — nice focus streak!`
          : `🔥 ${m} minutes in ${label} — you're on fire!`;
        await supabase.from("notifications").insert({
          user_id: user.id,
          type: "focus_milestone",
          title: celebration,
          body: `Still going? Take a short breather when you're ready.`,
          link: "/app",
          metadata: { session_id: activeSession.id, minutes: m, status: label },
        });
      }
    };

    check();
    const i = setInterval(check, 60_000);
    return () => clearInterval(i);
  }, [user, activeSession, activeStatus]);
}
