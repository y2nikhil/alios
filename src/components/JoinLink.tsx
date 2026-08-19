import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth";

/**
 * Signup CTA that stays useful for signed-in users: instead of pushing them
 * back to the account flow (which feels like being logged out), it opens the app.
 */
export function JoinLink({ children, className }: { children: ReactNode; className?: string }) {
  const { user } = useAuth();
  return (
    <Link to={user ? "/app" : "/login"} className={className}>
      {children}
    </Link>
  );
}

/** Renders children only when the visitor is signed out. */
export function SignedOutOnly({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading || user) return null;
  return <>{children}</>;
}

/** Renders children only when the visitor is signed in. */
export function SignedInOnly({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return null;
  return <>{children}</>;
}
