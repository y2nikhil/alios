import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";

/**
 * Public pages (blog, feed, post, profile, search) render standalone for visitors,
 * but signed-in users keep the full app chrome — sidebar, search, section tabs —
 * so they never feel logged out while browsing.
 */
export function PublicShell({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading || !user) return <>{children}</>;
  return (
    <AppShell hideFooter>
      <div className="min-h-full">{children}</div>
    </AppShell>
  );
}
