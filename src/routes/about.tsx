import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail } from "lucide-react";

const URL = "https://classlab.in/about";
const TITLE = "About ClassLab | The Study Platform Built for Indian Students";
const DESC =
  "ClassLab is a student platform combining focus tracking, exam communities, shared notes, mind maps, watch parties and an AI study assistant. Learn who we are and how to contact us.";
const EMAIL = "y2nikhil@gmail.com";

const PILLARS = [
  { h: "Focus you can measure", p: "Punch into study sessions, track daily focus hours, see your timeline and adherence, and earn trophies as your consistency compounds week after week." },
  { h: "Communities per exam", p: "CAT, JEE, NEET, SSC/UPSC, Banking and Railways aspirants get their own groups, chat rooms and study circles so every question lands in front of people preparing for the same paper." },
  { h: "Notes, mind maps and playlists", p: "Turn scattered YouTube lectures and PDFs into structured mind maps and checklists you can drag, annotate and mark complete as you go." },
  { h: "Study together, live", p: "Watch parties keep lectures in sync with friends, and real-time chat means doubts get solved while you're still on the topic." },
  { h: "An AI assistant that knows your prep", p: "The assistant reads your prep profile, exam date, weak subjects and daily study behaviour so answers and plans are personal — not generic." },
];

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { name: "keywords", content: "about ClassLab, student study platform India, exam preparation community, study tracker, ClassLab contact" },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "AboutPage",
              name: TITLE,
              description: DESC,
              url: URL,
              isPartOf: { "@type": "WebSite", name: "ClassLab", url: "https://classlab.in" },
            },
            {
              "@type": "Organization",
              name: "ClassLab",
              url: "https://classlab.in",
              email: EMAIL,
              description: DESC,
              contactPoint: [{ "@type": "ContactPoint", email: EMAIL, contactType: "customer support", availableLanguage: ["English", "Hindi"] }],
            },
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "ClassLab", item: "https://classlab.in/" },
                { "@type": "ListItem", position: 2, name: "About", item: URL },
              ],
            },
          ],
        }),
      },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-12">
      <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground">
        <Link to="/" className="hover:underline">ClassLab</Link> / <span className="text-foreground">About</span>
      </nav>

      <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">About ClassLab</h1>
      <p className="mt-4 text-[15px] leading-7 text-foreground/85">
        ClassLab is a study platform for students who are tired of juggling ten apps to get through one syllabus. Timers live in one
        place, notes in another, doubts in a group chat that scrolls away, and lectures in a browser tab nobody comes back to.
        ClassLab pulls all of it into a single workspace built around one question: <em>did today actually move your preparation forward?</em>
      </p>

      <section className="mt-10">
        <h2 className="text-xl font-bold">What we build</h2>
        <div className="mt-4 space-y-5">
          {PILLARS.map((p) => (
            <div key={p.h} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <h3 className="text-base font-semibold text-amber-300">{p.h}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{p.p}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold">Who ClassLab is for</h2>
        <p className="mt-3 text-[15px] leading-7 text-foreground/85">
          Competitive-exam aspirants who need structure and accountability; college students coordinating projects, clubs and
          placements; and self-studiers who learn best with other people in the room — even when the room is online. Everything
          core is free to use, and the community is moderated so the feed stays useful.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold">How we work</h2>
        <p className="mt-3 text-[15px] leading-7 text-foreground/85">
          We ship fast and build in the open with student feedback. Features come from what people actually ask for in the feed and
          chat rooms, and the roadmap changes when the community says something isn't working. If you have an idea, a bug, a
          partnership, an internship enquiry or want to write for the{" "}
          <Link to="/blog" className="text-amber-300 underline underline-offset-2">ClassLab blog</Link>, write to us — we read everything.
        </p>
      </section>

      <section className="mt-10 rounded-2xl border border-amber-400/25 bg-amber-400/[0.06] p-6">
        <h2 className="text-xl font-bold">Contact</h2>
        <p className="mt-2 text-sm text-muted-foreground">Questions, feedback, press or partnerships — one inbox, real replies.</p>
        <a href={`mailto:${EMAIL}`} className="mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-5 py-2.5 text-sm font-semibold text-black">
          <Mail className="h-4 w-4" /> {EMAIL}
        </a>
      </section>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link to="/signup" className="rounded-full bg-white/5 px-5 py-2.5 text-sm font-semibold hover:bg-white/10">Create free account</Link>
        <Link to="/feed" className="rounded-full bg-white/5 px-5 py-2.5 text-sm font-semibold hover:bg-white/10">Student feed</Link>
        <Link to="/blog" className="rounded-full bg-white/5 px-5 py-2.5 text-sm font-semibold hover:bg-white/10">Blog</Link>
      </div>
    </main>
  );
}
