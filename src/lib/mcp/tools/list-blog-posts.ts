import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_blog_posts",
  title: "List blog posts",
  description: "List ClassLab blog articles, optionally filtered by status or keyword.",
  inputSchema: {
    status: z.enum(["draft", "published", "any"]).default("published").describe("Filter by status."),
    query: z.string().trim().max(120).optional().describe("Keyword to match in title or excerpt."),
    limit: z.number().int().min(1).max(50).default(20).describe("Maximum number of articles."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, query, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("blog_posts")
      .select("id, slug, title, excerpt, tags, status, published_at, updated_at")
      .order("updated_at", { ascending: false })
      .limit(limit ?? 20);
    if (status && status !== "any") q = q.eq("status", status);
    if (query) {
      const safe = query.replace(/[%,()]/g, " ");
      q = q.or(`title.ilike.%${safe}%,excerpt.ilike.%${safe}%`);
    }
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { posts: data ?? [] },
    };
  },
});
