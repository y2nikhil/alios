import { Link, Outlet, useLocation } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  Library,
  CalendarDays,
  Brain,
  Sparkles,
  Target,
  Flame,
  MessageCircle,
  Trophy,
  Sitemap,
  Bell,
  Menu,
  X,
  Sun,
  Moon,
  LogIn,
  Shield,
  Crown,
  ListChecks,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useGuest } from "@/lib/guest";
import { useTheme } from "@/lib/theme";
import { AuxProvider } from "@/lib/aux-store";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useRole } from "@/lib/use-role";
import { ProfileMenu } from "@/components/ProfileMenu";
import { NotificationBell } from "@/components/NotificationBell";
import { Button } from "@/components/ui/button";

// ── nav configs ──────────────────────────────────────────────
const TOP_NAV = [
  { to: "/app", label: "Dashboard" },
  { to: "/app/rooms", label: "Study Rooms" },
  { to: "/app/resources", label: "Resources" },
  { to: "/app/schedule", label: "Schedule" },
  { to: "/app/mindmap", label: "Mind Map" },
  { to: "/app/tutor", label: "AI Tutor" },
] as const;

const SIDE_NAV = {
  Overview: [
    { to: "/app", label: "Dashboard", icon: LayoutDashboard },
    { to: "/app/focus", label: "Focus Mode", icon: Target },
    { to: "/app/tasks", label: "Tasks", icon: ListChecks },
    { to: "/app/streaks", label: "Streaks", icon: Flame },
  ],
  Community: [
    { to: "/app/rooms", label: "Study Rooms", icon: Users, liveBadge: true },
    { to: "/app/collaborate", label: "Hangout Feed", icon: MessageCircle },
    { to: "/app/leaderboard", label: "Leaderboard", icon: Trophy },
  ],
  Tools: [
    { to: "/app/tutor", label: "AI Tutor", icon: Brain },
    { to: "/app/mindmap", label: "Mind Map", icon: Sitemap },
    { to: "/app/resources", label: "Resources", icon: Library },
    { to: "/app/schedule", label: "Schedule", icon: CalendarDays },
  ],
} as const;

// ── pieces ────────────────────────────────────────────────────
function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2 group">
      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand shadow-sm">
        <Sparkles className="h-3.5 w-3.5 text-white" />
      </span>
      {!compact && <span className="text-sm font-semibold tracking-tight">ALIOS</span>}
    </Link>
  );
}

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent transition-colors"
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

function GuestPill() {
  const { guest } = useGuest();
  if (!guest) return null;
  return (
    <Link
      to="/login"
      className="hidden md:inline-flex items-center gap-1.5 rounded-full border-soft px-2.5 py-1 text-[11px] text-muted-foreground hover:text-foreground"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
      Guest · sign in
    </Link>
  );
}

function Avatar() {
  const { user } = useAuth();
  const { guest } = useGuest();
  if (user) return <ProfileMenu />;
  const name = guest?.display_name ?? "G";
  return (
    <Link
      to="/login"
      className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-soft text-[10px] font-semibold text-brand-ink"
      title="Sign in"
    >
      {name.slice(0, 2).toUpperCase()}
    </Link>
  );
}

function SideItem({
  to,
  label,
  icon: Icon,
  active,
  badge,
  onClick,
}: {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  active?: boolean;
  badge?: ReactNode;
  onClick?: () => void;
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] transition-colors",
        active ? "bg-brand-soft text-brand-ink font-medium" : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1 truncate">{label}</span>
      {badge}
    </Link>
  );
}

// ── shell ─────────────────────────────────────────────────────
function ShellInner() {
  const location = useLocation();
  const { user } = useAuth();
  const { isAdmin, isSuperAdmin } = useRole();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (to: string) =>
    to === "/app"
      ? location.pathname === "/app" || location.pathname === "/app/"
      : location.pathname.startsWith(to);

  const Sidebar = (
    <aside className="flex h-full w-[200px] shrink-0 flex-col border-r-[0.5px] border-border surface-2">
      <div className="flex flex-col gap-2 px-2 py-3 overflow-y-auto scrollbar-thin">
        {Object.entries(SIDE_NAV).map(([section, items]) => (
          <div key={section} className="flex flex-col gap-0.5">
            <p className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              {section}
            </p>
            {items.map((it) => (
              <SideItem
                key={it.to}
                to={it.to}
                label={it.label}
                icon={it.icon}
                active={isActive(it.to)}
                onClick={() => setMobileOpen(false)}
                badge={
                  "liveBadge" in it && it.liveBadge ? (
                    <span className="rounded-full bg-teal-soft px-1.5 py-0.5 text-[9px] font-medium text-teal-ink">live</span>
                  ) : undefined
                }
              />
            ))}
          </div>
        ))}

        {(isAdmin || isSuperAdmin) && (
          <div className="flex flex-col gap-0.5">
            <p className="px-2 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">Admin</p>
            {isAdmin && (
              <SideItem to="/app/admin" label="Admin" icon={Shield} active={isActive("/app/admin")} onClick={() => setMobileOpen(false)} />
            )}
            {isSuperAdmin && (
              <SideItem to="/app/super" label="Super" icon={Crown} active={isActive("/app/super")} onClick={() => setMobileOpen(false)} />
            )}
          </div>
        )}
      </div>

      {!user && (
        <div className="mt-auto m-2 rounded-lg bg-brand-soft px-3 py-2.5">
          <p className="text-[11px] font-semibold text-brand-ink">You're in guest mode</p>
          <p className="text-[10px] text-brand-ink/70 mt-0.5 mb-2">Sign in to join study rooms and watch parties.</p>
          <Link to="/login">
            <Button size="sm" className="h-7 w-full bg-brand text-primary-foreground hover:opacity-90 text-[11px]">
              <LogIn className="h-3 w-3 mr-1" />Sign in
            </Button>
          </Link>
        </div>
      )}
    </aside>
  );

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden">
      {/* TOP NAV */}
      <header className="flex h-11 shrink-0 items-center gap-2 border-b-[0.5px] border-border surface-2 px-3 lg:px-4">
        <button onClick={() => setMobileOpen((o) => !o)} className="lg:hidden p-1 -ml-1 rounded-md hover:bg-accent">
          {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
        <Logo />
        <nav className="hidden md:flex items-center gap-0.5 ml-4">
          {TOP_NAV.map((it) => (
            <Link
              key={it.to}
              to={it.to}
              className={cn(
                "px-2.5 py-1 rounded-md text-[12px] transition-colors",
                isActive(it.to)
                  ? "bg-surface-3 text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {it.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <GuestPill />
          <ThemeToggle />
          {user ? <NotificationBell /> : (
            <Link to="/login" aria-label="Sign in" className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent">
              <Bell className="h-4 w-4 text-muted-foreground" />
            </Link>
          )}
          <Avatar />
        </div>
      </header>

      {/* BODY: sidebar + main */}
      <div className="flex flex-1 overflow-hidden">
        {/* desktop sidebar */}
        <div className="hidden lg:flex">{Sidebar}</div>

        {/* mobile sidebar drawer */}
        {mobileOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-foreground/30" onClick={() => setMobileOpen(false)} />
            <div className="absolute left-0 top-11 bottom-0 w-[220px] bg-background border-r-[0.5px] border-border">{Sidebar}</div>
          </div>
        )}

        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function AppShell() {
  const { user } = useAuth();
  // AuxProvider only mounts for real authed users (it queries DB)
  if (user) {
    return (
      <AuxProvider>
        <ShellInner />
      </AuxProvider>
    );
  }
  return <ShellInner />;
}
