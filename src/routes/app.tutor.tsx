import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Send, Plus, Sparkles, FlaskConical, Sigma, Atom, Dna, Code } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/tutor")({
  head: () => ({ meta: [{ title: "AI Tutor — ALIOS" }] }),
  component: AITutor,
});

type Msg = { role: "user" | "assistant"; content: string };

const HISTORY = [
  { icon: FlaskConical, label: "SN1 vs SN2 reactions", active: true },
  { icon: Sigma, label: "Integration by parts" },
  { icon: Atom, label: "Quantum numbers" },
  { icon: Dna, label: "Meiosis vs Mitosis" },
  { icon: Code, label: "Recursion explained" },
];

const SUGGEST = [
  "Explain this with an analogy",
  "Give me 5 practice questions",
  "Make a summary I can revise tonight",
  "Where am I likely to make mistakes?",
];

function AITutor() {
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Hey! I'm your study tutor. Ask me anything — concepts, doubts, MCQs, or revision plans." },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async (text?: string) => {
    const body = (text ?? input).trim();
    if (!body || sending) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: body }]);
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-tutor", {
        body: { messages: [...messages, { role: "user", content: body }] },
      });
      const reply = (data?.reply as string) || (error ? "Hmm, I couldn't reach the tutor. Try again in a moment." : "Got it — let me think on that.");
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "I'll be back in a moment — connection hiccup." }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-44px)]">
      <aside className="hidden md:flex w-[200px] shrink-0 flex-col border-r-[0.5px] border-border surface-2 p-2 overflow-y-auto">
        <Button size="sm" variant="outline" className="w-full h-8 mb-2 text-[12px]"><Plus className="h-3 w-3 mr-1" />New chat</Button>
        <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider px-2 py-1">Recent</p>
        {HISTORY.map((h, i) => {
          const I = h.icon;
          return (
            <button key={i} className={cn(
              "flex items-center gap-2 px-2 py-1.5 rounded-md text-[12px] text-left",
              h.active ? "bg-brand-soft text-brand-ink font-medium" : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}>
              <I className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{h.label}</span>
            </button>
          );
        })}
      </aside>

      <div className="flex-1 flex flex-col">
        <div className="px-4 py-3 border-b-[0.5px] border-border flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-brand" />
          <p className="text-[13px] font-medium">AI Tutor</p>
          <span className="tag tag-brand ml-2">Gemini</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
              <div className={cn(
                "max-w-[80%] px-3 py-2 text-[13px] leading-relaxed",
                m.role === "user"
                  ? "bg-brand-soft text-brand-ink rounded-2xl rounded-br-sm"
                  : "card-flat surface-2 rounded-2xl rounded-bl-sm",
              )}>{m.content}</div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="card-flat surface-2 px-3 py-2 rounded-2xl rounded-bl-sm text-[13px] text-muted-foreground">Thinking…</div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div className="px-4 lg:px-6 pb-2 flex flex-wrap gap-1.5">
          {SUGGEST.map((s) => (
            <button key={s} onClick={() => send(s)}
              className="rounded-full surface-2 border-soft px-2.5 py-1 text-[11px] text-muted-foreground hover:text-foreground">
              {s}
            </button>
          ))}
        </div>

        <div className="p-3 lg:p-4 border-t-[0.5px] border-border flex items-center gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") send(); }}
            placeholder="Ask anything — concepts, practice, plans…"
            className="h-10"
          />
          <Button onClick={() => send()} disabled={!input.trim() || sending} className="bg-brand text-primary-foreground hover:opacity-90 h-10">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
