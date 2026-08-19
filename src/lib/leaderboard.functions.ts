import { createServerFn } from "@tanstack/react-start";

export type LeaderboardEntry = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  productive_seconds: number;
};

export const getTodayLeaderboard = createServerFn({ method: "GET" }).handler(
  async (): Promise<LeaderboardEntry[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { data: sessions, error } = await supabaseAdmin
      .from("aux_sessions")
      .select(
        `
        user_id,
        started_at,
        ended_at,
        duration_seconds,
        aux_statuses!inner(category)
      `
      )
      .gte("started_at", todayStart.toISOString())
      .order("started_at", { ascending: false });

    if (error || !sessions) {
      console.error("leaderboard error", error);
      return [];
    }

    const productiveByUser = new Map<string, number>();
    const now = Date.now();

    for (const sess of sessions as any[]) {
      const category = sess.aux_statuses?.category;
      if (category !== "productive") continue;

      let seconds = sess.duration_seconds;
      if (typeof seconds !== "number") {
        const start = new Date(sess.started_at).getTime();
        const end = sess.ended_at ? new Date(sess.ended_at).getTime() : now;
        seconds = Math.max(0, Math.floor((end - start) / 1000));
      }

      productiveByUser.set(sess.user_id, (productiveByUser.get(sess.user_id) ?? 0) + seconds);
    }

    const userIds = Array.from(productiveByUser.keys()).slice(0, 10);
    if (userIds.length === 0) return [];

    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, display_name, avatar_url")
      .in("id", userIds);

    const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));

    return userIds
      .map((user_id) => {
        const profile = profileMap.get(user_id);
        return {
          user_id,
          display_name: profile?.display_name ?? null,
          avatar_url: profile?.avatar_url ?? null,
          productive_seconds: productiveByUser.get(user_id) ?? 0,
        };
      })
      .sort((a, b) => b.productive_seconds - a.productive_seconds)
      .slice(0, 5);
  }
);
