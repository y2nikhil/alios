import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Sparkles, Send, Loader2, Trash2, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/assistant")({
  head: () => ({
    meta: [
      { title: "AI Assistant — ALIOS" },
      { name: "description", content: "Chat with ALIOS, your personal productivity assistant." },
    ],
  }),
  component: AssistantPage,
});

type Msg = { role: "user" | "assistant"; content: string };
const KEY = "alios.assistant.chat.v1";

const DEFAULT_SUGGESTIONS = [
  "What did I focus on this week?",
  "Give me a plan for tomorrow.",
  "How can I improve my focus score?",
  "Summarize my last 7 days.",
];

function AssistantPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>(DEFAULT_SUGGESTIONS);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: p } = await supabase
        .from("user_prep_profile")
        .select("exam, attempt_year, weak_subjects, prep_stage")
        .eq("user_id", user.id)
        .maybeSingle();
      if (p) {
        const exam = String(p.exam).toUpperCase();
        const weak = (p.weak_subjects ?? [])[0];
        setSuggestions([
          `Plan my week for ${exam} ${p.prep_stage}`,
          weak ? `Quiz me on ${weak}` : `Suggest weak-area drills for ${exam}`,
          `Best resources for ${exam} ${p.attempt_year}`,
          `How am I tracking vs my ${exam} goal?`,
        ]);
      }
    })();
  }, []);

  useEffect(() => {
    try { setMessages(JSON.parse(localStorage.getItem(KEY) ?? "[]")); } catch { /* ignore */ }
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(messages));
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async (text?: string) => {
    const q = (text ?? input).trim();
    if (!q || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: q }]);
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/ai-ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ question: q }),
      });
      const json = await res.json();
      setMessages((m) => [...m, { role: "assistant", content: json.answer ?? "No answer." }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Couldn't reach the assistant. Try again." }]);
    } finally {
      setLoading(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  };

  const clear = () => { setMessages([]); localStorage.removeItem(KEY); };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-3xl mx-auto p-4 lg:p-6">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-11 w-11 shrink-0 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 grid place-items-center shadow-lg shadow-violet-500/30">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate">ALIOS Assistant</h1>
            <p className="text-xs text-muted-foreground truncate">Ask about your habits, plans, or anything productivity.</p>
          </div>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clear} className="shrink-0">
            <Trash2 className="h-3.5 w-3.5 mr-1" /> Clear
          </Button>
        )}
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin rounded-3xl glass p-4 sm:p-6 space-y-4">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center py-8">
            <div className="h-16 w-16 rounded-3xl bg-gradient-to-br from-violet-500 to-cyan-400 grid place-items-center mb-4 shadow-xl shadow-violet-500/30">
              <Sparkles className="h-7 w-7 text-white" />
            </div>
            <p className="text-lg font-semibold">How can I help today?</p>
            <p className="text-sm text-muted-foreground mt-1">Try one of these to get started:</p>
            <div className="mt-5 grid gap-2 w-full max-w-md">
              {suggestions.map((s: string) => (
                <button key={s} onClick={() => send(s)}
                  className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-4 py-2.5 text-sm text-left transition">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={cn("flex gap-3", m.role === "user" ? "justify-end" : "justify-start")}>
            {m.role === "assistant" && (
              <div className="h-8 w-8 shrink-0 rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 grid place-items-center">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
            )}
            <div className={cn(
              "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
              m.role === "user"
                ? "bg-gradient-to-br from-violet-500 to-cyan-400 text-white"
                : "bg-white/5 border border-white/10",
            )}>{m.content}</div>
            {m.role === "user" && (
              <div className="h-8 w-8 shrink-0 rounded-full bg-white/10 grid place-items-center">
                <User className="h-4 w-4" />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="h-8 w-8 shrink-0 rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 grid place-items-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div className="rounded-2xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-muted-foreground inline-flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
            </div>
          </div>
        )}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); send(); }} className="mt-3 flex items-end gap-2">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Ask ALIOS anything…"
          rows={1}
          className="flex-1 min-w-0 resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-violet-400/50 max-h-40"
        />
        <Button type="submit" disabled={loading || !input.trim()} className="h-11 rounded-2xl bg-gradient-to-r from-violet-500 to-cyan-400 shrink-0">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
