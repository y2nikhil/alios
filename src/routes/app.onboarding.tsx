import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { EXAMS, EXAM_BY_KEY, defaultExamDate, type ExamKey } from "@/lib/exam-catalog";
import { getPrepProfile, finalizeOnboarding, type PrepProfileInput } from "@/lib/onboarding.functions";

export const Route = createFileRoute("/app/onboarding")({
  head: () => ({
    meta: [
      { title: "Get Started — ALIOS" },
      { name: "description", content: "Personalize ALIOS for your exam prep." },
    ],
  }),
  component: OnboardingPage,
});

const TIMES = [
  { key: "morning", label: "Morning", emoji: "🌅" },
  { key: "afternoon", label: "Afternoon", emoji: "☀️" },
  { key: "evening", label: "Evening", emoji: "🌇" },
  { key: "night", label: "Night", emoji: "🌙" },
] as const;

const STAGES = [
  { key: "beginner", label: "Beginner", desc: "Just starting out" },
  { key: "revision", label: "Revision", desc: "Reviewing concepts" },
  { key: "mock", label: "Mock Tests", desc: "Practicing full tests" },
] as const;

const COACHING = [
  { key: "self_study", label: "Self-study" },
  { key: "coaching", label: "Coaching class" },
  { key: "hybrid", label: "Hybrid" },
] as const;

function OnboardingPage() {
  const navigate = useNavigate();
  const load = useServerFn(getPrepProfile);
  const save = useServerFn(finalizeOnboarding);

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const year = new Date().getFullYear();
  const [form, setForm] = useState<PrepProfileInput>({
    exam: "jee",
    attempt_year: year + 1,
    exam_date: defaultExamDate("jee", year + 1),
    daily_hours: 4,
    preferred_time: "evening",
    prep_stage: "beginner",
    weak_subjects: [],
    goal: "",
    coaching_status: "self_study",
  });

  useEffect(() => {
    load().then((existing) => {
      if (existing) {
        setForm((f) => ({
          ...f,
          exam: existing.exam as ExamKey,
          attempt_year: existing.attempt_year,
          exam_date: existing.exam_date ?? f.exam_date,
          daily_hours: Number(existing.daily_hours),
          preferred_time: existing.preferred_time as any,
          prep_stage: existing.prep_stage as any,
          weak_subjects: existing.weak_subjects ?? [],
          goal: existing.goal ?? "",
          coaching_status: existing.coaching_status as any,
        }));
      }
    }).finally(() => setInitialized(true));
  }, [load]);

  const set = <K extends keyof PrepProfileInput>(k: K, v: PrepProfileInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const exam = EXAM_BY_KEY[form.exam];

  const submit = async () => {
    setSubmitting(true);
    try {
      const res = await save({ data: form });
      try {
        localStorage.setItem("alios.onboarded", "1");
        sessionStorage.removeItem("alios.onboarding.skipped");
      } catch {}
      toast.success("You're all set!");
      if (res?.boardId) {
        navigate({ to: "/app/mindmap/$boardId", params: { boardId: res.boardId } });
      } else {
        navigate({ to: "/app" });
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't save. Try again.");
      setSubmitting(false);
    }
  };

  const skip = () => {
    try { sessionStorage.setItem("alios.onboarding.skipped", "1"); } catch {}
    navigate({ to: "/app" });
  };


  const totalSteps = 4;

  return (
    <div className="min-h-[calc(100vh-4rem)] p-4 lg:p-8 flex items-center justify-center">
      <div className="w-full max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 grid place-items-center shadow-lg shadow-violet-500/30">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Let's personalize ALIOS</h1>
            <p className="text-sm text-muted-foreground">A quick 4-step setup — we'll tailor everything to your prep.</p>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-6 flex gap-1.5">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} className={cn("h-1.5 flex-1 rounded-full transition-colors", i <= step ? "bg-gradient-to-r from-violet-500 to-cyan-400" : "bg-white/10")} />
          ))}
        </div>

        <div className="glass rounded-3xl p-6 lg:p-8 min-h-[380px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {step === 0 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-xl font-bold">Which exam are you preparing for?</h2>
                    <p className="text-sm text-muted-foreground mt-1">We'll add you to the matching community and roadmap.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {EXAMS.map((e) => (
                      <button
                        key={e.key}
                        onClick={() => { set("exam", e.key); set("exam_date", defaultExamDate(e.key, form.attempt_year)); set("weak_subjects", []); }}
                        className={cn(
                          "flex items-center gap-3 rounded-xl border p-4 text-left transition",
                          form.exam === e.key ? "border-violet-400/60 bg-violet-500/10" : "border-white/10 hover:bg-white/5",
                        )}
                      >
                        <span className="text-2xl">{e.emoji}</span>
                        <span className="font-semibold">{e.label}</span>
                      </button>
                    ))}
                  </div>
                  <div>
                    <Label>Attempt year</Label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {[year, year + 1, year + 2, year + 3].map((y) => (
                        <button
                          key={y}
                          onClick={() => { set("attempt_year", y); set("exam_date", defaultExamDate(form.exam, y)); }}
                          className={cn(
                            "px-4 py-2 rounded-full border text-sm font-medium transition",
                            form.attempt_year === y ? "border-violet-400/60 bg-violet-500/10" : "border-white/10 hover:bg-white/5",
                          )}
                        >{y}</button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-xl font-bold">How much time can you commit?</h2>
                    <p className="text-sm text-muted-foreground mt-1">We'll size your plan accordingly.</p>
                  </div>
                  <div>
                    <div className="flex items-baseline justify-between">
                      <Label>Daily study hours</Label>
                      <span className="text-2xl font-bold tabular-nums">{form.daily_hours}h</span>
                    </div>
                    <input
                      type="range" min={1} max={14} step={0.5}
                      value={form.daily_hours}
                      onChange={(e) => set("daily_hours", Number(e.target.value))}
                      className="w-full mt-3 accent-violet-500"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>1h</span><span>14h</span>
                    </div>
                  </div>
                  <div>
                    <Label>When do you study best?</Label>
                    <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {TIMES.map((t) => (
                        <button
                          key={t.key}
                          onClick={() => set("preferred_time", t.key)}
                          className={cn(
                            "flex flex-col items-center gap-1 rounded-xl border p-3 transition",
                            form.preferred_time === t.key ? "border-violet-400/60 bg-violet-500/10" : "border-white/10 hover:bg-white/5",
                          )}
                        >
                          <span className="text-xl">{t.emoji}</span>
                          <span className="text-xs font-medium">{t.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-xl font-bold">Where are you in your prep?</h2>
                    <p className="text-sm text-muted-foreground mt-1">Tell us your stage and any weak areas.</p>
                  </div>
                  <div className="grid gap-2">
                    {STAGES.map((s) => (
                      <button
                        key={s.key}
                        onClick={() => set("prep_stage", s.key)}
                        className={cn(
                          "flex items-center justify-between rounded-xl border p-3.5 text-left transition",
                          form.prep_stage === s.key ? "border-violet-400/60 bg-violet-500/10" : "border-white/10 hover:bg-white/5",
                        )}
                      >
                        <div>
                          <p className="font-semibold">{s.label}</p>
                          <p className="text-xs text-muted-foreground">{s.desc}</p>
                        </div>
                        {form.prep_stage === s.key && <Check className="h-4 w-4 text-violet-400" />}
                      </button>
                    ))}
                  </div>
                  <div>
                    <Label>Weak subjects (optional)</Label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {exam.subjects.map((s) => {
                        const on = form.weak_subjects.includes(s);
                        return (
                          <button
                            key={s}
                            onClick={() => set("weak_subjects", on ? form.weak_subjects.filter((x) => x !== s) : [...form.weak_subjects, s])}
                            className={cn(
                              "px-3 py-1.5 rounded-full border text-xs font-medium transition",
                              on ? "border-rose-400/60 bg-rose-500/10 text-rose-200" : "border-white/10 hover:bg-white/5",
                            )}
                          >{s}</button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-xl font-bold">One last thing — your goal</h2>
                    <p className="text-sm text-muted-foreground mt-1">This helps our AI tailor advice to what you actually want.</p>
                  </div>
                  <div>
                    <Label htmlFor="goal">Your target (rank, college, score)</Label>
                    <Input
                      id="goal"
                      value={form.goal ?? ""}
                      onChange={(e) => set("goal", e.target.value)}
                      placeholder="e.g. IIT Bombay CSE, AIR under 500"
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Are you in coaching?</Label>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {COACHING.map((c) => (
                        <button
                          key={c.key}
                          onClick={() => set("coaching_status", c.key)}
                          className={cn(
                            "rounded-xl border p-3 text-sm font-medium transition",
                            form.coaching_status === c.key ? "border-violet-400/60 bg-violet-500/10" : "border-white/10 hover:bg-white/5",
                          )}
                        >{c.label}</button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            onClick={() => (step === 0 ? navigate({ to: "/app" }) : setStep((s) => s - 1))}
            disabled={submitting}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            {step === 0 ? "Skip for now" : "Back"}
          </Button>

          {step < totalSteps - 1 ? (
            <Button
              onClick={() => setStep((s) => s + 1)}
              disabled={!initialized}
              className="bg-gradient-to-r from-violet-500 to-cyan-400"
            >
              Next <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={submit}
              disabled={submitting}
              className="bg-gradient-to-r from-violet-500 to-cyan-400"
            >
              {submitting ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Setting up…</> : <>Finish <Check className="h-4 w-4 ml-1" /></>}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
