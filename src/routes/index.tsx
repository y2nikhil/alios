import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Sparkles, ArrowRight, Brain, Users, Library, CalendarDays, Target, Trophy,
  Zap, Play, BookOpen,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useGuest } from "@/lib/guest";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ALIOS — The student OS for focus, friends, and finals" },
      { name: "description", content: "Study together, plan smarter, focus deeper. Live study rooms, AI tutor, mind maps, shared resources. Skip the sign-in and start now." },
      { property: "og:title", content: "ALIOS — Student OS" },
      { property: "og:description", content: "Live study rooms, AI tutor, mind maps. Start as a guest in one tap." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();
  const { guest, startGuest } = useGuest();
  const navigate = useNavigate();
  const [name, setName] = useState("");

  useEffect(() => {
    if (!loading && (user || guest)) {
      navigate({ to: "/app" });
    }
  }, [loading, user, guest, navigate]);

  const enterAsGuest = () => {
    startGuest(name);
    navigate({ to: "/app" });
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* soft brand glows */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-32 h-[480px] w-[480px] rounded-full bg-brand-soft blur-3xl opacity-70" />
        <div className="absolute top-20 right-0 h-[420px] w-[420px] rounded-full bg-teal-soft blur-3xl opacity-50" />
      </div>

      {/* nav */}
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand">
            <Sparkles className="h-4 w-4 text-white" />
          </span>
          <span className="text-base font-semibold tracking-tight">ALIOS</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link to="/login">
            <Button variant="ghost" size="sm">Sign in</Button>
          </Link>
          <Link to="/signup">
            <Button size="sm" className="bg-brand text-primary-foreground hover:opacity-90">Create account</Button>
          </Link>
        </div>
      </header>

      {/* hero */}
      <section className="relative z-10 mx-auto grid max-w-6xl gap-12 px-5 pt-8 pb-20 lg:grid-cols-2 lg:gap-16 lg:pt-16">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-[11px] font-medium text-brand-ink">
            <span className="h-1.5 w-1.5 rounded-full bg-brand" />
            Built for students · live study rooms today
          </span>
          <h1 className="mt-5 text-4xl font-bold tracking-tight leading-[1.05] sm:text-5xl lg:text-6xl">
            Study together.<br />
            <span className="text-gradient">Focus deeper.</span>
          </h1>
          <p className="mt-5 max-w-lg text-base text-muted-foreground leading-relaxed">
            Drop into a live study room with friends. Plan your week with an AI tutor.
            Build a mind map for tomorrow's exam. ALIOS is the calm command center for your study life.
          </p>

          {/* GUEST entry */}
          <div className="mt-7 card-flat p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Start in seconds — no sign-up</p>
            <div className="mt-3 flex flex-col sm:flex-row gap-2">
              <Input
                placeholder="What should we call you? (optional)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") enterAsGuest(); }}
                className="flex-1 h-10"
              />
              <Button onClick={enterAsGuest} className="h-10 bg-brand text-primary-foreground hover:opacity-90 px-5">
                <Play className="h-4 w-4 mr-1.5" />Continue as guest
              </Button>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Your tasks, mind maps, and focus sessions stay on this device. Sign in any time to sync and join group activities.
            </p>
          </div>

          <div className="mt-4 flex items-center gap-3 text-sm">
            <Link to="/signup" className="text-brand hover:underline font-medium">Create a full account</Link>
            <span className="text-muted-foreground">·</span>
            <Link to="/login" className="text-muted-foreground hover:text-foreground">I already have one</Link>
          </div>
        </motion.div>

        {/* feature grid */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-2 gap-3">
          {[
            { icon: Users, label: "Live study rooms", desc: "Join friends mid-session.", tag: "31 live", tone: "tag-teal" },
            { icon: Target, label: "Focus mode", desc: "Pomodoro with ambient sound.", tag: "deep work", tone: "tag-brand" },
            { icon: Brain, label: "AI tutor", desc: "Explain anything. Quiz me.", tag: "Gemini", tone: "tag-blue" },
            { icon: Library, label: "Resources", desc: "Notes, PDFs, flashcards.", tag: "shared", tone: "tag-amber" },
            { icon: CalendarDays, label: "Smart schedule", desc: "Auto-plan revision.", tag: "AI plan", tone: "tag-coral" },
            { icon: Trophy, label: "Streaks & leaderboards", desc: "Stay motivated.", tag: "weekly", tone: "tag-brand" },
          ].map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.label} className="card-flat p-4 hover:bg-surface-2 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-soft">
                    <Icon className="h-4 w-4 text-brand" />
                  </div>
                  <span className={`tag ${f.tone}`}>{f.tag}</span>
                </div>
                <p className="mt-3 text-sm font-semibold">{f.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{f.desc}</p>
              </div>
            );
          })}
        </motion.div>
      </section>

      {/* social strip */}
      <section className="relative z-10 mx-auto max-w-6xl px-5 pb-20">
        <div className="card-flat p-6 lg:p-8 flex flex-col lg:flex-row items-center justify-between gap-5 bg-brand-soft border-0">
          <div>
            <p className="text-sm font-semibold text-brand-ink flex items-center gap-2">
              <Zap className="h-4 w-4" /> Group study, mind map jams, watch parties
            </p>
            <p className="text-xs text-brand-ink/80 mt-1">Pull a friend into a live mind map session, share your screen, watch a lecture together.</p>
          </div>
          <Link to="/signup">
            <Button className="bg-brand text-primary-foreground hover:opacity-90">
              <BookOpen className="h-4 w-4 mr-1.5" />Get the full thing — free
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          </Link>
        </div>
      </section>

      <footer className="relative z-10 mx-auto max-w-6xl border-t-[0.5px] border-border px-5 py-6 text-xs text-muted-foreground flex items-center justify-between">
        <span>© {new Date().getFullYear()} ALIOS</span>
        <div className="flex gap-4">
          <Link to="/login" className="hover:text-foreground">Sign in</Link>
          <Link to="/signup" className="hover:text-foreground">Sign up</Link>
        </div>
      </footer>
    </div>
  );
}
