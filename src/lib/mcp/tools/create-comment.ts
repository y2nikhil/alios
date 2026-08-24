import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "create_comment",
  title: "Comment on a post",
  description:
    "Add a comment (or a threaded reply) to a ClassLab feed post as the signed-in user. Accepts a post id or slug.",
  inputSchema: {
    post: z.string().trim().min(1).max(200).describe("Post UUID or slug."),
    body: z.string().trim().min(1).max(10000).describe("Comment text."),
    parent_id: z.string().uuid().optional().describe("Optional parent comment id to reply to."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ post, body, parent_id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const userId = ctx.getUserId()!;
    const supabase = supabaseForUser(ctx);

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(post);
    let postId = post;
    if (!isUuid) {
      const { data: found, error: findErr } = await supabase
        .from("posts")
        .select("id")
        .eq("slug", post)
        .maybeSingle();
      if (findErr) return { content: [{ type: "text", text: findErr.message }], isError: true };
      if (!found) return { content: [{ type: "text", text: `No post found for "${post}"` }], isError: true };
      postId = found.id;
    }

    const { data, error } = await supabase
      .from("post_comments")
      .insert({ post_id: postId, author_id: userId, body, parent_id: parent_id ?? null })
      .select("id, post_id, parent_id, body, created_at")
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Comment added (${data.id})` }],
      structuredContent: { comment: data },
    };
  },
});
