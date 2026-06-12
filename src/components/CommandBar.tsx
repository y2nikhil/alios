import { useEffect, useRef, useState } from "react";
import { Search, Sparkles, Loader2, Tv, MessageSquare, Brain, BarChart3, User as UserIcon, Mail, X } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type Person = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  email: string | null;
  status: { name: string; color: string; since: string } | null;
};

type Result =
  | { kind: "page"; label: string; to: string; icon: any }
  | { kind: "group"; label: string; emoji: string; id: string }
  | { kind: "party"; label: string; id: string }
  | { kind: "person"; person: Person };

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
  const panelRef = useRef<HTMLDivElement>(null);

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

  // Click outside
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  useEffect(() => {
    let cancelled = false;
    const term = q.trim().toLowerCase();
    if (!term) { setResults(PAGES); return; }
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const [{ data: groups }, { data: parties }, peopleRes] = await Promise.all([
        supabase.from("groups").select("id, name, emoji").ilike("name", `%${term}%`).limit(4),
        (supabase.from("watch_parties") as any).select("id, title, visibility, ended_at").is("ended_at", null).ilike("title", `%${term}%`).limit(4),
        fetch("/api/search-people", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}) },
          body: JSON.stringify({ q: term }),
        }).then((r) => r.json()).catch(() => ({ results: [] })),
      ]);
      if (cancelled) return;
      const people: Person[] = peopleRes?.results ?? [];
      const next: Result[] = [
        ...people.map((p) => ({ kind: "person" as const, person: p })),
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
    else if (r.kind === "person") navigate({ to: "/app/u/$userId", params: { userId: r.person.id } });
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{ backgroundColor: "oklch(0.11 0.018 265 / 0.96)" }}
        className="group flex w-full max-w-xl items-center gap-2 rounded-full border border-white/15 hover:border-violet-400/40 shadow-[0_2px_18px_-6px_rgba(139,92,246,0.45)] transition px-4 py-2 text-sm text-muted-foreground"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left truncate">Search people, groups, parties · or ask AI</span>
        <kbd className="hidden md:inline-flex h-5 items-center rounded border border-white/10 bg-white/5 px-1.5 text-[10px] font-mono">⌘K</kbd>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-[2px]" onClick={() => setOpen(false)} />
        <div className="fixed inset-x-0 top-[64px] z-[100] flex justify-center px-4 pointer-events-none">
          <div
            ref={panelRef}
            className="pointer-events-auto w-full max-w-2xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden ring-1 ring-white/5"
            style={{ backgroundColor: "oklch(0.06 0.012 265)" }}
          >
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
                placeholder={askMode ? "Ask anything…" : "Search users (@username, name, email), pages, parties…"}
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
              <button onClick={() => setOpen(false)} className="rounded-full p-1 text-muted-foreground hover:text-foreground hover:bg-white/5">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto scrollbar-thin">
              {askMode ? (
                <div className="p-4 space-y-3">
                  {asking ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Thinking…</div>
                  ) : answer ? (
                    <div className="rounded-xl bg-white/5 border border-white/10 p-4 text-sm leading-relaxed whitespace-pre-wrap">{answer}</div>
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
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/5 text-left"
                      >
                        {r.kind === "page" && <r.icon className="h-4 w-4 text-muted-foreground shrink-0" />}
                        {r.kind === "group" && <span className="text-base">{r.emoji}</span>}
                        {r.kind === "party" && <Tv className="h-4 w-4 text-pink-400 shrink-0" />}
                        {r.kind === "person" && (
                          <div className="h-7 w-7 shrink-0 rounded-full bg-gradient-to-br from-cyan-500 to-violet-500 grid place-items-center text-[11px] font-semibold text-white">
                            {(r.person.display_name?.[0] ?? r.person.username?.[0] ?? "?").toUpperCase()}
                          </div>
                        )}
                        {r.kind === "person" ? (
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium truncate">{r.person.display_name ?? r.person.username ?? "User"}</span>
                              {r.person.username && <span className="text-xs text-muted-foreground truncate">@{r.person.username}</span>}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                              {r.person.email && (<span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{r.person.email}</span>)}
                              {r.person.status && (
                                <span className="inline-flex items-center gap-1">
                                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: r.person.status.color }} />
                                  {r.person.status.name}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="flex-1 truncate">{(r as any).label}</span>
                        )}
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{r.kind === "person" ? "user" : r.kind}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
        </>
      )}
    </>
  );
}
