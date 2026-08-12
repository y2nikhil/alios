import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "update_task_status",
  title: "Update task status",
  description: "Change the status of one of the signed-in student's ClassLab tasks (e.g. mark it done).",
  inputSchema: {
    task_id: z.string().uuid().describe("The task id."),
    status: z
      .enum(["todo", "in_progress", "done", "cancelled", "pending", "overdue"])
      .describe("New status for the task."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async ({ task_id, status }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("tasks")
      .update({ status })
      .eq("id", task_id)
      .select("id, title, status")
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) {
      return { content: [{ type: "text", text: "Task not found or not accessible." }], isError: true };
    }
    return {
      content: [{ type: "text", text: `Task "${data.title}" is now ${data.status}.` }],
      structuredContent: { task: data },
    };
  },
});
