import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_post_comments",
  title: "List comments on a post",
  description: "Read the comment thread of a ClassLab feed post by id or slug.",
  inputSchema: {
    post: z.string().trim().min(1).max(200).describe("Post UUID or slug."),
    limit: z.number().int().min(1).max(100).default(50).describe("Maximum comments to return."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ post, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
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
      .select("id, parent_id, author_id, body, up_count, down_count, created_at")
      .eq("post_id", postId)
      .order("created_at", { ascending: true })
      .limit(limit ?? 50);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { comments: data ?? [] },
    };
  },
});
