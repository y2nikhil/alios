import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Users,
  CalendarDays,
  FileText,
  ShoppingBag,
  Briefcase,
  Building2,
  Sparkles,
  Search,
  Bell,
  MapPin,
  Circle,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ClassLab — The Digital Campus for Every Student" },
      {
        name: "description",
        content:
          "Discover communities, attend events, buy and sell, share notes, find internships and build your network — all inside ClassLab, the digital campus for Indian students.",
      },
      { property: "og:title", content: "ClassLab — The Digital Campus for Every Student" },
      {
        property: "og:description",
        content:
          "Join 50,000+ students from 500+ Indian colleges on ClassLab — communities, notes, events, internships and more.",
      },
    ],
  }),
  component: LandingPage,
});

const FEATURES = [
  { icon: Users, title: "Communities", desc: "Find your people and grow together.", tint: "text-[color:var(--chart-5)]" },
  { icon: CalendarDays, title: "Events", desc: "Never miss exciting college events.", tint: "text-[color:var(--destructive)]" },
  { icon: FileText, title: "Notes", desc: "Share and access quality study material.", tint: "text-[color:var(--chart-2)]" },
  { icon: ShoppingBag, title: "Marketplace", desc: "Buy, sell and exchange with students.", tint: "text-[color:var(--chart-4)]" },
  { icon: Briefcase, title: "Internships", desc: "Find opportunities and kickstart your career.", tint: "text-[color:var(--chart-3)]" },
  { icon: Building2, title: "Colleges", desc: "Explore colleges and connect.", tint: "text-[color:var(--primary)]" },
];

const STATS = [
  { icon: Building2, value: "500+", label: "Colleges", tint: "text-[color:var(--primary)]" },
  { icon: Users, value: "50K+", label: "Active Students", tint: "text-[color:var(--chart-2)]" },
  { icon: Users, value: "2.3K+", label: "Communities", tint: "text-[color:var(--chart-5)]" },
  { icon: CalendarDays, value: "10K+", label: "Events Hosted", tint: "text-[color:var(--destructive)]" },
  { icon: FileText, value: "12K+", label: "Notes Shared", tint: "text-[color:var(--chart-3)]" },
  { icon: Briefcase, value: "1K+", label: "Opportunities", tint: "text-[color:var(--chart-4)]" },
];

const COLLEGES = [
  "IIT DELHI", "BITS PILANI", "DTU", "IIT BOMBAY", "IIT ROORKEE", "NIT TRICHY", "VIT CHENNAI", "JNU", "AMITY",
];

const NAV = [
  { label: "Communities", to: "/app/collaborate" },
  { label: "Events", to: "/app/calendar" },
  { label: "Marketplace", to: "/app/party" },
  { label: "Notes", to: "/app/mindmap" },
  { label: "Internships", to: "/app/friends" },
  { label: "Colleges", to: "/app/live" },
];

function BrandMark({ size = 36 }: { size?: number }) {
  return (
    <div
      className="grid place-items-center rounded-[10px] bg-primary text-primary-foreground font-display font-bold"
      style={{ width: size, height: size, fontSize: size * 0.5 }}
      aria-label="ClassLab"
    >
      C
    </div>
  );
}

function LandingPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/app" });
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      {/* NAV */}
      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 lg:px-10">
        <Link to="/" className="flex items-center gap-3">
          <BrandMark />
          <div className="leading-tight">
            <p className="font-display text-lg font-bold tracking-tight">ClassLab</p>
            <p className="-mt-0.5 text-[11px] text-muted-foreground">The Digital Campus</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {NAV.map((n) => (
            <Link
              key={n.label}
              to={n.to as any}
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
      </header>

      {/* HERO */}
      <section className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-5 pt-6 pb-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:px-10 lg:pt-10 lg:pb-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col justify-center"
        >
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1.5 text-xs text-muted-foreground">
            <span aria-hidden>🇮🇳</span>
            Built for Indian Students
            <Sparkles className="h-3 w-3 text-primary" />
          </div>

          <h1 className="mt-6 font-display text-[44px] font-bold leading-[1.02] tracking-tight sm:text-6xl lg:text-[72px]">
            The Digital Campus
            <br />
            for <span className="text-primary">Every Student.</span>
          </h1>

          <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground lg:text-lg">
            Discover communities, attend events, buy and sell, share notes, find internships
            and build your network — all inside ClassLab.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link to="/signup">
              <Button
                size="lg"
                className="group h-12 rounded-full bg-primary px-6 text-primary-foreground shadow-[0_8px_24px_-8px_rgba(240,199,94,0.5)] hover:bg-primary/90"
              >
                Join ClassLab — It's Free
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Button>
            </Link>
            <Link to="/app/collaborate">
              <Button
                size="lg"
                variant="outline"
                className="h-12 rounded-full border-border bg-transparent px-6 text-foreground hover:bg-secondary"
              >
                Explore Communities
              </Button>
            </Link>
          </div>

          <div className="mt-10 flex items-center gap-4">
            <div className="flex -space-x-3">
              {["#F0C75E", "#6BD3A8", "#7CA8FF", "#B98CFF", "#E58A5F"].map((c, i) => (
                <div
                  key={c}
                  className="grid h-9 w-9 place-items-center rounded-full border-2 border-background text-xs font-semibold"
                  style={{ background: c, color: "#0C0C0D", zIndex: 5 - i }}
                >
                  {["A", "P", "S", "R", "K"][i]}
                </div>
              ))}
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">50,000+ students</p>
              <p className="text-xs text-muted-foreground">from 500+ colleges across India</p>
            </div>
          </div>
        </motion.div>

        {/* App preview card */}
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

      {/* TRUSTED LOGOS */}
      <section className="border-y border-border bg-[#0A0A0B]">
        <div className="mx-auto max-w-7xl px-5 py-8 lg:px-10">
          <p className="text-center text-xs uppercase tracking-widest text-muted-foreground">
            Trusted by students from top colleges
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-sm font-semibold text-muted-foreground">
            {COLLEGES.map((c) => (
              <span key={c} className="flex items-center gap-2 tracking-wide">
                <Circle className="h-3.5 w-3.5 opacity-60" />
                {c}
              </span>
            ))}
            <span className="text-primary">and 500+ more</span>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="mx-auto max-w-7xl px-5 py-16 lg:px-10 lg:py-24">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.4, delay: i * 0.04 }}
                className="hover-lift rounded-[22px] border border-border bg-card p-6"
              >
                <Icon className={`h-6 w-6 ${f.tint}`} strokeWidth={1.75} />
                <h3 className="mt-6 font-display text-xl font-bold tracking-tight">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
              </motion.div>
            );
          })}
        </div>

        {/* STATS BAR */}
        <div className="mt-10 rounded-[22px] border border-border bg-card p-6">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-6">
            {STATS.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="flex items-center gap-3">
                  <Icon className={`h-6 w-6 shrink-0 ${s.tint}`} strokeWidth={1.75} />
                  <div className="min-w-0">
                    <p className="font-display text-xl font-bold tracking-tight">{s.value}</p>
                    <p className="truncate text-xs text-muted-foreground">{s.label}</p>
                  </div>
                </div>
              );
            })}
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
            Free to join. Set up in under a minute. Meet your batch, discover events, ace your semester.
          </p>
          <div className="relative mt-8 flex justify-center gap-3">
            <Link to="/signup">
              <Button size="lg" className="h-12 rounded-full bg-primary px-6 text-primary-foreground hover:bg-primary/90">
                Join ClassLab — It's Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-5 py-8 text-xs text-muted-foreground lg:flex-row lg:px-10">
          <div className="flex items-center gap-2">
            <BrandMark size={24} />
            <span>© {new Date().getFullYear()} ClassLab · The Digital Campus for Every Student</span>
          </div>
          <div className="flex gap-5">
            <Link to="/login" className="hover:text-foreground">Log In</Link>
            <Link to="/signup" className="hover:text-foreground">Join ClassLab</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* App preview mock (pure HTML, no external assets)                    */
/* ------------------------------------------------------------------ */

function PreviewCard() {
  const quickAccess = [
    { icon: Users, label: "Communities", tint: "text-[color:var(--chart-5)]" },
    { icon: FileText, label: "Notes", tint: "text-[color:var(--chart-2)]" },
    { icon: ShoppingBag, label: "Marketplace", tint: "text-[color:var(--chart-4)]" },
    { icon: CalendarDays, label: "Events", tint: "text-[color:var(--destructive)]" },
    { icon: Briefcase, label: "Internships", tint: "text-[color:var(--chart-3)]" },
    { icon: MapPin, label: "Lost & Found", tint: "text-[color:var(--primary)]" },
  ];

  return (
    <div className="rounded-[22px] border border-border bg-card p-3 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.7)]">
      {/* header */}
      <div className="flex items-center gap-3 rounded-t-[14px] bg-popover px-4 py-3">
        <BrandMark size={26} />
        <p className="font-display text-sm font-bold">ClassLab</p>
        <div className="ml-3 flex flex-1 items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground">
          <Search className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Search communities, notes, people…</span>
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
          {["Command", "Timeline", "Communities", "Events", "Notes", "Marketplace", "Internships", "Clubs", "Messages", "Bookmarks", "Settings"].map((s, i) => (
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
                Good morning, Alex <span aria-hidden>👋</span>
              </p>
              <p className="text-xs text-muted-foreground">Let's make today productive.</p>
            </div>
            <div className="flex gap-1.5">
              {["Join Community", "Explore Events", "Browse Notes"].map((b) => (
                <span key={b} className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] text-muted-foreground">
                  {b}
                </span>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Quick Access</p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {quickAccess.map((q) => {
                const Icon = q.icon;
                return (
                  <div key={q.label} className="rounded-xl border border-border bg-background p-2.5 text-center">
                    <Icon className={`mx-auto h-4 w-4 ${q.tint}`} strokeWidth={1.75} />
                    <p className="mt-1.5 truncate text-[10px] text-muted-foreground">{q.label}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 lg:grid-cols-[1.4fr_1fr]">
            <div className="rounded-xl border border-border bg-background p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold">Today's Timeline</p>
                <span className="text-[10px] text-muted-foreground">View full timeline</span>
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
                <p className="text-xs font-semibold">Upcoming Events</p>
                <span className="text-[10px] text-muted-foreground">View all</span>
              </div>
              <div className="mt-2 space-y-1.5 text-[11px]">
                {[
                  { t: "HackOverflow 3.0", d: "Hackathon · 2 Aug", tint: "var(--chart-3)" },
                  { t: "Marketing Conclave", d: "Seminar · 5 Aug", tint: "var(--primary)" },
                  { t: "Music Night", d: "Cultural · 7 Aug", tint: "var(--chart-5)" },
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
