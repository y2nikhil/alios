import { useEffect, useRef, useState } from "react";
import { Search, Sparkles, Loader2, Tv, Users, MessageSquare, Brain, BarChart3 } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type Result =
  | { kind: "page"; label: string; to: string; icon: any }
  | { kind: "group"; label: string; emoji: string; id: string }
  | { kind: "party"; label: string; id: string }
  | { kind: "person"; label: string; id: string };

const PAGES: Result[] = [
  { kind: "page", label: "Command center", to: "/app", icon: Sparkles },
  { kind: "page", label: "Timeline", to: "/app/timeline", icon: BarChart3 },
  { kind: "page", label: "Analytics", to: "/app/analytics", icon: BarChart3 },
  { kind: "page", label: "Mind map", to: "/app/mindmap", icon: Brain },
  { kind: "page", label: "Collaborate", to: "/app/collaborate", icon: MessageSquare },
  { kind: "page", label: "Watch parties", to: "/app/party", icon: Tv },
  { kind: "page", label: "Playlists", to: "/app/playlists", icon: Tv },
];

export function CommandBar() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[]>(PAGES);
  const [askMode, setAskMode] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  useEffect(() => {
    let cancelled = false;
    const term = q.trim().toLowerCase();
    if (!term) { setResults(PAGES); return; }
    (async () => {
      const [{ data: groups }, { data: parties }] = await Promise.all([
        supabase.from("groups").select("id, name, emoji").ilike("name", `%${term}%`).limit(5),
        (supabase.from("watch_parties") as any).select("id, title, visibility, ended_at").is("ended_at", null).ilike("title", `%${term}%`).limit(5),
      ]);
      if (cancelled) return;
      const next: Result[] = [
        ...PAGES.filter((p) => p.kind === "page" && p.label.toLowerCase().includes(term)),
        ...((groups ?? []) as any[]).map((g) => ({ kind: "group" as const, label: g.name, emoji: g.emoji ?? "💬", id: g.id })),
        ...((parties ?? []) as any[]).filter((p) => p.visibility !== "private").map((p) => ({ kind: "party" as const, label: p.title, id: p.id })),
      ];
      setResults(next);
    })();
    return () => { cancelled = true; };
  }, [q]);

  const ask = async () => {
    if (!q.trim()) return;
    setAsking(true);
    setAnswer(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/ai-ask", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}) },
        body: JSON.stringify({ question: q.trim() }),
      });
      const json = await res.json();
      setAnswer(json.answer ?? "No answer.");
    } catch {
      setAnswer("Could not reach AI.");
    } finally {
      setAsking(false);
    }
  };

  const pick = (r: Result) => {
    setOpen(false);
    setQ("");
    if (r.kind === "page") navigate({ to: r.to });
    else if (r.kind === "group") navigate({ to: "/app/collaborate" });
    else if (r.kind === "party") navigate({ to: "/app/hangout/$partyId", params: { partyId: r.id } });
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="group flex w-full max-w-xl items-center gap-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition px-4 py-2 text-sm text-muted-foreground"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left truncate">Search people, groups, parties · or ask AI</span>
        <kbd className="hidden md:inline-flex h-5 items-center rounded border border-white/10 bg-white/5 px-1.5 text-[10px] font-mono">⌘K</kbd>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm grid place-items-start pt-[10vh] px-4" onClick={() => setOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-xl rounded-2xl border border-white/10 bg-[oklch(0.14_0.02_265)] shadow-2xl overflow-hidden">
            <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
              {askMode ? <Sparkles className="h-4 w-4 text-pink-400" /> : <Search className="h-4 w-4 text-muted-foreground" />}
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => { setQ(e.target.value); setAnswer(null); }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    if (askMode) ask();
                    else if (results[0]) pick(results[0]);
                  }
                }}
                placeholder={askMode ? "Ask anything…" : "Search…"}
                className="flex-1 bg-transparent outline-none text-sm"
              />
              <button
                onClick={() => { setAskMode((v) => !v); setAnswer(null); }}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider transition",
                  askMode ? "bg-pink-500/20 text-pink-200" : "bg-white/5 text-muted-foreground hover:text-foreground",
                )}
              >
                {askMode ? "Search" : "Ask AI"}
              </button>
            </div>

            <div className="max-h-[55vh] overflow-y-auto scrollbar-thin">
              {askMode ? (
                <div className="p-4 space-y-3">
                  {asking ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Thinking…</div>
                  ) : answer ? (
                    <div className="rounded-xl bg-white/5 p-4 text-sm leading-relaxed">{answer}</div>
                  ) : (
                    <div className="text-xs text-muted-foreground">Ask about your productivity, "how do I focus better", or anything else. Enter to send.</div>
                  )}
                  <button onClick={ask} disabled={!q.trim() || asking} className="w-full rounded-lg bg-gradient-to-r from-pink-500 to-violet-500 text-white text-sm font-semibold py-2 disabled:opacity-50">Ask</button>
                </div>
              ) : (
                <ul className="py-2">
                  {results.length === 0 && <li className="px-4 py-6 text-xs text-muted-foreground text-center">No matches</li>}
                  {results.map((r, i) => (
                    <li key={`${r.kind}-${i}`}>
                      <button
                        onClick={() => pick(r)}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-white/5 text-left"
                      >
                        {r.kind === "page" && <r.icon className="h-4 w-4 text-muted-foreground" />}
                        {r.kind === "group" && <span className="text-base">{r.emoji}</span>}
                        {r.kind === "party" && <Tv className="h-4 w-4 text-pink-400" />}
                        {r.kind === "person" && <Users className="h-4 w-4 text-cyan-400" />}
                        <span className="flex-1 truncate">{r.label}</span>
                        <span className="text-[10px] text-muted-foreground uppercase">{r.kind}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
