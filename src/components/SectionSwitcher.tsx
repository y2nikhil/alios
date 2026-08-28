import { Link, useLocation } from "@tanstack/react-router";
import { Home, LayoutList, Tv, MessageSquare, Newspaper } from "lucide-react";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { to: "/app", label: "Home", icon: Home },
  { to: "/app/feed", label: "Feed", icon: LayoutList },
  { to: "/app/party", label: "Watch Party", icon: Tv },
  { to: "/app/collaborate", label: "Chat", icon: MessageSquare },
  { to: "/app/blog", label: "Blog", icon: Newspaper },
] as const;

function isActive(pathname: string, to: string) {
  if (to === "/app") return pathname === "/app" || pathname === "/app/";
  return pathname.startsWith(to);
}

/** Section tabs shown under the search bar — compact text tabs on mobile, cards on desktop. */
export function SectionSwitcher() {
  const { pathname } = useLocation();
  return (
    <div className="w-full border-b border-white/5">
      {/* Mobile: compact text tab bar, no boxes, fits the screen */}
      <div className="flex items-center justify-between px-2 py-1 lg:hidden">
        {SECTIONS.map((s) => {
          const active = isActive(pathname, s.to);
          return (
            <Link
              key={s.to}
              to={s.to}
              className={cn(
                "relative flex flex-col items-center gap-0.5 px-1.5 py-1.5 text-[10px] font-semibold leading-tight transition-colors",
                active ? "text-amber-300" : "text-muted-foreground",
              )}
            >
              <span className="whitespace-nowrap">{s.label}</span>
              <span
                className={cn(
                  "h-0.5 w-6 rounded-full transition-all",
                  active ? "bg-amber-400" : "bg-transparent",
                )}
              />
            </Link>
          );
        })}
      </div>

      {/* Desktop: full cards */}
      <div className="hidden flex-nowrap items-stretch gap-3 px-6 py-3 lg:flex">
        {SECTIONS.map((s) => {
          const active = isActive(pathname, s.to);
          const Icon = s.icon;
          return (
            <Link
              key={s.to}
              to={s.to}
              className={cn(
                "group flex min-w-[130px] flex-1 shrink-0 items-center gap-3 rounded-2xl border px-4 py-3.5 transition-all duration-200",
                active
                  ? "border-amber-400/40 bg-amber-400/10 shadow-[0_0_0_1px_rgba(251,191,36,0.08)]"
                  : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.06]",
              )}
            >
              <span
                className={cn(
                  "grid h-9 w-9 shrink-0 place-items-center rounded-xl transition-colors",
                  active ? "bg-amber-400/20 text-amber-300" : "bg-white/5 text-muted-foreground group-hover:text-foreground",
                )}
              >
                <Icon className="h-4.5 w-4.5" />
              </span>
              <span
                className={cn(
                  "text-sm font-semibold tracking-tight whitespace-nowrap",
                  active ? "text-amber-200" : "text-foreground/85",
                )}
              >
                {s.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
