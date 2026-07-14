export type ExamKey = "cat" | "jee" | "neet" | "railways" | "ssc_upsc" | "banking";

export type ExamMeta = {
  key: ExamKey;
  label: string;
  emoji: string;
  groupSlug: string;
  subjects: string[];
  /** Roughly-typical exam month (1-12) — used to seed a countdown. */
  typicalMonth: number;
  /** Roughly-typical day of month. */
  typicalDay: number;
};

export const EXAMS: ExamMeta[] = [
  {
    key: "cat", label: "CAT", emoji: "📊", groupSlug: "exam-cat",
    subjects: ["Quantitative Aptitude", "Verbal Ability", "Data Interpretation", "Logical Reasoning"],
    typicalMonth: 11, typicalDay: 24,
  },
  {
    key: "jee", label: "JEE", emoji: "⚙️", groupSlug: "exam-jee",
    subjects: ["Physics", "Chemistry", "Mathematics"],
    typicalMonth: 1, typicalDay: 24,
  },
  {
    key: "neet", label: "NEET", emoji: "🩺", groupSlug: "exam-neet",
    subjects: ["Physics", "Chemistry", "Botany", "Zoology"],
    typicalMonth: 5, typicalDay: 5,
  },
  {
    key: "railways", label: "Railways (RRB)", emoji: "🚆", groupSlug: "exam-railways",
    subjects: ["General Awareness", "Maths", "Reasoning", "General Science", "Current Affairs"],
    typicalMonth: 9, typicalDay: 15,
  },
  {
    key: "ssc_upsc", label: "SSC / UPSC", emoji: "🏛️", groupSlug: "exam-ssc-upsc",
    subjects: ["General Studies", "CSAT / Reasoning", "Quantitative Aptitude", "English", "Current Affairs", "Optional Subject"],
    typicalMonth: 6, typicalDay: 2,
  },
  {
    key: "banking", label: "Banking (IBPS/SBI)", emoji: "🏦", groupSlug: "exam-banking",
    subjects: ["Quantitative Aptitude", "Reasoning", "English", "General Awareness", "Computer Awareness"],
    typicalMonth: 10, typicalDay: 12,
  },
];

export const EXAM_BY_KEY: Record<ExamKey, ExamMeta> =
  Object.fromEntries(EXAMS.map((e) => [e.key, e])) as Record<ExamKey, ExamMeta>;

export function defaultExamDate(key: ExamKey, year: number): string {
  const m = EXAM_BY_KEY[key];
  const mm = String(m.typicalMonth).padStart(2, "0");
  const dd = String(m.typicalDay).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

export function profileContextLine(p: {
  exam: ExamKey; attempt_year: number; daily_hours: number;
  preferred_time: string; prep_stage: string; weak_subjects: string[] | null;
  goal: string | null; coaching_status: string;
}): string {
  const exam = EXAM_BY_KEY[p.exam]?.label ?? p.exam;
  const weak = (p.weak_subjects ?? []).slice(0, 4).join(", ") || "none flagged";
  return `User is preparing for ${exam} ${p.attempt_year} — ~${p.daily_hours} hrs/day (${p.preferred_time}), ${p.prep_stage} stage, weak in ${weak}, coaching: ${p.coaching_status}${p.goal ? `, goal: ${p.goal}` : ""}.`;
}
