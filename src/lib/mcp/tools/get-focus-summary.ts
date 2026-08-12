import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_focus_summary",
  title: "Get focus summary",
  description: "Summarise the signed-in student's tracked focus sessions over a recent number of days.",
  inputSchema: {
    days: z.number().int().min(1).max(90).default(7).describe("How many days back to summarise."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ days }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const window = days ?? 7;
    const since = new Date(Date.now() - window * 24 * 60 * 60 * 1000).toISOString();
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("aux_sessions")
      .select("started_at, duration_seconds")
      .eq("user_id", ctx.getUserId()!)
      .gte("started_at", since);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const rows = data ?? [];
    const totalSeconds = rows.reduce((sum, r) => sum + (r.duration_seconds ?? 0), 0);
    const activeDays = new Set(rows.map((r) => r.started_at.slice(0, 10))).size;
    const summary = {
      days: window,
      sessions: rows.length,
      active_days: activeDays,
      total_hours: Math.round((totalSeconds / 3600) * 10) / 10,
      average_hours_per_active_day:
        activeDays > 0 ? Math.round((totalSeconds / 3600 / activeDays) * 10) / 10 : 0,
    };
    return {
      content: [{ type: "text", text: JSON.stringify(summary, null, 2) }],
      structuredContent: summary,
    };
  },
});
