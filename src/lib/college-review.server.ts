/**
 * Automated college-review article generation.
 *
 * Two AI passes per college:
 *   1. research  — collect facts with year + source per number (web-grounded when
 *                  PERPLEXITY_API_KEY is available, otherwise model knowledge only)
 *   2. write     — turn the research JSON into the 27-section ClassLab review markdown
 *
 * Server-only. Never import from client code.
 */

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3.7-flash";

export type QueueRow = {
  id: string;
  name: string;
  city: string | null;
  exam_track: string;
  notes: string | null;
};

export class PipelineHalt extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

function admissionYear(): number {
  const now = new Date();
  // Articles target the admission cycle that entrance exams held this year feed into.
  // e.g. during 2026 the CAT 2026 exam leads to 2027 admissions.
  return now.getUTCFullYear() + 1;
}

// The entrance-exam year that feeds the given admission cycle (CAT 2026 -> 2027 intake).
function examYear(year: number): number {
  return year - 1;
}


async function gateway(messages: { role: string; content: string }[]): Promise<string> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new PipelineHalt("LOVABLE_API_KEY is not configured", 500);

  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, messages }),
  });

  if (res.status === 402 || res.status === 403) {
    const body = await res.text();
    throw new PipelineHalt(`AI gateway blocked (${res.status}): ${body.slice(0, 300)}`, res.status);
  }
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`AI gateway error ${res.status}: ${body.slice(0, 300)}`);
  }
  const json = (await res.json()) as any;
  const text = json?.choices?.[0]?.message?.content;
  if (!text || typeof text !== "string") throw new Error("AI gateway returned no content");
  return text;
}

/** Web-grounded research through Perplexity when connected. Returns null when unavailable. */
async function perplexityResearch(college: QueueRow, year: number): Promise<string | null> {
  const key = process.env.PERPLEXITY_API_KEY;
  if (!key) return null;

  const prompt = `Research the Indian college "${college.name}"${college.city ? ` in ${college.city}` : ""} for a ${year} admissions review (entrance exams held in ${examYear(year)} feed this ${year} intake).
Collect, with the YEAR and SOURCE attached to every number:
- official website, university/parent body, establishment year, type, accreditation
- courses offered with duration, eligibility, entrance exam and course-wise fees
- total fees, tuition, hostel, mess, application fee
- previous-year cutoffs by category, official qualifying cutoff, expected cutoff for ${year}, safe target
- selection criteria weightage (exam / GD / WAT / PI / academics / work experience)
- placements for the last 3 years: highest, average, median package, placement rate, number of recruiters, offers
- top recruiters grouped by sector, roles offered
- batch profile: size, freshers %, work-ex %, gender ratio, engineer/non-engineer split
- infrastructure, hostel, faculty strength, student-faculty ratio
- what students say on Reddit / Quora / review sites (clearly labelled as student opinion, with links)
- important admission dates for the ${year} cycle, labelled Official / Expected / Tentative / To Be Announced
- 2-4 genuine competitor colleges with fees, cutoff, average package
If a figure is not publicly available, say "Not officially disclosed" — never estimate silently.`;

  const res = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "sonar-pro",
      messages: [
        { role: "system", content: "You are a meticulous Indian higher-education researcher. Cite a source and a year for every number. Never invent data." },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    if (res.status === 401 && body.includes("insufficient_quota")) {
      throw new PipelineHalt(
        "Perplexity API credits are exhausted. Buy API credits at https://console.perplexity.ai for the connected account.",
        402
      );
    }
    console.error("perplexity research failed", res.status, body.slice(0, 200));
    return null;
  }
  const json = (await res.json()) as any;
  const content: string = json?.choices?.[0]?.message?.content ?? "";
  const citations: string[] = json?.citations ?? json?.search_results?.map((s: any) => s.url) ?? [];
  if (!content) return null;
  return citations.length ? `${content}\n\nSOURCES:\n${citations.map((c) => `- ${c}`).join("\n")}` : content;
}

/** Fallback research pass using the Lovable AI gateway (model knowledge only). */
async function modelResearch(college: QueueRow, year: number): Promise<string> {
  return gateway([
    {
      role: "system",
      content:
        "You are an Indian higher-education research analyst. You have no live web access, so you must be conservative: state only what you are confident about, attach the year to every figure, and write 'Not officially disclosed' or 'Data unavailable' for anything you cannot verify. Never invent cutoffs, packages or dates.",
    },
    {
      role: "user",
      content: `Compile a factual research brief on "${college.name}"${college.city ? `, ${college.city}` : ""} for a ${year} admissions review: overview, courses, fees, eligibility, admission process, cutoffs, selection weightage, placements (3-year trend), recruiters, roles, batch profile, academics, campus life, infrastructure, hostel, faculty, student sentiment, competitors. Mark every uncertain item explicitly.`,
    },
  ]);
}

const CONTENT_RULES = `CONTENT RULES (non-negotiable):
- Use the same 27-section structure for every college, in order, with "## " headings.
- Every numerical figure carries the year it belongs to.
- Attach a source to every important number where one is available.
- Never present an estimate as an official figure.
- Clearly label Official / Expected / Tentative / To Be Announced.
- Keep Official Cutoff, Expected Cutoff and Safe Target separate.
- Do not invent missing data — write "Not officially disclosed" or "Data unavailable".
- Student opinions are labelled as student reviews, not institutional facts.
- Use GitHub-flavoured markdown tables for the quick-info table, dates, fees, cutoffs, placement trends, ratings, comparison and the standard data table.
- Write in clear, plain English for Indian students. No fluff, no marketing tone.`;

const SECTIONS = `1. College Overview
2. Latest Updates
3. Important Dates
4. Courses Offered
5. Fees Structure
6. Eligibility Criteria
7. Admission Process
8. Cutoff — Previous + Expected
9. Selection Criteria & Weightage
10. Placements
11. Placement Trends
12. Top Recruiters
13. Roles Offered
14. ROI — Is the College Worth It?
15. Batch Profile
16. Academics & Curriculum
17. Campus Life
18. Infrastructure & Facilities
19. Hostel & Accommodation
20. Faculty
21. Student Reviews
22. ClassLab Rating
23. Pros & Cons
24. College vs Competitors
25. Who Should Choose This College?
26. Final Verdict
27. FAQs`;

export type GeneratedArticle = {
  title: string;
  excerpt: string;
  content: string;
  seo_title: string;
  seo_description: string;
  keywords: string;
  tags: string[];
  cover_alt: string;
};

export async function generateArticle(college: QueueRow): Promise<GeneratedArticle> {
  const year = admissionYear();
  let research: string | null = null;
  try {
    research = await perplexityResearch(college, year);
  } catch (e) {
    if (e instanceof PipelineHalt) throw e;
    console.error("research pass failed", e);
  }
  if (!research) research = await modelResearch(college, year);

  const markdown = await gateway([
    {
      role: "system",
      content: `You write ClassLab college review articles. Output ONLY markdown article body — no code fences, no preamble, no title heading (the title is stored separately).\n\n${CONTENT_RULES}`,
    },
    {
      role: "user",
      content: `Write the full ClassLab college review for "${college.name}"${college.city ? `, ${college.city}` : ""} (admission cycle ${year}).

Year rule (must be followed everywhere): the ${year} intake is filled through entrance exams held in ${examYear(year)}. Always write the exam as "${college.exam_track ?? "CAT"} ${examYear(year)}" and the intake as "${year} admission" / "${year}-${String(year + 2).slice(2)} batch". Never refer to a ${year} exam session or a ${year + 1} intake.


Start with a 2-3 sentence intro paragraph, then a "## Quick College Information" markdown table with rows: College Name, University / Parent Institution, Location, Established, College Type, Affiliation / Accreditation, Flagship Course, Entrance Exam, Estimated Cutoff, Average Package, Highest Package, Total Fees, Official Website.

Then these 27 sections as "## " headings, exactly in this order:
${SECTIONS}

Finish with a "## Standard Data Table" markdown table with columns Data Point | Value | Year | Source, covering Cutoff, Fees, Highest Package, Average Package, Median Package, Placement Rate, Batch Size, Ranking, Admission Dates, Application Fee.

Section 27 (FAQs) must answer: expected cutoff, safe percentile, fees, average package, highest package, exams accepted, GD/PI, hostel, strength by specialisation, worth it, ROI, admission difficulty.

${college.notes ? `Editor notes to respect: ${college.notes}\n\n` : ""}RESEARCH BRIEF:
${research.slice(0, 24000)}`,
    },
  ]);

  const content = markdown.replace(/^```(?:markdown)?\s*/i, "").replace(/```\s*$/i, "").trim();

  const meta = await gateway([
    {
      role: "system",
      content: 'Return ONLY minified JSON, no code fences. Shape: {"excerpt":string,"seo_description":string,"keywords":string,"tags":string[]}',
    },
    {
      role: "user",
      content: `For a ${year} admission review of "${college.name}", produce:
excerpt: 150-180 characters, plain, no marketing.
seo_description: under 158 characters, following "Check ${college.name} admission ${year}, expected cutoff, fees, courses, placements, average package, eligibility, important dates, campus life, ROI and student reviews." trimmed to fit.
keywords: 6-9 comma separated search phrases.
tags: 3-5 short lowercase topic tags (include "college review" and the entrance exam).`,
    },
  ]);

  let parsed: any = {};
  try {
    parsed = JSON.parse(meta.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim());
  } catch {
    /* fall back below */
  }

  const title = `${college.name} Admission ${year}: Fees, Cutoff, Courses, Placements, Ranking, Eligibility & Review`;
  const fallbackDesc = `Check ${college.name} admission ${year}, expected cutoff, fees, courses, placements, average package, eligibility, important dates, campus life, ROI and student reviews.`;

  const tags = Array.isArray(parsed.tags) && parsed.tags.length
    ? parsed.tags.slice(0, 5).map((t: unknown) => String(t).toLowerCase())
    : ["college review", college.exam_track, "admission"];

  return {
    title,
    excerpt: String(parsed.excerpt ?? fallbackDesc).slice(0, 220),
    content,
    seo_title: `${college.name} Admission ${year}: Cutoff, Fees & Placements`.slice(0, 60),
    seo_description: String(parsed.seo_description ?? fallbackDesc).slice(0, 158),
    keywords: String(parsed.keywords ?? `${college.name} admission ${year}, ${college.name} fees, ${college.name} cutoff, ${college.name} placements`),
    tags: Array.from(new Set([...tags, "college review"])).slice(0, 6),
    cover_alt: `${college.name} campus and admission overview for ${year}`,
  };
}

export function slugifyTitle(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80)
    .replace(/-$/, "");
}

/* ------------------------------------------------------------------ *
 * Free-form topic articles ("just drop a topic, get a blog post")
 * ------------------------------------------------------------------ */

async function topicResearch(topic: string): Promise<string | null> {
  const key = process.env.PERPLEXITY_API_KEY;
  if (!key) return null;
  const res = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "sonar-pro",
      messages: [
        { role: "system", content: "You are a meticulous researcher for an Indian student-focused publication. Attach a year and a source to every number. Never invent data." },
        { role: "user", content: `Research the topic "${topic}" for an in-depth article aimed at Indian students preparing for competitive exams and college admissions. Include current facts, dates, numbers, official sources, expert guidance, common mistakes and what students say online. Mark anything unverified.` },
      ],
    }),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as any;
  const content: string = json?.choices?.[0]?.message?.content ?? "";
  const citations: string[] = json?.citations ?? json?.search_results?.map((s: any) => s.url) ?? [];
  if (!content) return null;
  return citations.length ? `${content}\n\nSOURCES:\n${citations.map((c) => `- ${c}`).join("\n")}` : content;
}

export async function generateTopicArticle(row: QueueRow): Promise<GeneratedArticle> {
  const topic = row.name;
  let research: string | null = null;
  try {
    research = await topicResearch(topic);
  } catch (e) {
    if (e instanceof PipelineHalt) throw e;
    console.error("topic research failed", e);
  }
  if (!research) {
    research = await gateway([
      { role: "system", content: "You are a careful research analyst writing for Indian students. State only what you are confident about, attach years to figures, and mark anything uncertain." },
      { role: "user", content: `Compile a factual research brief on: ${topic}` },
    ]);
  }

  const markdown = await gateway([
    {
      role: "system",
      content:
        "You write ClassLab blog articles for Indian students. Output ONLY the markdown article body — no code fences, no preamble, no H1 title (the title is stored separately). Use '## ' section headings, GitHub-flavoured markdown tables where data helps, short paragraphs, bullet lists and a final '## FAQs' section with 5-8 questions. Plain English, no marketing fluff, never invent data.",
    },
    {
      role: "user",
      content: `Write a comprehensive, genuinely useful 1500-2500 word article on the topic: "${topic}".
${row.notes ? `Editor notes to respect: ${row.notes}\n` : ""}Open with a 2-3 sentence intro, then 8-14 well-structured sections that actually answer what a student searching this topic wants, and close with FAQs.

RESEARCH BRIEF:
${research.slice(0, 20000)}`,
    },
  ]);

  const content = markdown.replace(/^```(?:markdown)?\s*/i, "").replace(/```\s*$/i, "").trim();

  const meta = await gateway([
    {
      role: "system",
      content: 'Return ONLY minified JSON, no code fences. Shape: {"title":string,"excerpt":string,"seo_title":string,"seo_description":string,"keywords":string,"tags":string[]}',
    },
    {
      role: "user",
      content: `For an article on "${topic}" aimed at Indian students: title (SEO-friendly, under 70 chars), excerpt (150-180 chars), seo_title (under 60 chars), seo_description (under 158 chars), keywords (6-9 comma separated phrases), tags (3-5 short lowercase topic tags).`,
    },
  ]);

  let parsed: any = {};
  try {
    parsed = JSON.parse(meta.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim());
  } catch { /* fallbacks below */ }

  const title = String(parsed.title || topic).slice(0, 140);
  const fallbackDesc = `${topic} — a complete, up-to-date guide for Indian students: key facts, dates, tips and FAQs.`;
  const tags = Array.isArray(parsed.tags) && parsed.tags.length
    ? parsed.tags.slice(0, 5).map((t: unknown) => String(t).toLowerCase())
    : ["guide", String(row.exam_track)];

  return {
    title,
    excerpt: String(parsed.excerpt ?? fallbackDesc).slice(0, 220),
    content,
    seo_title: String(parsed.seo_title ?? title).slice(0, 60),
    seo_description: String(parsed.seo_description ?? fallbackDesc).slice(0, 158),
    keywords: String(parsed.keywords ?? topic),
    tags: Array.from(new Set(tags)).slice(0, 6),
    cover_alt: title,
  };
}
