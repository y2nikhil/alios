import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

export const Route = createFileRoute("/api/ai-ask")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
          },
        }),
      POST: async ({ request }) => {
        const cors = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };
        try {
          const { question } = await request.json();
          if (!question || typeof question !== "string") {
            return new Response(JSON.stringify({ answer: "Ask me anything." }), { status: 200, headers: cors });
          }
          const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
          if (!LOVABLE_API_KEY) {
            return new Response(JSON.stringify({ answer: "AI not configured." }), { status: 200, headers: cors });
          }

          // Optional context from the signed-in user
          let context = "";
          const auth = request.headers.get("authorization");
          if (auth) {
            try {
              const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
                global: { headers: { Authorization: auth } },
              });
              const { data: { user } } = await sb.auth.getUser();
              if (user) {
                const since = new Date(); since.setDate(since.getDate() - 7);
                const { data: sess } = await sb
                  .from("aux_sessions")
                  .select("started_at, ended_at, status_id")
                  .eq("user_id", user.id)
                  .gte("started_at", since.toISOString())
                  .limit(50);
                if (sess && sess.length) {
                  let total = 0;
                  for (const s of sess as any[]) {
                    const e = s.ended_at ? new Date(s.ended_at).getTime() : Date.now();
                    total += Math.max(0, e - new Date(s.started_at).getTime());
                  }
                  context = `User tracked ~${Math.round(total / 60000)} minutes over ${sess.length} sessions in the last 7 days. `;
                }
                const { data: prof } = await sb
                  .from("user_prep_profile")
                  .select("exam, attempt_year, daily_hours, preferred_time, prep_stage, weak_subjects, goal, coaching_status")
                  .eq("user_id", user.id)
                  .maybeSingle();
                if (prof) {
                  const weak = (prof.weak_subjects ?? []).slice(0, 4).join(", ") || "none flagged";
                  context = `[Prep profile] Exam: ${String(prof.exam).toUpperCase()} ${prof.attempt_year}, ~${prof.daily_hours} hrs/day (${prof.preferred_time}), stage: ${prof.prep_stage}, weak: ${weak}, coaching: ${prof.coaching_status}${prof.goal ? `, goal: ${prof.goal}` : ""}. ` + context;
                }
              }
            } catch { /* ignore */ }
          }

          const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [
                { role: "system", content: "You are ALIOS, a friendly productivity assistant. Keep answers under 80 words, plain English, no markdown headers." },
                { role: "user", content: `${context}Question: ${question}` },
              ],
            }),
          });
          if (aiRes.status === 429) return new Response(JSON.stringify({ answer: "Rate limited — try again shortly." }), { status: 200, headers: cors });
          if (aiRes.status === 402) return new Response(JSON.stringify({ answer: "AI credits exhausted." }), { status: 200, headers: cors });
          const json = await aiRes.json();
          const answer = json.choices?.[0]?.message?.content ?? "Hmm, I had no answer for that.";
          return new Response(JSON.stringify({ answer }), { status: 200, headers: cors });
        } catch (e) {
          return new Response(JSON.stringify({ answer: "Couldn't reach the AI right now." }), { status: 200, headers: cors });
        }
      },
    },
  },
});
