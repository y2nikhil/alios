import { Link, useLocation } from "@tanstack/react-router";
import { Home, LayoutList, Tv, MessageSquare, Newspaper } from "lucide-react";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { to: "/app", label: "Home", icon: Home },
  { to: "/app/feed", label: "Feed", icon: LayoutList },
  { to: "/app/party", label: "Watch Party", icon: Tv },
  { to: "/app/collaborate", label: "Chat", icon: MessageSquare },
  { to: "/blog", label: "Blog", icon: Newspaper },
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

      {/* Desktop: compact premium tabs */}
      <div className="hidden lg:flex items-center gap-2 px-6 py-2">
        {SECTIONS.map((s) => {
          const active = isActive(pathname, s.to);
          const Icon = s.icon;
          return (
            <Link
              key={s.to}
              to={s.to}
              className={cn(
                "group inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all duration-200",
                active
                  ? "border-amber-400/40 bg-amber-400/10 text-amber-200 shadow-[0_0_0_1px_rgba(251,191,36,0.08)]"
                  : "border-white/10 bg-white/[0.02] text-muted-foreground hover:border-white/20 hover:bg-white/[0.06] hover:text-foreground",
              )}
            >
              <Icon className={cn("h-4 w-4 transition-colors", active ? "text-amber-300" : "text-muted-foreground group-hover:text-foreground")} />
              <span className="tracking-tight">{s.label}</span>
            </Link>
          );
        })}
      </div>

    </div>
  );
}
