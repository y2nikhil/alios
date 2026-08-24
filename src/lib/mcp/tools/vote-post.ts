import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "vote_post",
  title: "Vote on a post",
  description: "Upvote, downvote, or clear the signed-in user's vote on a ClassLab feed post.",
  inputSchema: {
    post_id: z.string().uuid().describe("Post UUID."),
    value: z.enum(["up", "down", "clear"]).describe("Vote direction, or 'clear' to remove."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async ({ post_id, value }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const userId = ctx.getUserId()!;
    const supabase = supabaseForUser(ctx);
    if (value === "clear") {
      const { error } = await supabase
        .from("post_votes")
        .delete()
        .eq("post_id", post_id)
        .eq("user_id", userId);
      if (error) return { content: [{ type: "text", text: error.message }], isError: true };
      return { content: [{ type: "text", text: "Vote cleared" }] };
    }
    const { error } = await supabase
      .from("post_votes")
      .upsert(
        { post_id, user_id: userId, value: value === "up" ? 1 : -1 },
        { onConflict: "post_id,user_id" },
      );
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return { content: [{ type: "text", text: `Registered ${value}vote` }] };
  },
});
