import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "create_task",
  title: "Create task",
  description: "Create a new study task for the signed-in student in ClassLab.",
  inputSchema: {
    title: z.string().trim().min(1).max(200).describe("Short task title."),
    description: z.string().trim().max(2000).optional().describe("Optional task details."),
    due_at: z.string().datetime().optional().describe("Optional ISO 8601 due date/time."),
    priority: z.number().int().min(0).max(3).optional().describe("Priority, 0 = lowest."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ title, description, due_at, priority }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const userId = ctx.getUserId()!;
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("tasks")
      .insert({
        title,
        description: description ?? null,
        due_at: due_at ?? null,
        priority: priority ?? 1,
        assigned_by: userId,
        assigned_to: userId,
        status: "todo",
      })
      .select("id, title, status, due_at, priority")
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Created task "${data.title}" (${data.id})` }],
      structuredContent: { task: data },
    };
  },
});
