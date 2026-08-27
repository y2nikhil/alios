import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "update_blog_post",
  title: "Update or publish blog post",
  description:
    "Edit an existing ClassLab blog article or change its status (draft/published). Requires an admin account.",
  inputSchema: {
    id: z.string().uuid().optional().describe("Blog post UUID (or provide slug)."),
    slug: z.string().trim().max(120).optional().describe("Existing slug of the article."),
    title: z.string().trim().max(200).optional(),
    content: z.string().trim().optional().describe("Replacement markdown body."),
    excerpt: z.string().trim().max(500).optional(),
    tags: z.array(z.string().trim().max(40)).max(10).optional(),
    status: z.enum(["draft", "published"]).optional(),
    cover_url: z.string().url().optional(),
    seo_title: z.string().trim().max(120).optional(),
    seo_description: z.string().trim().max(200).optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    if (!input.id && !input.slug) {
      return { content: [{ type: "text", text: "Provide either id or slug" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const patch: Record<string, unknown> = {};
    for (const key of ["title", "content", "excerpt", "tags", "status", "cover_url", "seo_title", "seo_description"] as const) {
      const value = input[key];
      if (value !== undefined) patch[key] = value;
    }
    if (input.status === "published") patch['published_at'] = new Date().toISOString();
    if (Object.keys(patch).length === 0) {
      return { content: [{ type: "text", text: "Nothing to update" }], isError: true };
    }
    let q = supabase.from("blog_posts").update(patch);
    q = input.id ? q.eq("id", input.id) : q.eq("slug", input.slug!);
    const { data, error } = await q.select("id, slug, title, status, published_at").single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Updated "${data.title}" (${data.status})` }],
      structuredContent: { post: data },
    };
  },
});
