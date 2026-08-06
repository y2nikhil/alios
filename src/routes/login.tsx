import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, Loader2, Phone, KeyRound, Apple } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
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
  const [mode, setMode] = useState<"password" | "phone">("password");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // phone OTP state
  const [phone, setPhone] = useState("+91");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);

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
    navigate({ to: "/app" });
  };

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const p = phone.replace(/\s/g, "");
    if (!/^\+[1-9]\d{7,14}$/.test(p)) return toast.error("Enter your number in international format, e.g. +919876543210");
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ phone: p });
    setLoading(false);
    if (error) return toast.error(error.message);
    setOtpSent(true);
    toast.success("Code sent — check your messages");
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      phone: phone.replace(/\s/g, ""),
      token: otp.trim(),
      type: "sms",
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back");
    navigate({ to: "/app" });
  };

  const signInWithApple = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("apple", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setLoading(false);
      return toast.error(result.error.message ?? "Apple sign-in failed");
    }
    if (result.redirected) return;
    setLoading(false);
    toast.success("Welcome back");
    navigate({ to: "/app" });
  };



  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 shadow-lg shadow-violet-500/30">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-gradient">ClassLab</h1>
          <p className="mt-1 text-sm text-muted-foreground">Your personal life operating system</p>
        </div>

        <div className="glass rounded-2xl p-6 sm:p-8">
          <h2 className="text-xl font-semibold">Sign in</h2>

          <div className="mt-4 grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
            <button
              type="button"
              onClick={() => setMode("password")}
              className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${mode === "password" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <KeyRound className="h-3.5 w-3.5" /> Password
            </button>
            <button
              type="button"
              onClick={() => setMode("phone")}
              className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${mode === "phone" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Phone className="h-3.5 w-3.5" /> Phone OTP
            </button>
          </div>

          {mode === "password" ? (
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
          ) : !otpSent ? (
            <form onSubmit={sendOtp} className="mt-5 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="phone">Mobile number</Label>
                <Input id="phone" type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+919876543210" />
                <p className="text-[11px] text-muted-foreground">Include your country code. New numbers create an account automatically.</p>
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-violet-500 to-cyan-400 text-white hover:opacity-90">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send code"}
              </Button>
            </form>
          ) : (
            <form onSubmit={verifyOtp} className="mt-5 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="otp">Enter the 6-digit code</Label>
                <Input id="otp" inputMode="numeric" required maxLength={8} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} placeholder="123456" />
                <p className="text-[11px] text-muted-foreground">Sent to {phone}</p>
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-violet-500 to-cyan-400 text-white hover:opacity-90">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify & sign in"}
              </Button>
              <button type="button" onClick={() => { setOtpSent(false); setOtp(""); }} className="w-full text-center text-xs text-muted-foreground hover:text-foreground">
                Use a different number
              </button>
            </form>
          )}

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

