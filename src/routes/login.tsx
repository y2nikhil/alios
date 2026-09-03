import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { signInWithUsername } from "@/lib/auth/login.functions";

import { lovable } from "@/integrations/lovable/index";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Apple, Check, X, Flame, Users, Trophy } from "lucide-react";
import { toast } from "sonner";

function safeNext(next: string | undefined) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : null;
}

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>): { next?: string; mode?: string } => ({
    ...(typeof s["next"] === "string" ? { next: s["next"] } : {}),
    ...(s["mode"] === "signup" ? { mode: "signup" } : {}),
  }),

  head: () => ({
    meta: [
      { title: "Sign in or join — ClassLab" },
      { name: "description", content: "Sign in to ClassLab or create a free account — study rooms, focus tracking, notes and exam communities." },
      { property: "og:title", content: "Sign in or join — ClassLab" },
      { property: "og:description", content: "One page to sign in or create your free ClassLab account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Sign in or join — ClassLab" },
      { name: "twitter:description", content: "One page to sign in or create your free ClassLab account." },
    ],
  }),
  component: LoginPage,
});

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

const PERKS = [
  { icon: Flame, text: "Track focus hours & keep your streak alive" },
  { icon: Users, text: "Join exam communities and live study rooms" },
  { icon: Trophy, text: "Climb the leaderboard with real study time" },
];

function LoginPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { next, mode } = Route.useSearch();

  const [tab, setTab] = useState<"signin" | "signup">(mode === "signup" ? "signup" : "signin");

  useEffect(() => {
    if (!authLoading && user) navigate({ to: "/app" });
  }, [user, authLoading, navigate]);

  const nextPath = safeNext(next);
  const afterAuth = () => {
    if (nextPath) {
      window.location.href = nextPath;
      return;
    }
    navigate({ to: "/app" });
  };
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const oauthRedirect = nextPath ? `${origin}${nextPath}` : origin;

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // signup fields
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [available, setAvailable] = useState<null | boolean>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    setAvailable(null);
    const u = username.trim().toLowerCase();
    if (!USERNAME_RE.test(u)) return;
    setChecking(true);
    const t = setTimeout(async () => {
      const { data } = await supabase.rpc("username_available", { _username: u });
      setAvailable(!!data);
      setChecking(false);
    }, 300);
    return () => clearTimeout(t);
  }, [username]);

  const usernameValid = USERNAME_RE.test(username.trim().toLowerCase());

  const onSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const mail = identifier.trim();
    if (!mail.includes("@")) {
      // Username sign-in is resolved server-side so emails are never exposed.
      const res = await signInWithUsername({ data: { username: mail, password } });
      if (!res.ok) {
        setLoading(false);
        return toast.error(res.error);
      }
      const { error: sessErr } = await supabase.auth.setSession({
        access_token: res.access_token,
        refresh_token: res.refresh_token,
      });
      setLoading(false);
      if (sessErr) return toast.error(sessErr.message);
      toast.success("Welcome back");
      return afterAuth();
    }
    const { error } = await supabase.auth.signInWithPassword({ email: mail, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back");
    afterAuth();
  };


  const onSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameValid) return toast.error("Username must be 3-20 chars: a-z, 0-9, _");
    if (available === false) return toast.error("That username is taken.");
    setLoading(true);
    const u = username.trim().toLowerCase();
    const { data: signed, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: name, username: u },
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) { setLoading(false); return toast.error(error.message); }
    if (signed.user) {
      await supabase.from("profiles").upsert({ id: signed.user.id, display_name: name, username: u });
    }
    setLoading(false);
    toast.success("Account created");
    afterAuth();
  };

  const oauth = async (provider: "google" | "apple") => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: oauthRedirect });
    if (result.error) {
      setLoading(false);
      return toast.error(result.error.message ?? "Sign-in failed");
    }
    if (result.redirected) return;
    setLoading(false);
    toast.success("Welcome back");
    afterAuth();
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* funky glows */}
      <div aria-hidden className="pointer-events-none absolute -top-40 -left-32 h-[26rem] w-[26rem] rounded-full bg-primary/20 blur-[120px]" />
      <div aria-hidden className="pointer-events-none absolute -bottom-48 -right-24 h-[30rem] w-[30rem] rounded-full bg-primary/10 blur-[140px]" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(to right, var(--foreground) 1px, transparent 1px), linear-gradient(to bottom, var(--foreground) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse at 50% 0%, black 30%, transparent 75%)",
        }}
      />

      <div className="relative mx-auto grid min-h-screen w-full max-w-5xl items-center gap-10 px-4 py-12 lg:grid-cols-[1fr_minmax(0,420px)]">
        {/* Left pitch */}
        <div className="hidden lg:block">
          <BrandLogo size={44} />
          <h1 className="mt-8 font-display text-4xl font-extrabold leading-[1.1] tracking-tight">
            Study together.
            <br />
            <span className="bg-gradient-to-r from-primary via-amber-300 to-primary bg-clip-text text-transparent">Stay accountable.</span>
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
            One account for focus tracking, live study rooms, notes, exam communities and everything else on the digital campus.
          </p>
          <ul className="mt-8 space-y-3">
            {PERKS.map((p) => (
              <li key={p.text} className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="grid h-9 w-9 place-items-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
                  <p.icon className="h-4 w-4" />
                </span>
                {p.text}
              </li>
            ))}
          </ul>
        </div>

        {/* Card */}
        <div className="w-full">
          <div className="mb-6 flex justify-center lg:hidden">
            <BrandLogo size={40} />
          </div>

          <div className="rounded-3xl border border-primary/20 bg-card/80 p-6 shadow-[0_24px_60px_-24px_rgba(240,199,94,0.35)] backdrop-blur sm:p-8">
            <div className="grid grid-cols-2 gap-1 rounded-full border border-border bg-secondary p-1">
              {(["signin", "signup"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    tab === t ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t === "signin" ? "Sign in" : "Create account"}
                </button>
              ))}
            </div>

            <h2 className="mt-6 font-display text-2xl font-bold tracking-tight">
              {tab === "signin" ? "Welcome back" : "Join ClassLab — free"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {tab === "signin" ? "Pick up right where you left off." : "Pick a unique username — you'll sign in with it."}
            </p>

            {tab === "signin" ? (
              <form onSubmit={onSignIn} className="mt-6 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="identifier">Username or email</Label>
                  <Input id="identifier" required value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="alex_codes or you@example.com" autoCapitalize="none" autoCorrect="off" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button type="submit" disabled={loading} className="w-full rounded-full font-semibold">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  New here?{" "}
                  <button type="button" onClick={() => setTab("signup")} className="font-medium text-primary hover:underline">
                    Create an account
                  </button>
                </p>
              </form>
            ) : (
              <form onSubmit={onSignUp} className="mt-6 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Display name</Label>
                  <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="username">Username</Label>
                  <div className="relative">
                    <Input
                      id="username"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase())}
                      placeholder="alex_codes"
                      className="pr-10"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {checking && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                      {!checking && usernameValid && available === true && <Check className="h-4 w-4 text-emerald-400" />}
                      {!checking && (available === false || (username && !usernameValid)) && <X className="h-4 w-4 text-destructive" />}
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground">3-20 chars · lowercase, numbers, underscore</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-password">Password</Label>
                  <Input id="new-password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button type="submit" disabled={loading} className="w-full rounded-full font-semibold">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create free account"}
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <button type="button" onClick={() => setTab("signin")} className="font-medium text-primary hover:underline">
                    Sign in
                  </button>
                </p>
              </form>
            )}

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">or continue with</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <Button type="button" variant="outline" onClick={() => oauth("google")} disabled={loading} className="w-full gap-2 rounded-full">
                <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M23.5 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.55-5.17 3.55-8.87Z" />
                  <path fill="#34A853" d="M12 24c3.24 0 5.96-1.08 7.95-2.91l-3.88-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.28v3.09A12 12 0 0 0 12 24Z" />
                  <path fill="#FBBC05" d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58V6.62H1.28a12 12 0 0 0 0 10.76l3.99-3.09Z" />
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.18 15.24 0 12 0A12 12 0 0 0 1.28 6.62l3.99 3.09C6.22 6.86 8.87 4.75 12 4.75Z" />
                </svg>
                Google
              </Button>
              <Button type="button" variant="outline" onClick={() => oauth("apple")} disabled={loading} className="w-full gap-2 rounded-full">
                <Apple className="h-4 w-4" /> Apple
              </Button>
            </div>
          </div>

          <p className="mt-4 text-center text-[11px] text-muted-foreground">
            Free forever · No card needed · 50,000+ students studying together
          </p>
        </div>
      </div>
    </div>
  );
}
