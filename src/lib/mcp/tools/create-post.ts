import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "create_post",
  title: "Create feed post",
  description: "Publish a new post to the ClassLab community feed as the signed-in user.",
  inputSchema: {
    title: z.string().trim().min(1).max(200).describe("Post title."),
    body: z.string().trim().max(20000).optional().describe("Post body (markdown allowed)."),
    tag: z.string().trim().max(60).optional().describe("Optional topic tag."),
    media_url: z.string().url().optional().describe("Optional image or video URL."),
    media_kind: z.enum(["image", "video"]).optional().describe("Kind of attached media."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ title, body, tag, media_url, media_kind }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const userId = ctx.getUserId()!;
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("posts")
      .insert({
        author_id: userId,
        title,
        body: body ?? null,
        tag: tag ?? null,
        media_url: media_url ?? null,
        media_kind: media_url ? (media_kind ?? "image") : null,
      })
      .select("id, slug, title, tag, created_at")
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Posted "${data.title}" → /post/${data.slug ?? data.id}` }],
      structuredContent: { post: data },
    };
  },
});
