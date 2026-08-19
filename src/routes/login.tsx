import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, Loader2, Apple } from "lucide-react";
import { toast } from "sonner";

function safeNext(next: string | undefined) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : null;
}

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>): { next?: string } =>
    typeof s["next"] === "string" ? { next: s["next"] } : {},

  head: () => ({
    meta: [
      { title: "Sign in — ClassLab" },
      { name: "description", content: "Sign in to your ClassLab productivity workspace." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { next } = Route.useSearch();
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



  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    let email = identifier.trim();
    if (!email.includes("@")) {
      const { data, error } = await supabase.rpc("email_for_username", { _username: email });
      if (error || !data) {
        setLoading(false);
        return toast.error("No account with that username.");
      }
      email = data as string;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back");
    afterAuth();
  };

  const signInWithApple = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("apple", {
      redirect_uri: oauthRedirect,
    });
    if (result.error) {
      setLoading(false);
      return toast.error(result.error.message ?? "Apple sign-in failed");
    }
    if (result.redirected) return;
    setLoading(false);
    toast.success("Welcome back");
    afterAuth();
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: oauthRedirect,
    });
    if (result.error) {
      setLoading(false);
      return toast.error(result.error.message ?? "Google sign-in failed");
    }
    if (result.redirected) return;
    setLoading(false);
    toast.success("Welcome back");
    afterAuth();
  };


  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 shadow-lg shadow-violet-500/30">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-gradient">Sign in to ClassLab</h1>
          <p className="mt-1 text-sm text-muted-foreground">Your personal life operating system</p>
        </div>

        <div className="glass rounded-2xl p-6 sm:p-8">
          <h2 className="text-xl font-semibold">Sign in</h2>

          <form onSubmit={onSubmit} className="mt-5 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="identifier">Username or email</Label>
              <Input id="identifier" required value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="alex_codes or you@example.com" autoCapitalize="none" autoCorrect="off" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-violet-500 to-cyan-400 text-white hover:opacity-90">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
            </Button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="space-y-2">
            <Button type="button" variant="outline" onClick={signInWithGoogle} disabled={loading} className="w-full gap-2">
              <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M23.5 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.55-5.17 3.55-8.87Z" />
                <path fill="#34A853" d="M12 24c3.24 0 5.96-1.08 7.95-2.91l-3.88-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.28v3.09A12 12 0 0 0 12 24Z" />
                <path fill="#FBBC05" d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58V6.62H1.28a12 12 0 0 0 0 10.76l3.99-3.09Z" />
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.18 15.24 0 12 0A12 12 0 0 0 1.28 6.62l3.99 3.09C6.22 6.86 8.87 4.75 12 4.75Z" />
              </svg>
              Continue with Google
            </Button>
            <Button type="button" variant="outline" onClick={signInWithApple} disabled={loading} className="w-full gap-2">
              <Apple className="h-4 w-4" /> Continue with Apple
            </Button>
          </div>




          <p className="mt-6 text-center text-sm text-muted-foreground">
            New here?{" "}
            <Link to="/signup" className="text-foreground font-medium hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

