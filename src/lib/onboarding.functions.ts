import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const ExamEnum = z.enum(["cat", "jee", "neet", "railways", "ssc_upsc", "banking"]);
const TimeEnum = z.enum(["morning", "afternoon", "evening", "night"]);
const StageEnum = z.enum(["beginner", "revision", "mock"]);
const CoachingEnum = z.enum(["self_study", "coaching", "hybrid"]);

const ProfileSchema = z.object({
  exam: ExamEnum,
  attempt_year: z.number().int().min(2025).max(2035),
  exam_date: z.string().nullable().optional(),
  daily_hours: z.number().min(0.5).max(16),
  preferred_time: TimeEnum,
  prep_stage: StageEnum,
  weak_subjects: z.array(z.string()).max(20).default([]),
  goal: z.string().max(500).nullable().optional(),
  coaching_status: CoachingEnum,
});

export type PrepProfileInput = z.infer<typeof ProfileSchema>;

export const getPrepProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_prep_profile")
      .select("*")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

export const savePrepProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ProfileSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: saved, error } = await supabase
      .from("user_prep_profile")
      .upsert({ ...data, user_id: userId, onboarded_at: new Date().toISOString() })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return saved;
  });

export const finalizeOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ProfileSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // 1) Upsert prep profile
    const { error: pErr } = await supabase
      .from("user_prep_profile")
      .upsert({ ...data, user_id: userId, onboarded_at: new Date().toISOString() });
    if (pErr) throw new Error(pErr.message);

    // 2) Auto-join matching exam community
    const slugMap: Record<string, string> = {
      cat: "exam-cat", jee: "exam-jee", neet: "exam-neet",
      railways: "exam-railways", ssc_upsc: "exam-ssc-upsc", banking: "exam-banking",
    };
    const slug = slugMap[data.exam];
    let joinedGroupId: string | null = null;
    if (slug) {
      const { data: grp } = await supabase.from("groups").select("id").eq("slug", slug).maybeSingle();
      if (grp?.id) {
        joinedGroupId = grp.id;
        await supabase.from("group_members").insert({ group_id: grp.id, user_id: userId }).select();
      }
    }

    // 3) Mind-map roadmap is no longer auto-created (kept database usage low).
    //    Users can create a board themselves from /app/mindmap.


    // 4) Starter study plan via Lovable AI (best-effort)
    let plan: string | null = null;
    try {
      const key = process.env.LOVABLE_API_KEY;
      if (key) {
        const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: "You are ClassLab, a study coach. Write a compact weekly study plan (Mon–Sun) with 1 short line per day. Under 140 words total. Plain text, no markdown headers." },
              { role: "user", content: `Exam: ${data.exam.toUpperCase()} ${data.attempt_year}. Daily hours: ${data.daily_hours}. Preferred time: ${data.preferred_time}. Stage: ${data.prep_stage}. Weak areas: ${(data.weak_subjects ?? []).join(", ") || "none"}. Coaching: ${data.coaching_status}. Goal: ${data.goal ?? "n/a"}.` },
            ],
          }),
        });
        if (res.ok) {
          const j = await res.json();
          plan = j.choices?.[0]?.message?.content ?? null;
          if (plan) {
            await supabase.from("ai_insights").insert({
              user_id: userId, insight_type: "study_plan", content: plan,
              generated_for_date: new Date().toISOString().slice(0, 10),
              metadata: { exam: data.exam, attempt_year: data.attempt_year },
            });
          }
        }
      }
    } catch { /* best effort */ }

    return { boardId: board.id, joinedGroupId, plan };
  });
