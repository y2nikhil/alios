import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Activity, BarChart3, Brain, Settings, Sparkles,
  Shield, Crown, MessageSquare, Youtube, Tv, Radio, Menu, X, Users, Mail,
  MoreVertical, AlertCircle, Calendar as CalIcon, LayoutList, Plus, Pencil, Eye, Newspaper, PenLine,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { AuxProvider, useAux } from "@/lib/aux-store";
import { useEffect, useMemo, useState } from "react";
import { formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useRole } from "@/lib/use-role";
import { ProfileMenu } from "@/components/ProfileMenu";
import { NotificationBell } from "@/components/NotificationBell";
import { CommandBar } from "@/components/CommandBar";
import { IdlePrompt } from "@/components/IdlePrompt";
import { PunchPrompt } from "@/components/PunchPrompt";
import { SectionSwitcher } from "@/components/SectionSwitcher";
import { supabase } from "@/integrations/supabase/client";
import { useFocusMilestones } from "@/lib/use-focus-milestones";
import { DisplayNamePrompt } from "@/components/DisplayNamePrompt";
import { BrandLogo } from "@/components/BrandLogo";
import { SiteFooter } from "@/components/SiteFooter";
import { trackEvent, installClickTracking } from "@/lib/activity";



function PresenceHeartbeat() {
  const { user } = useAuth();
  useEffect(() => {
    if (!user) return;
    const beat = () => { (supabase as any).rpc("touch_presence"); };
    beat();
    const id = setInterval(beat, 60_000);
    return () => clearInterval(id);
  }, [user]);
  return null;
}

function OnboardingRedirect() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);
  useEffect(() => {
    if (!user || checked) return;
    if (typeof window !== "undefined" && localStorage.getItem("alios.onboarded") === "1") {
      setChecked(true);
      return;
    }
    if (typeof window !== "undefined" && window.location.pathname.startsWith("/app/onboarding")) {
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("user_prep_profile")
        .select("onboarded_at")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      setChecked(true);
      if (data?.onboarded_at) {
        try { localStorage.setItem("alios.onboarded", "1"); } catch {}
        return;
      }
      const skipped = sessionStorage.getItem("alios.onboarding.skipped") === "1";
      if (!skipped) {
        navigate({ to: "/app/onboarding" });
      }
    })();
    return () => { cancelled = true; };
  }, [user, checked, navigate]);
  return null;
}


const BASE_NAV = [
  { to: "/app", label: "Home", icon: LayoutDashboard },
  { to: "/app/feed", label: "Feed", icon: LayoutList },
  { to: "/app/timeline", label: "Timeline", icon: Activity },
  { to: "/app/calendar", label: "Calendar", icon: CalIcon },
  { to: "/app/assistant", label: "AI Assistant", icon: Sparkles },
  { to: "/app/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/app/mindmap", label: "Mind Map", icon: Brain },
  { to: "/app/collaborate", label: "Collaborate", icon: MessageSquare },
  { to: "/app/friends", label: "Friends", icon: Users },
  { to: "/app/party", label: "Watch Party", icon: Tv },
  { to: "/app/playlists", label: "Playlists", icon: Youtube },
  { to: "/app/blog", label: "Blog", icon: Newspaper },
  { to: "/app/settings", label: "Settings", icon: Settings },
] as const;

const IDLE_THRESHOLD_MS = 30 * 60 * 1000;

function HeaderStatus() {
  const { activeSession, activeStatus, markNotResponding } = useAux();
  const [now, setNow] = useState(() => Date.now());
  const [lastActivity, setLastActivity] = useState(() => Date.now());

  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    const bump = () => setLastActivity(Date.now());
    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"] as const;
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    return () => { events.forEach((e) => window.removeEventListener(e, bump)); };
  }, []);

  useEffect(() => { setLastActivity(Date.now()); }, [activeSession?.id]);

  if (!activeSession || !activeStatus) {
    return (
      <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
        <span className="h-2 w-2 rounded-full bg-muted-foreground" />
        No active status
      </div>
    );
  }

  const elapsed = Math.floor((now - new Date(activeSession.started_at).getTime()) / 1000);
  const isIdle = now - lastActivity >= IDLE_THRESHOLD_MS;

  return (
    <div className="hidden md:flex items-center gap-2">
      <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
        <span
          className="h-2 w-2 rounded-full animate-pulse-glow"
          style={{ backgroundColor: activeStatus.color, color: activeStatus.color }}
        />
        <span className="text-sm font-semibold text-foreground">{activeStatus.name}</span>
        <span className="font-mono text-sm tabular-nums text-muted-foreground">
          {formatDuration(elapsed)}
        </span>
      </div>
      {isIdle && (
        <button
          onClick={() => markNotResponding()}
          title="You've been idle for 30+ minutes"
          className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-400/20 transition"
        >
          <AlertCircle className="h-3 w-3" /> Not responding
        </button>
      )}
    </div>
  );
}

function PunchStatusList({ onItem }: { onItem?: () => void }) {
  const { statuses, activeSession, todaySessions, switchTo } = useAux();

  const countByStatus = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of todaySessions) m.set(s.status_id, (m.get(s.status_id) ?? 0) + 1);
    return m;
  }, [todaySessions]);

  return (
    <div className="px-3 py-2 space-y-0.5">
      <div className="flex items-center justify-between px-2 pb-2 pt-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
          Punch Status
        </p>
        <Link
          to="/app/settings"
          onClick={() => onItem?.()}
          aria-label="Edit AUX statuses"
          title="Edit AUX statuses"
          className="grid h-5 w-5 place-items-center rounded-md text-muted-foreground hover:bg-white/10 hover:text-foreground transition"
        >
          <Pencil className="h-3 w-3" />
        </Link>
      </div>
      {statuses.map((s) => {
        const active = activeSession?.status_id === s.id;
        const count = countByStatus.get(s.id) ?? 0;
        return (
          <button
            key={s.id}
            onClick={() => { switchTo(s.id); onItem?.(); }}
            className={cn(
              "group w-full flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm transition-all",
              active ? "bg-white/10 ring-1 ring-white/10" : "hover:bg-white/5",
            )}
          >
            <span
              className={cn("h-2 w-2 rounded-full shrink-0", active && "animate-pulse-glow")}
              style={{ backgroundColor: s.color, color: s.color }}
            />
            <span className="flex-1 text-left truncate text-foreground/85">{s.name}</span>
            {count > 0 && (
              <span className="text-[11px] tabular-nums text-muted-foreground">{count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function SidebarNav({ NAV, onClose }: { NAV: any[]; onClose?: () => void }) {
  const location = useLocation();
  return (
    <nav className="px-3 py-2 space-y-0.5">
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
              "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-white/10 text-foreground ring-1 ring-white/10"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5",
            )}
          >
            <Icon className={cn("h-4 w-4", item.label === "Super" && "text-amber-400")} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarPanel({ NAV, onClose }: { NAV: any[]; onClose?: () => void }) {
  const { user } = useAuth();
  const displayName = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "User";
  const initial = displayName.slice(0, 1).toUpperCase();

  return (
    <div className="flex h-full w-60 flex-col border-r border-white/5 bg-[oklch(0.05_0.012_265)]/95 backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between gap-2 px-4">
        <Link to="/" className="flex items-center gap-2.5" onClick={onClose}>
          <BrandLogo size={36} tagline="Your Study Campus" />
        </Link>
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden h-8 w-8 grid place-items-center rounded-md hover:bg-white/5"
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <SidebarNav NAV={NAV} onClose={onClose} />
        <div className="h-px bg-white/5 mx-4 my-2" />
        <PunchStatusList onItem={onClose} />
      </div>

      <div className="border-t border-white/5 p-3">
        <div className="flex items-center gap-2.5 rounded-xl bg-white/5 px-2.5 py-2">
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 grid place-items-center text-sm font-bold text-white shrink-0">
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate leading-tight">{displayName}</p>
            <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
          </div>
          <button className="h-7 w-7 grid place-items-center rounded-md hover:bg-white/10 text-muted-foreground shrink-0">
            <MoreVertical className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function ShellInner() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin, isSuperAdmin } = useRole();
  const [mobileOpen, setMobileOpen] = useState(false);
  useFocusMilestones();


  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  useEffect(() => { trackEvent("page_view", document.title || null, {}, location.pathname); }, [location.pathname]);
  useEffect(() => installClickTracking(), []);

  const NAV = [
    ...BASE_NAV,
    ...(isAdmin ? [
      { to: "/app/blog" as const, label: "Blog Studio", icon: PenLine },
      { to: "/app/live" as const, label: "Live Feed", icon: Radio },
      { to: "/app/admin" as const, label: "Admin", icon: Shield },
      { to: "/app/moderation" as const, label: "Moderation", icon: Shield },
    ] : []),
    ...(isAdmin ? [
      { to: "/app/email-studio" as const, label: "Email Studio", icon: Mail },
    ] : []),
    ...(isSuperAdmin ? [
      { to: "/app/super" as const, label: "Super", icon: Crown },
      { to: "/app/overwatch" as const, label: "Overwatch", icon: Eye },
    ] : []),

  ];


  return (
    <div className="flex h-[100dvh] max-h-[100dvh] w-full overflow-hidden">
      {/* Persistent desktop sidebar */}
      <aside className="hidden lg:block shrink-0">
        <SidebarPanel NAV={NAV} />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              key="drawer"
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              className="fixed top-0 left-0 z-50 h-full lg:hidden"
            >
              <SidebarPanel NAV={NAV} onClose={() => setMobileOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden min-w-0">
        <header className="h-16 flex items-center gap-3 border-b border-white/5 px-3 lg:px-6 bg-background/60 backdrop-blur-xl">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden h-9 w-9 grid place-items-center rounded-lg hover:bg-white/5 active:scale-95 transition shrink-0"
            aria-label="Open sidebar"
          >
            <Menu className="h-4 w-4" />
          </button>
          <div className="flex-1 min-w-0 flex justify-center">
            <CommandBar />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <HeaderStatus />
            <button
              onClick={() => {
                if (location.pathname.startsWith("/app/feed")) {
                  window.dispatchEvent(new CustomEvent("classlab:open-post-composer"));
                } else {
                  navigate({ to: "/app/feed", search: { compose: "1" } });
                }
              }}
              className="lg:hidden h-9 w-9 grid place-items-center rounded-lg bg-amber-400 text-black hover:bg-amber-300 active:scale-95 transition shrink-0"
              aria-label="Create post"
            >
              <Plus className="h-5 w-5" />
            </button>
            <NotificationBell />
            <ProfileMenu />
          </div>
        </header>

        <SectionSwitcher />

        <main className={cn(
          "flex-1 min-h-0 scrollbar-thin",
          location.pathname.startsWith("/app/collaborate") || location.pathname.startsWith("/app/hangout/") ? "overflow-hidden" : "overflow-y-auto",
        )}>
          <motion.div
            key={location.pathname}
            className={cn(
              (location.pathname.startsWith("/app/collaborate") || location.pathname.startsWith("/app/hangout/")) && "h-full min-h-0",
            )}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <Outlet />
          </motion.div>
          {!(location.pathname.startsWith("/app/collaborate") || location.pathname.startsWith("/app/hangout/")) && (
            <SiteFooter />
          )}
        </main>
      </div>
    </div>
  );
}

export function AppShell() {
  return (
    <AuxProvider>
      <OnboardingRedirect />
      <PresenceHeartbeat />
      <DisplayNamePrompt />

      <ShellInner />
      <IdlePrompt />
      <PunchPrompt />
    </AuxProvider>
  );
}
