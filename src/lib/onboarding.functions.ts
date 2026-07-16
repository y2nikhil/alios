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

    // 3) Create mind-map roadmap board (nodes generated inline; AI enrichment is best-effort)
    const boardTitle = `${data.exam.toUpperCase()} Roadmap ${data.attempt_year}`;
    const { data: board, error: bErr } = await supabase
      .from("mindmap_boards")
      .insert({ user_id: userId, title: boardTitle, description: `Auto-generated ${data.exam} roadmap for a ${data.prep_stage}-stage aspirant.` })
      .select("id")
      .single();
    if (bErr) throw new Error(bErr.message);

    // Basic phase → subject layout
    const phases = data.prep_stage === "beginner"
      ? ["Foundations", "Core Concepts", "Practice", "Mock Tests"]
      : data.prep_stage === "revision"
        ? ["Rapid Revision", "Weak Areas", "Full Mocks", "Analysis"]
        : ["Full Mocks", "Error Log", "Sectional Sprints", "Final Polish"];

    const subjectsBySlug: Record<string, string[]> = {
      cat: ["Quant", "VARC", "DILR"],
      jee: ["Physics", "Chemistry", "Maths"],
      neet: ["Physics", "Chemistry", "Botany", "Zoology"],
      railways: ["GA", "Maths", "Reasoning", "GS"],
      ssc_upsc: ["GS", "CSAT", "Optional", "Current Affairs"],
      banking: ["Quant", "Reasoning", "English", "GA"],
    };
    const subjects = subjectsBySlug[data.exam] ?? ["General"];

    // Root
    const rootId = crypto.randomUUID();
    const nodes: any[] = [{
      id: rootId, board_id: board.id, user_id: userId, node_type: "text",
      position_x: 0, position_y: 0, width: 220, height: 90,
      data: { label: `🎯 ${boardTitle}`, notes: data.goal ?? "" },
      color: "#8b5cf6", tags: [],
    }];
    const edges: any[] = [];

    phases.forEach((phase, pi) => {
      const phaseId = crypto.randomUUID();
      nodes.push({
        id: phaseId, board_id: board.id, user_id: userId, node_type: "text",
        position_x: -600 + pi * 400, position_y: 220, width: 200, height: 70,
        data: { label: `Phase ${pi + 1}: ${phase}` }, color: "#22d3ee", tags: [],
      });
      edges.push({
        id: crypto.randomUUID(), board_id: board.id, user_id: userId,
        source_node_id: rootId, target_node_id: phaseId,
      });
      subjects.forEach((subj, si) => {
        const nid = crypto.randomUUID();
        const isWeak = (data.weak_subjects ?? []).some((w) => w.toLowerCase().includes(subj.toLowerCase()));
        nodes.push({
          id: nid, board_id: board.id, user_id: userId, node_type: "task",
          position_x: -600 + pi * 400 + (si - subjects.length / 2) * 60,
          position_y: 400 + si * 90, width: 180, height: 60,
          data: { label: `${isWeak ? "⚠️ " : ""}${subj}`, done: false },
          color: isWeak ? "#f43f5e" : "#10b981", tags: isWeak ? ["weak"] : [],
        });
        edges.push({
          id: crypto.randomUUID(), board_id: board.id, user_id: userId,
          source_node_id: phaseId, target_node_id: nid,
        });
      });
    });

    await supabase.from("mindmap_nodes").insert(nodes);
    await supabase.from("mindmap_edges").insert(edges);

    // 4) Starter study plan via Lovable AI (best-effort)
    let plan: string | null = null;
    try {
      const key = process.env.LOVABLE_API_KEY;
      if (key) {
        const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
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
