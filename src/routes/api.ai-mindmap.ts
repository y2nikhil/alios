import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

export const Route = createFileRoute("/api/ai-mindmap")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const cors = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };
        try {
          const auth = request.headers.get("authorization");
          if (!auth) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: cors });
          }
          const SUPABASE_URL = process.env.SUPABASE_URL!;
          const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY!;
          const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
            global: { headers: { Authorization: auth } },
            auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
          });
          const { data: { user } } = await sb.auth.getUser();
          if (!user) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: cors });
          }

          const { action, text } = await request.json();
          const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
          if (!LOVABLE_API_KEY) {
            return new Response(JSON.stringify({ error: "AI not configured" }), { status: 500, headers: cors });
          }

          const systemMap: Record<string, string> = {
            summarize: "Summarize the user's text in 1-2 short sentences. Reply with ONLY the summary.",
            expand: "Expand the user's idea with 2-3 sentences of helpful detail. Reply with ONLY the expanded text.",
            tasks: "Convert the user's text into a JSON array of 3-6 short actionable tasks. Reply ONLY with valid JSON like {\"items\":[\"task 1\",\"task 2\"]}.",
          };
          const sys = systemMap[action] ?? systemMap.summarize;

          const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "google/gemini-3-flash-preview",
              messages: [
                { role: "system", content: sys },
                { role: "user", content: String(text).slice(0, 4000) },
              ],
              ...(action === "tasks" ? { response_format: { type: "json_object" } } : {}),
            }),
          });
          if (aiRes.status === 429) return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: cors });
          if (aiRes.status === 402) return new Response(JSON.stringify({ error: "Credits exhausted" }), { status: 402, headers: cors });
          const json = await aiRes.json();
          const content = json.choices?.[0]?.message?.content ?? "";
          if (action === "tasks") {
            try {
              const parsed = JSON.parse(content);
              return new Response(JSON.stringify({ items: parsed.items ?? [] }), { status: 200, headers: cors });
            } catch {
              return new Response(JSON.stringify({ items: [content] }), { status: 200, headers: cors });
            }
          }
          return new Response(JSON.stringify({ text: content }), { status: 200, headers: cors });
        } catch {
          return new Response(JSON.stringify({ error: "Failed" }), { status: 500, headers: cors });
        }
      },
    },
  },
});
