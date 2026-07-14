import { Link, Outlet, useLocation } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Activity, BarChart3, Brain, Settings, Sparkles,
  Shield, Crown, MessageSquare, Youtube, Tv, Radio, Menu, X, Users,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { AuxProvider, useAux } from "@/lib/aux-store";
import { useEffect, useState } from "react";
import { formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useRole } from "@/lib/use-role";
import { ProfileMenu } from "@/components/ProfileMenu";
import { NotificationBell } from "@/components/NotificationBell";
import { CommandBar } from "@/components/CommandBar";
import { IdlePrompt } from "@/components/IdlePrompt";
import { AlertCircle } from "lucide-react";

const BASE_NAV = [
  { to: "/app", label: "Command", icon: LayoutDashboard },
  { to: "/app/timeline", label: "Timeline", icon: Activity },
  { to: "/app/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/app/mindmap", label: "Mind Map", icon: Brain },
  { to: "/app/collaborate", label: "Collaborate", icon: MessageSquare },
  { to: "/app/friends", label: "Friends", icon: Users },
  { to: "/app/party", label: "Watch Party", icon: Tv },
  { to: "/app/playlists", label: "Playlists", icon: Youtube },
  { to: "/app/settings", label: "Settings", icon: Settings },
] as const;

const IDLE_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes

function LiveTimer() {
  const { activeSession, activeStatus, markNotResponding } = useAux();
  const [now, setNow] = useState(() => Date.now());
  const [lastActivity, setLastActivity] = useState(() => Date.now());

  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);

  // Track user activity to determine idleness
  useEffect(() => {
    const bump = () => setLastActivity(Date.now());
    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"] as const;
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    return () => { events.forEach((e) => window.removeEventListener(e, bump)); };
  }, []);

  // Reset activity when the user punches a new status
  useEffect(() => {
    setLastActivity(Date.now());
  }, [activeSession?.id]);

  if (!activeSession || !activeStatus) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="h-2 w-2 rounded-full bg-muted-foreground" />
        No active status
      </div>
    );
  }
  const elapsed = Math.floor((now - new Date(activeSession.started_at).getTime()) / 1000);
  const isIdle = now - lastActivity >= IDLE_THRESHOLD_MS;
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
      {isIdle && (
        <button
          onClick={() => markNotResponding()}
          title="You've been idle for 30+ minutes — mark yourself as Away"
          className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300 hover:bg-amber-400/20 transition"
        >
          <AlertCircle className="h-3 w-3" /> Not responding
        </button>
      )}
    </div>
  );
}

function SidebarAuxList({ onItem }: { onItem?: () => void }) {
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
            onClick={() => { switchTo(s.id); onItem?.(); }}
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

function SidebarPanel({ NAV, onClose }: { NAV: any[]; onClose: () => void }) {
  const location = useLocation();
  const { user } = useAuth();
  return (
    <div className="flex h-full w-64 flex-col border-r border-white/5 bg-[oklch(0.05_0.012_265)]/95 backdrop-blur-xl">
      <div className="flex h-14 items-center justify-between gap-2 px-4 border-b border-white/5">
        <Link to="/" className="flex items-center gap-2" onClick={onClose}>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-cyan-400 shadow-lg shadow-violet-500/30">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold tracking-tight">ALIOS</p>
            <p className="text-[10px] text-muted-foreground -mt-0.5">AI Life OS</p>
          </div>
        </Link>
        <button
          onClick={onClose}
          className="lg:hidden h-8 w-8 grid place-items-center rounded-md hover:bg-white/5"
          aria-label="Close sidebar"
        >
          <X className="h-4 w-4" />
        </button>
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
              onClick={onClose}
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
      <SidebarAuxList onItem={onClose} />

      <div className="border-t border-white/5 p-3">
        <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
      </div>
    </div>
  );
}

function ShellInner() {
  const location = useLocation();
  const { isAdmin, isSuperAdmin } = useRole();
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false); // hover-open behavior

  // close drawer on route change
  useEffect(() => { setOpen(false); }, [location.pathname]);

  // Keyboard shortcut: \ toggles sidebar
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "\\" && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const NAV = [
    ...BASE_NAV,
    ...(isAdmin ? [
      { to: "/app/live" as const, label: "Live Feed", icon: Radio },
      { to: "/app/admin" as const, label: "Admin", icon: Shield },
      { to: "/app/admin/moderation" as const, label: "Moderation", icon: Shield },
    ] : []),
    ...(isSuperAdmin ? [{ to: "/app/super" as const, label: "Super", icon: Crown }] : []),
  ];

  const showSidebar = open || pinned;

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Hover hot-zone for desktop quick-peek */}
      <div
        className="hidden lg:block fixed top-0 left-0 h-full w-2 z-30"
        onMouseEnter={() => setPinned(true)}
      />

      {/* Drawer sidebar */}
      <AnimatePresence>
        {showSidebar && (
          <>
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => { setOpen(false); setPinned(false); }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:bg-black/40"
            />
            <motion.aside
              key="drawer"
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              onMouseLeave={() => { if (!open) setPinned(false); }}
              className="fixed top-0 left-0 z-50 h-full"
            >
              <SidebarPanel NAV={NAV} onClose={() => { setOpen(false); setPinned(false); }} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 flex items-center gap-3 border-b border-white/5 px-3 lg:px-6 bg-background/60 backdrop-blur-xl">
          <button
            onClick={() => setOpen((v) => !v)}
            className="h-9 w-9 grid place-items-center rounded-lg hover:bg-white/5 active:scale-95 transition shrink-0"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-4 w-4" />
          </button>
          <Link to="/" className="hidden sm:flex items-center gap-2 shrink-0">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-cyan-400 shadow-lg shadow-violet-500/30">
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm font-bold tracking-tight">ALIOS</span>
          </Link>
          <div className="flex-1 flex justify-center">
            <CommandBar />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden xl:block"><LiveTimer /></div>
            <NotificationBell />
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
      </div>
    </div>
  );
}

export function AppShell() {
  return (
    <AuxProvider>
      <ShellInner />
      <IdlePrompt />
    </AuxProvider>
  );
}
