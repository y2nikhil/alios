import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "search_feed_posts",
  title: "Search feed posts",
  description: "Search recent ClassLab community feed posts by keyword or tag.",
  inputSchema: {
    query: z.string().trim().max(120).optional().describe("Keyword to match in post titles and bodies."),
    tag: z.string().trim().max(60).optional().describe("Only return posts with this tag."),
    limit: z.number().int().min(1).max(25).default(10).describe("Maximum number of posts to return."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, tag, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("posts")
      .select("id, title, body, tag, slug, up_count, comment_count, created_at")
      .order("created_at", { ascending: false })
      .limit(limit ?? 10);
    if (tag) q = q.eq("tag", tag);
    if (query) {
      const safe = query.replace(/[%,()]/g, " ");
      q = q.or(`title.ilike.%${safe}%,body.ilike.%${safe}%`);
    }
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { posts: data ?? [] },
    };
  },
});
