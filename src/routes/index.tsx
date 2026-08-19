import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Users,
  CalendarDays,
  MessageSquare,
  Timer,
  Brain,
  Sparkles,
  Search,
  Bell,
  Trophy,
  Network,
  ListChecks,
  PlayCircle,
  ShieldCheck,
  BellRing,
  UserRound,
  Plug,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { upvotePct, timeAgo } from "@/lib/feed";

type PublicHomePost = {
  id: string;
  slug: string | null;
  title: string;
  body: string | null;
  tag: string | null;
  up_count: number;
  down_count: number;
  comment_count: number;
  created_at: string;
  author_name: string | null;
};

type LiveParty = {
  id: string;
  title: string | null;
  poster_url: string | null;
  media_kind: string | null;
  visibility: string;
  started_at: string | null;
  is_playing: boolean | null;
};


const HOME_FAQS = [
  {
    q: "What is ClassLab?",
    a: "ClassLab is a digital campus for students — a public feed, community chat rooms, watch parties, focus tracking, shared mind maps, a calendar with exam countdowns and a personalised AI study assistant, all in one account.",
  },
  {
    q: "Is ClassLab free for students?",
    a: "Yes. Creating an account and using the feed, communities, chat, study rooms, focus tracking, mind maps and the AI study assistant is free.",
  },
  {
    q: "Which exams does ClassLab support?",
    a: "During onboarding you pick your track — CAT, JEE, NEET, SSC/UPSC, Banking or Railways — and ClassLab tailors your study plan, countdowns, communities and AI answers around it.",
  },
  {
    q: "What is a watch party?",
    a: "A synced room where you and your friends watch the same lecture or video together, with live chat. Rooms can be public for anyone to join, or private with an invite link.",
  },
  {
    q: "How does focus tracking work?",
    a: "You punch into a status like Deep Focus, Class or Break. ClassLab builds a live timeline of your day, totals your tracked hours and turns consistent streaks into trophies.",
  },
  {
    q: "Can I use ClassLab on mobile?",
    a: "Yes. ClassLab is fully responsive, works in any mobile browser and can send push notifications for messages, mentions and events.",
  },
];

const SITE_PAGES = [
  { label: "Blog", to: "/blog" },
  { label: "About", to: "/about" },
  { label: "Watch Party", to: "/watch-party" },
  { label: "Student Chat", to: "/student-chat" },
  { label: "Study Groups", to: "/study-groups" },
  { label: "Communities", to: "/communities" },
  { label: "Notes Sharing", to: "/notes-sharing" },
  { label: "College Clubs", to: "/college-clubs" },
  { label: "Events", to: "/events" },
  { label: "Projects", to: "/projects" },
  { label: "Resources", to: "/resources" },
  { label: "Portfolio", to: "/portfolio" },
  { label: "Coding Rooms", to: "/coding-rooms" },
  { label: "Internships", to: "/internships" },
  { label: "Campus Network", to: "/campus-network" },
  { label: "Discussion Forums", to: "/forums" },
  { label: "Exam Prep", to: "/exam-prep" },
  { label: "Career Hub", to: "/career" },
  { label: "AI Study Assistant", to: "/ai-study-assistant" },
];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ClassLab — Study Together. Focus Tracked. Exams Cracked." },
      {
        name: "description",
        content:
          "ClassLab is the digital campus for Indian students: student feed, community chat, synced watch parties, focus tracking, mind maps, exam countdowns and a personalised AI study assistant.",
      },
      {
        name: "keywords",
        content:
          "student community platform, study together online, focus tracker, exam prep app, CAT JEE NEET preparation, watch party study, AI study assistant",
      },
      { property: "og:title", content: "ClassLab — Study Together. Focus Tracked. Exams Cracked." },
      {
        property: "og:description",
        content:
          "Feed, communities, watch parties, focus tracking, mind maps, countdowns and a personalised AI study assistant — one free account.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://classlab.in/" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "ClassLab — Study Together. Focus Tracked. Exams Cracked." },
      {
        name: "twitter:description",
        content: "The digital campus for students — communities, focus tracking, watch parties and an AI study assistant.",
      },
    ],
    links: [{ rel: "canonical", href: "https://classlab.in/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              name: "ClassLab",
              url: "https://classlab.in",
              logo: "https://classlab.in/favicon.png",
              description:
                "ClassLab is a digital campus for Indian students, combining community, focus tracking and AI-assisted exam preparation.",
            },
            {
              "@type": "WebPage",
              name: "ClassLab — The Digital Campus",
              url: "https://classlab.in/",
              description:
                "ClassLab is a digital campus for students: feed, communities, watch parties, focus tracking, mind maps and an AI study assistant.",
              isPartOf: { "@type": "WebSite", name: "ClassLab", url: "https://classlab.in" },
            },
            {
              "@type": "FAQPage",
              mainEntity: HOME_FAQS.map((f) => ({
                "@type": "Question",
                name: f.q,
                acceptedAnswer: { "@type": "Answer", text: f.a },
              })),
            },
          ],
        }),
      },
    ],
  }),
  loader: async () => {
    const [postsRes, partiesRes] = await Promise.all([
      (supabase as any).rpc("public_posts", { _limit: 6, _offset: 0 }),
      supabase
        .from("watch_parties")
        .select("id,title,poster_url,media_kind,visibility,started_at,is_playing")
        .eq("visibility", "public")
        .is("ended_at", null)
        .order("started_at", { ascending: false })
        .limit(6),
    ]);
    return {
      posts: ((postsRes?.data ?? []) as PublicHomePost[]).slice(0, 6),
      parties: (partiesRes?.data ?? []) as LiveParty[],
    };
  },
  component: LandingPage,
});


const PILLARS = [
  {
    icon: MessageSquare,
    title: "Feed & communities",
    desc: "A public student feed with posts, images, reactions, comments and bookmarks — plus community chat rooms and direct messages for your batch.",
    to: "/feed",
    cta: "Open the feed",
  },
  {
    icon: Timer,
    title: "Focus tracking",
    desc: "Punch into Deep Focus, Class or Break. Your day becomes a live timeline with tracked hours, streaks and daily goals you set yourself.",
    to: "/study-groups",
    cta: "How it works",
  },
  {
    icon: PlayCircle,
    title: "Watch parties",
    desc: "Watch lectures together in sync with live chat. Public rooms anyone can join, or private rooms with a shareable invite link.",
    to: "/watch-party",
    cta: "See watch parties",
  },
  {
    icon: Brain,
    title: "AI study assistant",
    desc: "An assistant that knows your exam, your prep stage and your actual study behaviour — so answers, plans and nudges are yours, not generic.",
    to: "/ai-study-assistant",
    cta: "Meet the assistant",
  },
  {
    icon: Network,
    title: "Infinite mind maps",
    desc: "Plan a syllabus on an endless canvas. Drag topics, connect them, and pin YouTube videos straight onto the board to watch and tick off.",
    to: "/notes-sharing",
    cta: "Explore mind maps",
  },
  {
    icon: CalendarDays,
    title: "Calendar & countdowns",
    desc: "Your events in one calendar, with a countdown carousel underneath — add every exam date and see exactly how many days are left.",
    to: "/events",
    cta: "See events",
  },
];

const SECONDARY = [
  { icon: ListChecks, title: "Tasks & notes", desc: "Lightweight to-dos and notes that live next to your day." },
  { icon: Trophy, title: "Trophies & progress", desc: "A progress bar from your current trophy to the next milestone." },
  { icon: UserRound, title: "Public profiles", desc: "Karma, posts, comments and focus stats on a shareable profile." },
  { icon: BellRing, title: "Push notifications", desc: "Real-time alerts with sound for messages, mentions and events." },
  { icon: ShieldCheck, title: "Moderation tools", desc: "Report, review and remove — admins keep every room clean." },
  { icon: Plug, title: "Agent integrations", desc: "Connect assistants like Claude or ChatGPT to your ClassLab tasks." },
];

const EXAMS = ["CAT", "JEE", "NEET", "SSC / UPSC", "Banking", "Railways"];

const HOW = [
  { step: "01", title: "Tell us your exam", desc: "Pick your track, target year, daily study capacity and weak areas in a one-minute onboarding." },
  { step: "02", title: "Get your setup", desc: "ClassLab drops you into the right community, seeds a countdown and drafts a starter plan on your mind map." },
  { step: "03", title: "Show up daily", desc: "Punch in, study with people who are online, and let the timeline and trophies keep the streak honest." },
];

const NAV = [
  { label: "Feed", to: "/feed" },
  { label: "Communities", to: "/communities" },
  { label: "Watch Party", to: "/watch-party" },
  { label: "Exam Prep", to: "/exam-prep" },
  { label: "AI Assistant", to: "/ai-study-assistant" },
];

function BrandMark({ size = 36 }: { size?: number }) {
  return <BrandLogo size={size} showText={false} />;
}

/* Public, no-login preview of the live feed and public watch parties */
function PublicPreview() {
  const { posts, parties } = Route.useLoaderData() as { posts: PublicHomePost[]; parties: LiveParty[] };

  return (
    <section id="live" className="border-y border-border bg-card/40">
      <div className="mx-auto max-w-7xl scroll-mt-24 px-5 py-16 lg:px-10 lg:py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">
              Open to everyone
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Look around before you sign up.
            </h2>
            <p className="mt-3 text-muted-foreground">
              The student feed and public watch parties are readable without an account. Sign in only
              when you want to post, comment, vote or join a room.
            </p>
          </div>
          <Link to="/feed">
            <Button variant="outline" className="h-11 rounded-full border-border bg-transparent px-5 hover:bg-secondary">
              Open the full feed
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>

        <div className="mt-10 grid items-start gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          {/* Feed */}
          <div className="rounded-[22px] border border-border bg-background p-5">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              <h3 className="font-display text-lg font-bold tracking-tight">From the student feed</h3>
            </div>

            {posts.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">
                No public posts yet — be the first to start a discussion.
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-border">
                {posts.map((p) => (
                  <li key={p.id} className="py-3 first:pt-0 last:pb-0">
                    <Link
                      to="/post/$slug"
                      params={{ slug: p.slug ?? p.id }}
                      className="group block"
                    >
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                        {p.tag ? (
                          <span className="rounded-full border border-border bg-secondary px-2 py-0.5">{p.tag}</span>
                        ) : null}
                        <span>{p.author_name ?? "Student"}</span>
                        <span aria-hidden>·</span>
                        <span>{timeAgo(p.created_at)}</span>
                      </div>
                      <p className="mt-1.5 font-medium leading-snug group-hover:text-primary">{p.title}</p>
                      {p.body ? (
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{p.body}</p>
                      ) : null}
                      <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                        {p.up_count + p.down_count > 0 ? (
                          <span>{upvotePct(p.up_count, p.down_count)}% helpful</span>
                        ) : null}
                        <span>{p.comment_count} comments</span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3">
              <p className="flex-1 text-xs text-muted-foreground">
                Reading is free. Sign in to comment, upvote and post.
              </p>
              <Link to="/signup">
                <Button size="sm" className="rounded-full bg-primary px-4 text-primary-foreground hover:bg-primary/90">
                  Sign in to interact
                </Button>
              </Link>
            </div>
          </div>

          {/* Live public rooms */}
          <div className="rounded-[22px] border border-border bg-background p-5">
            <div className="flex items-center gap-2">
              <PlayCircle className="h-4 w-4 text-primary" />
              <h3 className="font-display text-lg font-bold tracking-tight">Public watch parties</h3>
              {parties.length > 0 ? (
                <span className="ml-auto flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[color:var(--chart-2)]" />
                  {parties.length} live
                </span>
              ) : null}
            </div>

            {parties.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">
                No public rooms are live right now. Rooms show up here the moment someone goes live —
                anyone can browse them, signing in is only needed to join the chat.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {parties.map((r) => (
                  <li key={r.id} className="flex gap-3 rounded-xl border border-border bg-card p-3">
                    <div className="h-14 w-24 shrink-0 overflow-hidden rounded-lg bg-secondary">
                      {r.poster_url ? (
                        <img
                          src={r.poster_url}
                          alt={r.title ?? "Watch party"}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="grid h-full w-full place-items-center">
                          <PlayCircle className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{r.title ?? "Untitled room"}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {r.is_playing ? "Playing now" : "Paused"} · Public room
                      </p>
                      <Link to="/signup" className="mt-1.5 inline-block text-xs font-medium text-primary">
                        Sign in to join →
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <Link to="/watch-party" className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
              How watch parties work
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}


function LandingPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/app" });
  }, [user, loading, navigate]);

  return (
    <div className="relative min-h-screen bg-background text-foreground font-sans">
      {/* atmosphere */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(55% 40% at 85% 6%, color-mix(in oklab, var(--primary) 12%, transparent), transparent 60%), radial-gradient(45% 35% at 6% 22%, color-mix(in oklab, var(--chart-3) 8%, transparent), transparent 60%)",
        }}
      />

      <div className="relative z-10">
        {/* NAV */}
        <header className="sticky top-0 z-50 border-b border-border/70 bg-background/75 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-10">
            <Link to="/" className="flex items-center gap-3">
              <BrandMark />
              <div className="leading-tight">
                <p className="font-display text-lg font-bold tracking-tight">ClassLab</p>
                <p className="-mt-0.5 text-[11px] text-muted-foreground">The Digital Campus</p>
              </div>
            </Link>

            <nav className="hidden items-center gap-1 md:flex">
              {NAV.map((n) => (
                <Link
                  key={n.label}
                  to={n.to as never}
                  className="rounded-full px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {n.label}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              <Link to="/login">
                <Button variant="outline" size="sm" className="rounded-full border-border bg-transparent px-4 text-foreground hover:bg-secondary">
                  Log In
                </Button>
              </Link>
              <Link to="/signup">
                <Button size="sm" className="rounded-full bg-primary px-4 text-primary-foreground hover:bg-primary/90">
                  Join ClassLab
                </Button>
              </Link>
            </div>
          </div>
        </header>

        {/* HERO */}
        <section className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-5 pt-10 pb-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:px-10 lg:pt-16 lg:pb-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col justify-center"
          >
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1.5 text-xs text-muted-foreground">
              <span aria-hidden>🇮🇳</span>
              Built for Indian students
              <Sparkles className="h-3 w-3 text-primary" />
            </div>

            <h1 className="mt-6 font-display text-[42px] font-bold leading-[1.03] tracking-tight sm:text-6xl lg:text-[68px]">
              Study together.
              <br />
              Stay <span className="text-primary">accountable.</span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground lg:text-lg">
              ClassLab is one campus for the whole grind — a student feed, community chat, synced
              watch parties, focus tracking, mind maps, exam countdowns and an AI assistant that
              actually knows your prep.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/signup">
                <Button
                  size="lg"
                  className="group h-12 rounded-full bg-primary px-6 text-primary-foreground shadow-[0_8px_24px_-8px_color-mix(in_oklab,var(--primary)_50%,transparent)] hover:bg-primary/90"
                >
                  Start free
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Button>
              </Link>
              <a href="#features">
                <Button size="lg" variant="outline" className="h-12 rounded-full border-border bg-transparent px-6 text-foreground hover:bg-secondary">
                  See everything inside
                </Button>
              </a>
            </div>

            <div className="mt-10">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Tracks you can join today
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {EXAMS.map((e) => (
                  <span key={e} className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground">
                    {e}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="relative"
          >
            <div className="absolute -inset-6 -z-10 rounded-[36px] bg-primary/10 blur-3xl" />
            <PreviewCard />
          </motion.div>
        </section>

        {/* PUBLIC PREVIEW: FEED + LIVE ROOMS */}
        <PublicPreview />



        {/* FEATURE PILLARS */}
        <section id="features" className="mx-auto max-w-7xl scroll-mt-24 px-5 py-16 lg:px-10 lg:py-24">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">Everything inside</p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
              One login. The whole study day.
            </h2>
            <p className="mt-3 text-muted-foreground">
              No more juggling a chat app, a timer, a notes app and five YouTube tabs. Every piece of
              ClassLab is built to keep you in the same place as the people you study with.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PILLARS.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.4, delay: i * 0.04 }}
                  className="hover-lift group flex flex-col rounded-[22px] border border-border bg-card p-6"
                >
                  <span className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-secondary">
                    <Icon className="h-5 w-5 text-primary" strokeWidth={1.75} />
                  </span>
                  <h3 className="mt-5 font-display text-xl font-bold tracking-tight">{f.title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
                  <Link
                    to={f.to as never}
                    className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-primary"
                  >
                    {f.cta}
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </motion.div>
              );
            })}
          </div>

          {/* SECONDARY GRID */}
          <div className="mt-4 grid gap-4 rounded-[22px] border border-border bg-card p-6 sm:grid-cols-2 lg:grid-cols-3">
            {SECONDARY.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.title} className="flex gap-3">
                  <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" strokeWidth={1.75} />
                  <div>
                    <p className="text-sm font-semibold">{s.title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{s.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="border-y border-border bg-card/40">
          <div className="mx-auto max-w-7xl px-5 py-16 lg:px-10 lg:py-20">
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              From signup to your first streak.
            </h2>
            <div className="mt-10 grid gap-4 lg:grid-cols-3">
              {HOW.map((h) => (
                <div key={h.step} className="rounded-[22px] border border-border bg-background p-6">
                  <p className="font-mono text-sm text-primary">{h.step}</p>
                  <h3 className="mt-3 font-display text-lg font-bold tracking-tight">{h.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{h.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ABOUT */}
        <section id="about" className="mx-auto max-w-7xl scroll-mt-24 px-5 py-16 lg:px-10 lg:py-24">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">About ClassLab</p>
              <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
                Preparation is lonely. It shouldn't be.
              </h2>
              <div className="mt-5 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
                <p>
                  Most students preparing for CAT, JEE, NEET or a government exam are doing it alone
                  in a room, with a phone that is designed to distract them. The study group is on
                  one app, the lectures on another, the timer on a third, and nobody actually knows
                  whether you studied today.
                </p>
                <p>
                  ClassLab puts the whole thing on one campus. You punch into a focus session and
                  your batch can see you're heads-down. You drop a doubt in the feed and someone from
                  your track answers it. You open a lecture as a watch party and finish it together
                  instead of abandoning it at minute nine. Your syllabus lives on a mind map where
                  videos, topics and tasks sit side by side.
                </p>
                <p>
                  And because ClassLab knows your exam, your target year, your daily capacity and
                  your actual tracked hours, the AI assistant answers like a senior who has seen your
                  timetable — not like a chatbot meeting you for the first time.
                </p>
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/signup">
                  <Button className="h-11 rounded-full bg-primary px-5 text-primary-foreground hover:bg-primary/90">
                    Create your account
                  </Button>
                </Link>
                <Link to="/feed">
                  <Button variant="outline" className="h-11 rounded-full border-border bg-transparent px-5 hover:bg-secondary">
                    Browse the public feed
                  </Button>
                </Link>
              </div>
            </div>

            <div className="rounded-[22px] border border-border bg-card p-6">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                ClassLab is best for
              </p>
              <ul className="mt-4 space-y-4 text-sm">
                {[
                  ["Exam aspirants", "CAT, JEE, NEET, SSC/UPSC, Banking and Railways cohorts with shared countdowns and plans."],
                  ["Self-study groups", "Friends who want a room to sit in, punch in and keep each other honest."],
                  ["College batches", "A feed, chat rooms and events calendar for a class, club or hostel wing."],
                  ["Solo grinders", "Focus tracking, trophies and an AI assistant that keeps the streak alive."],
                ].map(([t, d]) => (
                  <li key={t} className="border-l-2 border-primary/60 pl-4">
                    <p className="font-semibold text-foreground">{t}</p>
                    <p className="mt-0.5 text-muted-foreground">{d}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="mx-auto max-w-7xl px-5 pb-20 lg:px-10 lg:pb-28">
          <div className="relative overflow-hidden rounded-[28px] border border-border bg-card px-6 py-14 text-center lg:px-16 lg:py-20">
            <div aria-hidden className="pointer-events-none absolute -top-24 left-1/2 h-64 w-[600px] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
            <h2 className="relative font-display text-3xl font-bold tracking-tight sm:text-5xl">
              Your campus, in your <span className="text-primary">pocket.</span>
            </h2>
            <p className="relative mx-auto mt-4 max-w-xl text-muted-foreground">
              Free to join, set up in under a minute. Pick your exam, meet your track, and make today
              the first day of the streak.
            </p>
            <div className="relative mt-8 flex justify-center gap-3">
              <Link to="/signup">
                <Button size="lg" className="h-12 rounded-full bg-primary px-6 text-primary-foreground hover:bg-primary/90">
                  Join ClassLab — it's free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="mx-auto max-w-7xl px-5 pb-20 lg:px-10">
          <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Frequently asked questions</h2>
          <div className="mt-6 divide-y divide-border rounded-[22px] border border-border bg-card">
            {HOME_FAQS.map((f) => (
              <details key={f.q} className="group px-6 py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium marker:hidden">
                  {f.q}
                  <span className="text-primary transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* FOOTER */}
        <SiteFooter />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* App preview mock (pure HTML, no external assets)                    */
/* ------------------------------------------------------------------ */

function PreviewCard() {
  const quickAccess = [
    { icon: MessageSquare, label: "Feed" },
    { icon: Users, label: "Rooms" },
    { icon: PlayCircle, label: "Watch" },
    { icon: Network, label: "Mind map" },
    { icon: CalendarDays, label: "Calendar" },
    { icon: Brain, label: "AI" },
  ];

  return (
    <div className="rounded-[22px] border border-border bg-card p-3 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.7)]">
      {/* header */}
      <div className="flex items-center gap-3 rounded-t-[14px] bg-popover px-4 py-3">
        <BrandMark size={26} />
        <p className="font-display text-sm font-bold">ClassLab</p>
        <div className="ml-3 flex flex-1 items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground">
          <Search className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Search people, posts, rooms…</span>
          <span className="sm:hidden">Search…</span>
          <span className="ml-auto rounded border border-border bg-secondary px-1.5 py-0.5 text-[10px]">⌘K</span>
        </div>
        <div className="hidden items-center gap-2 rounded-lg border border-border bg-background px-2 py-1.5 text-xs sm:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--chart-2)] animate-pulse" />
          <span className="text-muted-foreground">Deep Focus</span>
          <span className="font-mono text-foreground">02:13:47</span>
        </div>
        <Bell className="h-4 w-4 text-muted-foreground" />
      </div>

      <div className="grid grid-cols-[140px_1fr] gap-3 p-3">
        {/* sidebar */}
        <aside className="hidden flex-col gap-1 rounded-[14px] border border-border bg-popover p-2 text-xs sm:flex">
          {["Home", "Feed", "Timeline", "Communities", "Watch Party", "Mind Maps", "Calendar", "Assistant", "Messages", "Trophies", "Settings"].map((s, i) => (
            <div
              key={s}
              className={`flex items-center gap-2 rounded-lg px-2.5 py-2 ${i === 0 ? "bg-secondary text-foreground" : "text-muted-foreground"}`}
            >
              <span className="h-1 w-1 rounded-full bg-current opacity-60" />
              {s}
            </div>
          ))}
        </aside>

        {/* main */}
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="font-display text-lg font-bold tracking-tight">
                Good morning, Aarav <span aria-hidden>👋</span>
              </p>
              <p className="text-xs text-muted-foreground">CAT 2026 · 214 days to go</p>
            </div>
            <div className="flex gap-1.5">
              {["Punch in", "New post"].map((b) => (
                <span key={b} className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] text-muted-foreground">
                  {b}
                </span>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Quick access</p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {quickAccess.map((q) => {
                const Icon = q.icon;
                return (
                  <div key={q.label} className="rounded-xl border border-border bg-background p-2.5 text-center">
                    <Icon className="mx-auto h-4 w-4 text-primary" strokeWidth={1.75} />
                    <p className="mt-1.5 truncate text-[10px] text-muted-foreground">{q.label}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 lg:grid-cols-[1.4fr_1fr]">
            <div className="rounded-xl border border-border bg-background p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold">Today's timeline</p>
                <span className="text-[10px] text-muted-foreground">6h 12m tracked</span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-secondary">
                <div className="flex h-full overflow-hidden rounded-full">
                  <span className="h-full w-[15%] bg-[color:var(--chart-2)]" />
                  <span className="h-full w-[8%] bg-[color:var(--chart-4)]" />
                  <span className="h-full w-[22%] bg-[color:var(--chart-3)]" />
                  <span className="h-full w-[12%] bg-[color:var(--chart-5)]" />
                  <span className="h-full w-[18%] bg-[color:var(--primary)]" />
                  <span className="h-full w-[10%] bg-[color:var(--destructive)]" />
                </div>
              </div>
              <div className="mt-2 flex justify-between text-[9px] text-muted-foreground">
                <span>12 AM</span><span>6 AM</span><span>Now</span><span>6 PM</span><span>12 AM</span>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-background p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold">Live now</p>
                <span className="text-[10px] text-muted-foreground">3 rooms</span>
              </div>
              <div className="mt-2 space-y-1.5 text-[11px]">
                {[
                  { t: "Quant marathon", d: "Watch party · 12 watching", tint: "var(--chart-3)" },
                  { t: "CAT Aspirants", d: "Chat room · 48 online", tint: "var(--primary)" },
                  { t: "Silent study hall", d: "Deep focus · 26 punched in", tint: "var(--chart-5)" },
                ].map((e) => (
                  <div key={e.t} className="flex items-center gap-2">
                    <span className="h-6 w-6 shrink-0 rounded-md" style={{ background: `color-mix(in oklab, ${e.tint} 25%, transparent)` }} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">{e.t}</p>
                      <p className="truncate text-muted-foreground">{e.d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
