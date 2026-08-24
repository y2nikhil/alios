import { createFileRoute } from "@tanstack/react-router";
import { generateArticle, slugifyTitle, PipelineHalt, type QueueRow } from "@/lib/college-review.server";

/**
 * Daily automated college review generator.
 * Called by pg_cron (or an admin "Run now") with the project anon key in the apikey header.
 */
async function runPipeline(limitOverride?: number) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db = supabaseAdmin as any;

  const { data: state } = await db.from("college_pipeline_state").select("*").eq("id", 1).maybeSingle();
  if (!state) return { ok: false, reason: "no pipeline state" };

  const now = Date.now();
  const probeOnly = !!state.paused;
  if (state.lock_until && new Date(state.lock_until).getTime() > now) {
    return { ok: false, reason: "another run is in progress" };
  }

  const limit = probeOnly ? 1 : Math.max(1, Math.min(25, limitOverride ?? state.daily_limit ?? 5));

  // Single-flight lock (30 min lease)
  await db
    .from("college_pipeline_state")
    .update({ lock_until: new Date(now + 30 * 60_000).toISOString(), last_run_at: new Date().toISOString() })
    .eq("id", 1);

  const { data: run } = await db
    .from("college_gen_runs")
    .insert({ requested: limit })
    .select("id")
    .single();
  const runId = run?.id as string | undefined;

  const detail: any[] = [];
  let succeeded = 0;
  let failed = 0;
  let haltError: string | null = null;

  try {
    // Resolve the admin author (prefer a super admin).
    const { data: roles } = await db
      .from("user_roles")
      .select("user_id, role")
      .in("role", ["super_admin", "admin"]);
    const author =
      (roles ?? []).find((r: any) => r.role === "super_admin")?.user_id ??
      (roles ?? [])[0]?.user_id;
    if (!author) throw new PipelineHalt("No admin account found to author posts", 500);

    const { data: queue } = await db
      .from("college_queue")
      .select("id, name, city, exam_track, notes")
      .eq("status", "pending")
      .order("priority", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(limit);

    for (const college of (queue ?? []) as QueueRow[]) {
      await db.from("college_queue").update({ status: "generating", error: null }).eq("id", college.id);
      try {
        const article = await generateArticle(college);

        let slug = slugifyTitle(article.title || `${college.name} admission ${new Date().getUTCFullYear() + 1} review`);
        const { data: clash } = await db.from("blog_posts").select("id").eq("slug", slug).maybeSingle();
        if (clash) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

        const { data: post, error: postErr } = await db
          .from("blog_posts")
          .insert({
            slug,
            title: article.title,
            excerpt: article.excerpt,
            content: article.content,
            tags: article.tags,
            status: "published",
            show_toc: true,
            seo_title: article.seo_title,
            seo_description: article.seo_description,
            keywords: article.keywords,
            cover_alt: article.cover_alt,
            author_id: author,
            published_at: new Date().toISOString(),
          })
          .select("id")
          .single();
        if (postErr) throw new Error(postErr.message);

        await db
          .from("college_queue")
          .update({
            status: "published",
            post_id: post.id,
            published_at: new Date().toISOString(),
            error: null,
            attempts: 0,
          })
          .eq("id", college.id);

        succeeded += 1;
        detail.push({ college: college.name, slug, ok: true });

        if (probeOnly) {
          // Recovery probe succeeded — resume the pipeline.
          await db.from("college_pipeline_state").update({ paused: false, pause_reason: null }).eq("id", 1);
        }
      } catch (e: any) {
        if (e instanceof PipelineHalt) throw e;
        failed += 1;
        detail.push({ college: college.name, ok: false, error: String(e?.message ?? e) });
        const { data: cur } = await db.from("college_queue").select("attempts").eq("id", college.id).maybeSingle();
        const attempts = (cur?.attempts ?? 0) + 1;
        await db
          .from("college_queue")
          .update({
            status: attempts >= 3 ? "failed" : "pending",
            attempts,
            error: String(e?.message ?? e).slice(0, 500),
          })
          .eq("id", college.id);
      }
    }
  } catch (e: any) {
    haltError = String(e?.message ?? e);
    await db
      .from("college_pipeline_state")
      .update({ paused: true, pause_reason: haltError.slice(0, 500) })
      .eq("id", 1);
  } finally {
    await db.from("college_pipeline_state").update({ lock_until: null }).eq("id", 1);
    if (runId) {
      await db
        .from("college_gen_runs")
        .update({ finished_at: new Date().toISOString(), succeeded, failed, detail, error: haltError })
        .eq("id", runId);
    }
  }

  return { ok: !haltError, succeeded, failed, paused: !!haltError, error: haltError, detail };
}

export const Route = createFileRoute("/api/public/hooks/generate-college-reviews")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const anon = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY;
        const key = request.headers.get("apikey") ?? request.headers.get("x-api-key");
        if (!anon || key !== anon) {
          return new Response("Unauthorized", { status: 401 });
        }
        let body: { limit?: number } = {};
        try { body = await request.json(); } catch { /* empty body is fine */ }
        const result = await runPipeline(typeof body.limit === "number" ? body.limit : undefined);
        return Response.json(result, { status: result.ok ? 200 : 202 });
      },
    },
  },
});
