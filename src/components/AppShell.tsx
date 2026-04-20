import { Link, Outlet, useLocation } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Activity,
  BarChart3,
  Brain,
  Settings,
  Sparkles,
  Shield,
  Crown,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { AuxProvider, useAux } from "@/lib/aux-store";
import { useEffect, useState } from "react";
import { formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useRole } from "@/lib/use-role";
import { ProfileMenu } from "@/components/ProfileMenu";

const BASE_NAV = [
  { to: "/app", label: "Command", icon: LayoutDashboard },
  { to: "/app/timeline", label: "Timeline", icon: Activity },
  { to: "/app/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/app/mindmap", label: "Mind Map", icon: Brain },
  { to: "/app/settings", label: "Settings", icon: Settings },
] as const;

function LiveTimer() {
  const { activeSession, activeStatus } = useAux();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);
  if (!activeSession || !activeStatus) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="h-2 w-2 rounded-full bg-muted-foreground" />
        No active status
      </div>
    );
  }
  const elapsed = Math.floor((now - new Date(activeSession.started_at).getTime()) / 1000);
  return (
    <div className="flex items-center gap-3">
      <span
        className="h-2.5 w-2.5 rounded-full animate-pulse-glow"
        style={{ backgroundColor: activeStatus.color, color: activeStatus.color }}
      />
      <span className="text-sm font-medium text-foreground">{activeStatus.name}</span>
      <span className="font-mono text-sm tabular-nums text-muted-foreground">
        {formatDuration(elapsed)}
      </span>
    </div>
  );
}

function SidebarAuxList() {
  const { statuses, activeSession, switchTo } = useAux();
  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin px-2 py-2 space-y-1">
      <p className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Punch Status
      </p>
      {statuses.map((s) => {
        const active = activeSession?.status_id === s.id;
        return (
          <button
            key={s.id}
            onClick={() => switchTo(s.id)}
            className={cn(
              "group w-full flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-all",
              "hover:bg-accent/40",
              active && "bg-accent/60 ring-1 ring-white/10",
            )}
          >
            <span
              className={cn("h-2.5 w-2.5 rounded-full shrink-0", active && "animate-pulse-glow")}
              style={{ backgroundColor: s.color, color: s.color }}
            />
            <span className="flex-1 text-left truncate text-foreground/90">{s.name}</span>
            {s.shortcut_key && (
              <kbd className="hidden md:inline-flex h-5 min-w-5 items-center justify-center rounded border border-white/10 bg-white/5 px-1 text-[10px] font-mono text-muted-foreground">
                {s.shortcut_key}
              </kbd>
            )}
          </button>
        );
      })}
    </div>
  );
}

function ShellInner() {
  const location = useLocation();
  const { user } = useAuth();
  const { isAdmin, isSuperAdmin } = useRole();

  const NAV = [
    ...BASE_NAV,
    ...(isAdmin ? [{ to: "/app/admin" as const, label: "Admin", icon: Shield }] : []),
    ...(isSuperAdmin ? [{ to: "/app/super" as const, label: "Super", icon: Crown }] : []),
  ];

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-white/5 bg-[oklch(0.13_0.02_265)]/80 backdrop-blur-xl">
        <div className="flex h-14 items-center gap-2 px-4 border-b border-white/5">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-cyan-400 shadow-lg shadow-violet-500/30">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold tracking-tight">ALIOS</p>
              <p className="text-[10px] text-muted-foreground -mt-0.5">AI Life OS</p>
            </div>
          </Link>
        </div>

        <nav className="px-2 py-3 space-y-0.5">
          {NAV.map((item) => {
            const active =
              item.to === "/app"
                ? location.pathname === "/app" || location.pathname === "/app/"
                : location.pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-accent/70 text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/30",
                )}
              >
                <Icon className={cn("h-4 w-4", item.label === "Super" && "text-amber-400")} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="h-px bg-white/5 mx-2" />
        <SidebarAuxList />

        <div className="border-t border-white/5 p-3">
          <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 flex items-center justify-between gap-4 border-b border-white/5 px-4 lg:px-6 bg-background/40 backdrop-blur-xl">
          <div className="lg:hidden flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-cyan-400">
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-bold">ALIOS</span>
          </div>
          <LiveTimer />
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
              <kbd className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono">1-9</kbd>
              <span>switch</span>
            </div>
            <ProfileMenu />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <Outlet />
          </motion.div>
        </main>

        {/* Mobile bottom nav */}
        <nav className="lg:hidden flex border-t border-white/5 bg-background/80 backdrop-blur-xl overflow-x-auto">
          {NAV.map((item) => {
            const active =
              item.to === "/app"
                ? location.pathname === "/app" || location.pathname === "/app/"
                : location.pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex-1 min-w-[72px] flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

export function AppShell() {
  return (
    <AuxProvider>
      <ShellInner />
    </AuxProvider>
  );
}
