import { createFileRoute } from "@tanstack/react-router";
import { Plus, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/schedule")({
  head: () => ({ meta: [{ title: "Schedule — ALIOS" }] }),
  component: Schedule,
});

const HOURS = ["8 AM","9 AM","10 AM","11 AM","12 PM","1 PM","2 PM","3 PM","4 PM","5 PM","6 PM","7 PM"];

const EVENTS: Record<string, { label: string; tone: "brand" | "teal" | "amber" }[]> = {
  "9 AM": [{ label: "📐 Maths self-study — Integration", tone: "brand" }],
  "11 AM": [{ label: "🧬 Biology group study · NEET Prep", tone: "teal" }],
  "2 PM": [{ label: "⚗️ Chemistry revision — Reactions", tone: "amber" }],
  "4 PM": [{ label: "🎵 Chill break", tone: "amber" }],
  "5 PM": [{ label: "📖 English reading", tone: "brand" }],
  "6 PM": [{ label: "📐 JEE Maths Room — Priya hosting", tone: "teal" }],
};

const TONE: Record<string, string> = {
  brand: "bg-brand-soft border-l-brand text-brand-ink",
  teal: "bg-teal-soft border-l-[oklch(0.55_0.12_165)] text-teal-ink",
  amber: "bg-amber-soft border-l-[oklch(0.55_0.12_60)] text-amber-ink",
};

function Schedule() {
  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-44px)]">
      <aside className="lg:w-[240px] border-r-[0.5px] border-border surface-2 p-3 overflow-y-auto shrink-0">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[13px] font-medium">May 2026</p>
          <div className="flex gap-0.5">
            <button className="h-6 w-6 rounded hover:bg-accent flex items-center justify-center"><ChevronLeft className="h-3.5 w-3.5" /></button>
            <button className="h-6 w-6 rounded hover:bg-accent flex items-center justify-center"><ChevronRight className="h-3.5 w-3.5" /></button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-0.5 text-center text-[9px] text-muted-foreground">
          {["S","M","T","W","T","F","S"].map((d, i) => <div key={i} className="py-1">{d}</div>)}
          {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
            <div key={d} className={cn("py-1 text-[10px] text-foreground rounded",
              d === 19 && "bg-brand text-primary-foreground font-medium")}>{d}</div>
          ))}
        </div>
        <div className="h-px bg-border my-3" />
        <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider mb-2">Upcoming deadlines</p>
        <div className="space-y-1.5">
          {[
            { label: "Chemistry exam", when: "May 20 · 2 days", color: "bg-[oklch(0.6_0.22_25)]" },
            { label: "Math assignment", when: "May 22 · 4 days", color: "bg-[oklch(0.55_0.12_60)]" },
            { label: "English essay", when: "May 28 · 10 days", color: "bg-brand" },
          ].map((d) => (
            <div key={d.label} className="flex items-start gap-1.5">
              <span className={cn("h-1.5 w-1.5 rounded-full mt-1.5 shrink-0", d.color)} />
              <div>
                <p className="text-[11px] font-medium">{d.label}</p>
                <p className="text-[10px] text-muted-foreground">{d.when}</p>
              </div>
            </div>
          ))}
        </div>
      </aside>

      <div className="flex-1 overflow-y-auto">
        <div className="flex items-center justify-between px-4 lg:px-6 py-3 border-b-[0.5px] border-border">
          <p className="text-[14px] font-medium">Tuesday, May 19</p>
          <Button size="sm" className="bg-brand text-primary-foreground hover:opacity-90 h-8"><Plus className="h-3.5 w-3.5 mr-1" />Add event</Button>
        </div>

        <div className="p-4 lg:p-6 space-y-0">
          {HOURS.map((h) => (
            <div key={h} className="grid grid-cols-[60px_1fr] border-b-[0.5px] border-border min-h-[44px] py-1.5">
              <div className="text-[10px] text-muted-foreground pt-1 text-right pr-3">{h}</div>
              <div className="space-y-1">
                {(EVENTS[h] ?? []).map((e, i) => (
                  <div key={i} className={cn("border-l-2 rounded-r-md px-2.5 py-1.5 text-[11px]", TONE[e.tone])}>
                    {e.label}
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="mt-4 bg-brand-soft rounded-lg p-3 flex gap-2.5 items-center">
            <Sparkles className="h-4 w-4 text-brand" />
            <p className="flex-1 text-[12px] text-brand-ink">
              <span className="font-semibold">AI study planner · </span>
              You have a Chemistry exam in 2 days. Want me to schedule 3 revision sessions and add practice papers from the library?
            </p>
            <Button size="sm" className="bg-brand text-primary-foreground hover:opacity-90 h-7 text-[11px]">Plan it</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
