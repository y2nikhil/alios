import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles, Activity, Brain, Zap, Users, ShieldCheck, ArrowRight, Check } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import landingHero from "@/assets/landing-hero.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ALIOS — The All-In-One Productivity & Management OS" },
      {
        name: "description",
        content: "Track your day in real-time, capture ideas on infinite mind maps, and unlock AI-powered focus insights. The premium operating system for your work.",
      },
      { property: "og:title", content: "ALIOS — AI Life Operating System" },
      { property: "og:description", content: "Track your day, focus deeper, and lead your team — all in one premium productivity OS." },
      { property: "og:image", content: "/src/assets/landing-hero.jpg" },
      { property: "twitter:image", content: "/src/assets/landing-hero.jpg" },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Auto-redirect signed-in users to the app
  useEffect(() => {
    if (!loading && user) {
      navigate({ to: "/app" });
    }
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Cosmic background glows */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-violet-500/20 blur-[120px]" />
        <div className="absolute top-40 -right-40 h-[600px] w-[600px] rounded-full bg-cyan-400/15 blur-[140px]" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[400px] w-[800px] rounded-full bg-fuchsia-500/10 blur-[120px]" />
      </div>

      {/* Top nav */}
      <header className="relative z-10 flex items-center justify-between px-4 sm:px-8 lg:px-12 py-5">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400 shadow-lg shadow-violet-500/30">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-base font-bold tracking-tight">ALIOS</p>
            <p className="text-[10px] text-muted-foreground -mt-0.5">AI Life OS</p>
          </div>
        </Link>

        {/* Top-right CTAs */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Link to="/login">
            <Button variant="ghost" size="sm" className="text-foreground/80 hover:text-foreground">
              Sign in
            </Button>
          </Link>
          <Link to="/signup">
            <Button
              size="sm"
              className="bg-gradient-to-r from-violet-500 to-cyan-400 text-white hover:opacity-90 shadow-lg shadow-violet-500/30"
            >
              Get started
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 px-4 sm:px-8 lg:px-12 pt-8 pb-20 lg:pt-16 lg:pb-32">
        <div className="mx-auto max-w-7xl grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-muted-foreground backdrop-blur-md">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              v1 — Now in early access
            </div>
            <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05]">
              The All-In-One{" "}
              <span className="text-gradient">Productivity & Management</span>{" "}
              App
            </h1>
            <p className="mt-6 text-base lg:text-lg text-muted-foreground max-w-xl leading-relaxed">
              Track your day in real-time, see where your hours actually go, and capture every idea on
              an infinite mind map — all in one premium operating system designed for serious work.
            </p>

            <ul className="mt-8 space-y-3">
              {[
                "Real-time AUX status tracking with live timers",
                "Infinite mind map for ideas, tasks, and links",
                "AI-powered focus insights & pattern detection",
                "Team-ready: schedules, adherence & live monitoring",
              ].map((f) => (
                <li key={f} className="flex items-center gap-3 text-sm">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/20 to-cyan-400/20 border border-violet-500/30">
                    <Check className="h-3 w-3 text-violet-300" />
                  </div>
                  <span className="text-foreground/85">{f}</span>
                </li>
              ))}
            </ul>

            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Link to="/signup">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-violet-500 to-cyan-400 text-white hover:opacity-90 shadow-xl shadow-violet-500/30 px-6"
                >
                  Start free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline" className="bg-white/5 border-white/10 hover:bg-white/10">
                  I already have an account
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Hero image */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.15, ease: "easeOut" }}
            className="relative"
          >
            <div className="absolute -inset-8 bg-gradient-to-br from-violet-500/20 to-cyan-400/20 blur-3xl rounded-full" />
            <img
              src={landingHero}
              alt="ALIOS dashboard preview with mind map, analytics, and focus tracking"
              width={1024}
              height={1024}
              className="relative rounded-3xl border border-white/10 shadow-2xl shadow-violet-500/20"
            />
          </motion.div>
        </div>
      </section>

      {/* Features grid */}
      <section className="relative z-10 px-4 sm:px-8 lg:px-12 py-16 lg:py-24 border-t border-white/5">
        <div className="mx-auto max-w-7xl">
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Built for serious work</p>
            <h2 className="mt-3 text-3xl lg:text-4xl font-bold tracking-tight">
              Everything you need. Nothing you don't.
            </h2>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Activity,
                title: "Real-time tracking",
                desc: "Punch in and out of statuses in milliseconds. Live timers down to the second.",
                grad: "from-violet-500 to-fuchsia-500",
              },
              {
                icon: Brain,
                title: "Infinite mind map",
                desc: "Capture text, images, links, and tasks. Drag to connect, paste to create.",
                grad: "from-cyan-500 to-blue-500",
              },
              {
                icon: Zap,
                title: "AI insights",
                desc: "Spot focus patterns, get personalized recommendations powered by Gemini.",
                grad: "from-amber-500 to-orange-500",
              },
              {
                icon: ShieldCheck,
                title: "Schedule adherence",
                desc: "Score from 0-100 measuring how well you follow your defined workday.",
                grad: "from-emerald-500 to-teal-500",
              },
              {
                icon: Users,
                title: "Team-ready",
                desc: "Admins assign tasks, define schedules, and monitor performance live.",
                grad: "from-fuchsia-500 to-pink-500",
              },
              {
                icon: Sparkles,
                title: "Premium dark UI",
                desc: "Glassmorphic, smooth, and built to delight. Every pixel intentional.",
                grad: "from-violet-500 to-cyan-400",
              },
            ].map((f) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.5 }}
                  className="glass rounded-2xl p-6 hover:bg-white/[0.05] transition-colors"
                >
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${f.grad} shadow-lg`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative z-10 px-4 sm:px-8 lg:px-12 py-20 lg:py-28">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl lg:text-5xl font-bold tracking-tight">
            Ready to <span className="text-gradient">own your time</span>?
          </h2>
          <p className="mt-5 text-base lg:text-lg text-muted-foreground max-w-xl mx-auto">
            Free to start. Set up in under a minute. No credit card required.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link to="/signup">
              <Button
                size="lg"
                className="bg-gradient-to-r from-violet-500 to-cyan-400 text-white hover:opacity-90 shadow-xl shadow-violet-500/30 px-8"
              >
                Get started — it's free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 px-4 sm:px-8 lg:px-12 py-8">
        <div className="mx-auto max-w-7xl flex flex-wrap items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-violet-500 to-cyan-400">
              <Sparkles className="h-3 w-3 text-white" />
            </div>
            <span>© {new Date().getFullYear()} ALIOS — AI Life Operating System</span>
          </div>
          <div className="flex gap-5">
            <Link to="/login" className="hover:text-foreground">Sign in</Link>
            <Link to="/signup" className="hover:text-foreground">Sign up</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
