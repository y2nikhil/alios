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

          // Build a per-user personalization context
          let personalization = "";
          const auth = request.headers.get("authorization");
          if (auth) {
            try {
              const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
                global: { headers: { Authorization: auth } },
              });
              const { data: { user } } = await sb.auth.getUser();
              if (user) {
                const parts: string[] = [];

                const [{ data: prof }, { data: prep }, { data: sess7 }, { data: sessToday }, { data: tasks }, { data: milestones }] = await Promise.all([
                  sb.from("profiles").select("display_name, username, daily_goal_minutes").eq("id", user.id).maybeSingle(),
                  sb.from("user_prep_profile").select("exam, attempt_year, exam_date, daily_hours, preferred_time, prep_stage, weak_subjects, goal, coaching_status").eq("user_id", user.id).maybeSingle(),
                  sb.from("aux_sessions").select("started_at, ended_at, status_id, aux_statuses(name)").eq("user_id", user.id).gte("started_at", new Date(Date.now() - 7 * 864e5).toISOString()).limit(200),
                  sb.from("aux_sessions").select("started_at, ended_at, aux_statuses(name)").eq("user_id", user.id).gte("started_at", new Date(new Date().setHours(0,0,0,0)).toISOString()).limit(50),
                  sb.from("tasks").select("title, status, priority, due_at").eq("assigned_to", user.id).order("updated_at", { ascending: false }).limit(8),
                  sb.from("focus_milestone_events").select("kind, minutes, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
                ]);

                const name = (prof as any)?.display_name || (prof as any)?.username || "friend";
                parts.push(`User name: ${name}. Address them by first name occasionally.`);
                if (prof?.daily_goal_minutes) parts.push(`Daily focus goal: ${prof.daily_goal_minutes} min.`);

                if (prep) {
                  const weak = ((prep as any).weak_subjects ?? []).slice(0, 6).join(", ") || "none flagged";
                  parts.push(`Prep profile — Exam: ${String((prep as any).exam).toUpperCase()} ${(prep as any).attempt_year}${(prep as any).exam_date ? ` (on ${(prep as any).exam_date})` : ""}, stage: ${(prep as any).prep_stage}, ~${(prep as any).daily_hours} hrs/day preferred in the ${(prep as any).preferred_time}, coaching: ${(prep as any).coaching_status}, weak areas: ${weak}${(prep as any).goal ? `, goal: "${(prep as any).goal}"` : ""}.`);
                }

                if (sess7?.length) {
                  let total = 0;
                  const byStatus = new Map<string, number>();
                  for (const s of sess7 as any[]) {
                    const e = s.ended_at ? new Date(s.ended_at).getTime() : Date.now();
                    const dur = Math.max(0, e - new Date(s.started_at).getTime());
                    total += dur;
                    const n = s.aux_statuses?.name ?? "Unknown";
                    byStatus.set(n, (byStatus.get(n) ?? 0) + dur);
                  }
                  const top = [...byStatus.entries()].sort((a,b)=>b[1]-a[1]).slice(0,3).map(([k,v])=>`${k} ${Math.round(v/60000)}m`).join(", ");
                  parts.push(`Last 7 days: ${Math.round(total/60000)} min across ${sess7.length} sessions (top: ${top}).`);
                }
                if (sessToday?.length) {
                  let t = 0;
                  for (const s of sessToday as any[]) {
                    const e = s.ended_at ? new Date(s.ended_at).getTime() : Date.now();
                    t += Math.max(0, e - new Date(s.started_at).getTime());
                  }
                  parts.push(`Today so far: ${Math.round(t/60000)} min tracked.`);
                }
                if (tasks?.length) {
                  const open = (tasks as any[]).filter((t) => t.status !== "done").slice(0, 5).map((t) => `"${t.title}"${t.due_at ? ` (due ${new Date(t.due_at).toDateString()})` : ""}`).join("; ");
                  if (open) parts.push(`Open tasks: ${open}.`);
                }
                if (milestones?.length) {
                  const m = (milestones as any[]).slice(0, 3).map((x) => `${x.kind} ${x.minutes ?? ""}m`).join(", ");
                  parts.push(`Recent focus milestones: ${m}.`);
                }

                personalization = parts.join(" ");
              }
            } catch { /* ignore */ }
          }

          const system = `You are ClassLab, a warm, thoughtful study & productivity coach embedded in the user's app.
You know the specific user through the personalization block below. Use it to give concrete, personal advice — reference their exam, weak subjects, tracked minutes, or open tasks when relevant. Never invent facts about the user. If you don't know something, ask a short follow-up.
Style: friendly, calm, human — Linear/Notion tone. 60–120 words. No markdown headers or bullet lists unless the user asks for a list. Prefer 1–2 short paragraphs and end with a small nudge.
${personalization ? "\n---\nPersonalization:\n" + personalization : ""}`;

          const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [
                { role: "system", content: system },
                { role: "user", content: question },
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
