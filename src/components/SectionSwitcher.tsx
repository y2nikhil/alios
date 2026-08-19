import { Link, useLocation } from "@tanstack/react-router";
import { Home, LayoutList, Tv, MessageSquare, Newspaper } from "lucide-react";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { to: "/app", label: "Home", sub: "Focus & Personal", icon: Home },
  { to: "/app/feed", label: "Feed", sub: "Discussions & Posts", icon: LayoutList },
  { to: "/app/party", label: "Watch Party", sub: "Watch & Sync Together", icon: Tv },
  { to: "/app/collaborate", label: "Chat", sub: "Chat & Study Together", icon: MessageSquare },
  { to: "/app/blog", label: "Blog", sub: "Write & Publish Guides", icon: Newspaper },
] as const;

function isActive(pathname: string, to: string) {
  if (to === "/app") return pathname === "/app" || pathname === "/app/";
  return pathname.startsWith(to);
}

/** Swiggy-style section switcher shown under the search bar. */
export function SectionSwitcher() {
  const { pathname } = useLocation();
  return (
    <div className="w-full">
      {/* Mobile: pills */}
      <div className="flex gap-2 overflow-x-auto scrollbar-thin px-3 py-2 lg:hidden">
        {SECTIONS.map((s) => {
          const active = isActive(pathname, s.to);
          return (
            <Link
              key={s.to}
              to={s.to}
              className={cn(
                "shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition",
                active
                  ? "bg-gradient-to-r from-amber-400 to-orange-500 text-black shadow-lg shadow-orange-500/20"
                  : "bg-white/5 text-muted-foreground hover:bg-white/10",
              )}
            >
              {s.label}
            </Link>
          );
        })}
      </div>

      {/* Desktop: cards */}
      <div className="hidden lg:grid grid-cols-4 gap-3 px-6 py-3">
        {SECTIONS.map((s) => {
          const active = isActive(pathname, s.to);
          const Icon = s.icon;
          return (
            <Link
              key={s.to}
              to={s.to}
              className={cn(
                "flex items-center gap-3 rounded-2xl border px-4 py-3 transition",
                active
                  ? "border-amber-400/40 bg-amber-400/10"
                  : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]",
              )}
            >
              <div className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl", active ? "bg-gradient-to-br from-amber-400 to-orange-500 text-black" : "bg-white/5 text-muted-foreground")}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{s.label}</p>
                <p className="truncate text-[11px] text-muted-foreground">{s.sub}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
