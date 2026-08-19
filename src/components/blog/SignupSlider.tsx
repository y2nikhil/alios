import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { X, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth";

const KEY = "classlab.blog.signup-slider.dismissed";

/** Slides in from the bottom-right after ~30s of reading. Dismissable, never blocks the article. */
export function SignupSlider({ delayMs = 30000 }: { delayMs?: number }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (user) return;
    try {
      if (sessionStorage.getItem(KEY) === "1") return;
    } catch {}
    const t = setTimeout(() => setOpen(true), delayMs);
    return () => clearTimeout(t);
  }, [user, delayMs]);

  if (!open || user) return null;

  const close = () => {
    setOpen(false);
    try { sessionStorage.setItem(KEY, "1"); } catch {}
  };

  return (
    <aside
      role="complementary"
      aria-label="Join ClassLab"
      className="fixed bottom-4 right-4 z-50 w-[min(360px,calc(100vw-2rem))] animate-in slide-in-from-bottom-6 fade-in duration-500"
    >
      <div className="relative rounded-2xl border border-amber-400/25 bg-[#111010]/95 p-5 shadow-2xl shadow-black/60 backdrop-blur">
        <button
          onClick={close}
          aria-label="Dismiss sign-up invitation"
          className="absolute right-3 top-3 rounded-full p-1 text-muted-foreground hover:bg-white/10 hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2 text-amber-300">
          <Sparkles className="h-4 w-4" />
          <p className="text-xs font-semibold uppercase tracking-wider">Enjoying the read?</p>
        </div>
        <h2 className="mt-2 text-base font-bold leading-snug">Join ClassLab free — study with thousands of students</h2>
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
          Track focus hours, join exam communities, share notes and host watch parties. No card needed.
        </p>
        <div className="mt-4 flex items-center gap-2">
          <Link to="/login" className="flex-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-2 text-center text-sm font-semibold text-black">
            Create free account
          </Link>
          <button onClick={close} className="rounded-full px-3 py-2 text-xs text-muted-foreground hover:text-foreground">
            Keep reading
          </button>
        </div>
      </div>
    </aside>
  );
}
