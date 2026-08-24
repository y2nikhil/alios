import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export default defineTool({
  name: "create_blog_post",
  title: "Create blog post",
  description:
    "Create a ClassLab blog article (markdown body) as a draft or published. Requires an admin account.",
  inputSchema: {
    title: z.string().trim().min(1).max(200).describe("Article title."),
    content: z.string().trim().min(1).describe("Full markdown body of the article."),
    excerpt: z.string().trim().max(500).optional().describe("Short summary shown in listings."),
    slug: z.string().trim().max(120).optional().describe("URL slug; derived from the title when omitted."),
    tags: z.array(z.string().trim().max(40)).max(10).optional().describe("Topic tags."),
    status: z.enum(["draft", "published"]).default("draft").describe("Publish immediately or keep as draft."),
    cover_url: z.string().url().optional().describe("Optional cover image URL."),
    cover_alt: z.string().trim().max(200).optional().describe("Alt text for the cover image."),
    seo_title: z.string().trim().max(120).optional().describe("SEO title override."),
    seo_description: z.string().trim().max(200).optional().describe("Meta description."),
    keywords: z.string().trim().max(400).optional().describe("Comma-separated SEO keywords."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const userId = ctx.getUserId()!;
    const supabase = supabaseForUser(ctx);
    const slug = slugify(input.slug || input.title) || `post-${Date.now()}`;
    const status = input.status ?? "draft";
    const { data, error } = await supabase
      .from("blog_posts")
      .insert({
        slug,
        title: input.title,
        content: input.content,
        excerpt: input.excerpt ?? null,
        tags: input.tags ?? [],
        status,
        cover_url: input.cover_url ?? null,
        cover_alt: input.cover_alt ?? null,
        seo_title: input.seo_title ?? null,
        seo_description: input.seo_description ?? null,
        keywords: input.keywords ?? null,
        author_id: userId,
        published_at: status === "published" ? new Date().toISOString() : null,
      })
      .select("id, slug, title, status, published_at")
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Blog post "${data.title}" saved as ${data.status} → /blog/${data.slug}` }],
      structuredContent: { post: data },
    };
  },
});
