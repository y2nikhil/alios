import type { ReactNode } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { Home, LayoutList, Tv, MessageSquare, Newspaper, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { BrandLogo } from "@/components/BrandLogo";
import { cn } from "@/lib/utils";

const GUEST_TABS = [
  { to: "/", label: "Home", icon: Home },
  { to: "/feed", label: "Feed", icon: LayoutList },
  { to: "/watch-party", label: "Watch Party", icon: Tv },
  { to: "/student-chat", label: "Chat", icon: MessageSquare },
  { to: "/blog", label: "Blog", icon: Newspaper },
] as const;

function GuestChrome({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const active = (to: string) =>
    to === "/" ? pathname === "/" : pathname === to || pathname.startsWith(`${to}/`);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-background/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1600px] items-center gap-3 px-4 py-3 lg:px-8">
          <Link to="/" className="shrink-0">
            <BrandLogo />
          </Link>
          <Link
            to="/search"
            className="ml-auto hidden min-w-0 flex-1 max-w-md rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-muted-foreground hover:bg-white/[0.08] sm:block"
          >
            Search ClassLab…
          </Link>
          <Link
            to="/login"
            className="ml-auto rounded-full px-3 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground sm:ml-0"
          >
            Log in
          </Link>
          <Link
            to="/signup"
            className="rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-2 text-sm font-semibold text-black"
          >
            Sign up free
          </Link>
        </div>

        {/* Section tabs — same structure signed-in users get */}
        <nav className="border-t border-white/5">
          <div className="mx-auto flex w-full max-w-[1600px] items-center gap-2 overflow-x-auto px-2 py-1.5 lg:px-8 lg:py-2">
            {GUEST_TABS.map((t) => {
              const Icon = t.icon;
              const on = active(t.to);
              return (
                <Link
                  key={t.to}
                  to={t.to}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition lg:text-sm",
                    on ? "bg-amber-400/15 text-amber-200" : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {t.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </header>

      {children}

      {/* Persistent nudge to unlock the rest of the app */}
      <div className="sticky bottom-0 z-30 border-t border-white/10 bg-background/90 px-4 py-2.5 backdrop-blur lg:px-8">
        <div className="mx-auto flex w-full max-w-[1600px] flex-wrap items-center gap-3">
          <Sparkles className="h-4 w-4 shrink-0 text-amber-300" />
          <p className="min-w-0 flex-1 text-xs text-muted-foreground sm:text-sm">
            You're seeing the public view. Sign up free to unlock focus tracking, study groups, watch parties, mind maps and the AI study assistant.
          </p>
          <Link
            to="/signup"
            className="shrink-0 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-1.5 text-xs font-semibold text-black sm:text-sm"
          >
            Use full ClassLab
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * Public pages (blog, feed, post, profile, search) keep the full app chrome for
 * signed-in users, and give visitors a matching guest header + section tabs so
 * they see the same ClassLab experience with an invitation to join.
 */
export function PublicShell({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <>{children}</>;
  if (!user) return <GuestChrome>{children}</GuestChrome>;
  return (
    <AppShell hideFooter>
      <div className="min-h-full">{children}</div>
    </AppShell>
  );
}
