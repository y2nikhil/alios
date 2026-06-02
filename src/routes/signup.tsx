import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, Loader2, Check, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create account — ALIOS" },
      { name: "description", content: "Create your ALIOS account and start tracking your day." },
    ],
  }),
  component: SignupPage,
});

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

function SignupPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
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

  const onSubmit = async (e: React.FormEvent) => {
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
    // Try to persist username on profile (handle_new_user may already pull it from metadata, but ensure it lands)
    if (signed.user) {
      await supabase.from("profiles").upsert({ id: signed.user.id, display_name: name, username: u });
    }
    setLoading(false);
    toast.success("Account created");
    navigate({ to: "/app" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 shadow-lg shadow-violet-500/30">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-gradient">ALIOS</h1>
          <p className="mt-1 text-sm text-muted-foreground">Your personal life operating system</p>
        </div>

        <div className="glass rounded-2xl p-6 sm:p-8">
          <h2 className="text-xl font-semibold">Create account</h2>
          <p className="text-sm text-muted-foreground mt-1">Pick a unique username — you'll sign in with it.</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
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
                  {!checking && (available === false || (username && !usernameValid)) && <X className="h-4 w-4 text-rose-400" />}
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">3-20 chars · lowercase, numbers, underscore</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-violet-500 to-cyan-400 text-white hover:opacity-90">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create account"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="text-foreground font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
