import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

export const Route = createFileRoute("/api/ai-insights")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const cors = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };
        try {
          const auth = request.headers.get("authorization");
          if (!auth) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: cors });
          const SUPABASE_URL = process.env.SUPABASE_URL!;
          const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY!;
          const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
          const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
            global: { headers: { Authorization: auth } },
          });
          const { data: { user } } = await sb.auth.getUser();
          if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: cors });
          if (!LOVABLE_API_KEY) {
            return new Response(JSON.stringify({ insight: "AI is not configured." }), { status: 200, headers: cors });
          }

          const since = new Date();
          since.setDate(since.getDate() - 7);
          const [{ data: sessions }, { data: statuses }] = await Promise.all([
            sb.from("aux_sessions").select("status_id, started_at, ended_at").eq("user_id", user.id).gte("started_at", since.toISOString()),
            sb.from("aux_statuses").select("id, name, category").eq("user_id", user.id),
          ]);

          const stMap = new Map((statuses ?? []).map((s: any) => [s.id, s]));
          const summary = (sessions ?? []).map((s: any) => {
            const st = stMap.get(s.status_id);
            const dur = s.ended_at ? Math.floor((new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 60000) : 0;
            return { name: (st as any)?.name, category: (st as any)?.category, hour: new Date(s.started_at).getHours(), minutes: dur };
          }).filter((s) => s.minutes > 0);

          if (summary.length < 3) {
            return new Response(JSON.stringify({ insight: "Track a few more sessions and I'll spot patterns for you." }), { status: 200, headers: cors });
          }

          const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "google/gemini-3-flash-preview",
              messages: [
                { role: "system", content: "You are a productivity coach. Reply with ONE concise, specific insight (max 25 words) about the user's work patterns. Be punchy and actionable." },
                { role: "user", content: `Last 7 days of status sessions: ${JSON.stringify(summary)}` },
              ],
            }),
          });
          if (aiRes.status === 429) return new Response(JSON.stringify({ insight: "Hit AI rate limit — try again in a minute." }), { status: 200, headers: cors });
          if (aiRes.status === 402) return new Response(JSON.stringify({ insight: "AI credits exhausted — top up to keep insights flowing." }), { status: 200, headers: cors });
          const json = await aiRes.json();
          const insight = json.choices?.[0]?.message?.content ?? "Keep going — patterns emerge with more data.";
          return new Response(JSON.stringify({ insight }), { status: 200, headers: cors });
        } catch (e) {
          return new Response(JSON.stringify({ insight: "AI insight unavailable right now." }), { status: 200, headers: cors });
        }
      },
    },
  },
});
