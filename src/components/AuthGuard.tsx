import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { useGuest } from "@/lib/guest";
import { Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Allows authenticated users OR guest mode users. Solo work — no sign-in needed. */
export function AuthGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const { guest } = useGuest();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user && !guest) {
      navigate({ to: "/" });
    }
  }, [user, loading, guest, navigate]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!user && !guest) return null;
  return <>{children}</>;
}

/** Hard gate: real Supabase session required (group activities, watch parties, study rooms). */
export function RequireSignedIn({ children, feature = "this feature" }: { children: ReactNode; feature?: string }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="max-w-md text-center card-flat p-8">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft">
            <Lock className="h-5 w-5 text-brand" />
          </div>
          <h2 className="mt-4 text-xl font-semibold">Sign in to continue</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            You're using ALIOS as a guest. Sign in to use {feature} with other people — your local progress will stay safe.
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <Link to="/signup"><Button className="bg-brand text-primary-foreground hover:opacity-90">Create account</Button></Link>
            <Link to="/login"><Button variant="outline">Sign in</Button></Link>
          </div>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
