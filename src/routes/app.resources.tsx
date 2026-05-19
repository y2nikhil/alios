import { createFileRoute } from "@tanstack/react-router";
import { Search, Upload, FileText, Layout, Video, ChartBar, Sparkles, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useState } from "react";

export const Route = createFileRoute("/app/resources")({
  head: () => ({ meta: [{ title: "Resources — ALIOS" }] }),
  component: Resources,
});

const TYPES = ["All types", "📄 Notes", "🃏 Flashcards", "🎥 Videos", "📊 Practice sets", "🧪 Past papers"];

function Resources() {
  const [filter, setFilter] = useState("All types");
  return (
    <div className="mx-auto max-w-7xl p-4 lg:p-6 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[18px] font-semibold tracking-tight">Resources</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Shared notes, PDFs, flashcards and practice sets.</p>
        </div>
        <Button size="sm" className="bg-brand text-primary-foreground hover:opacity-90 h-8"><Upload className="h-3.5 w-3.5 mr-1" />Upload</Button>
      </div>

      <div className="flex items-center gap-2 surface-2 border-soft rounded-md px-3 h-9">
        <Search className="h-3.5 w-3.5 text-muted-foreground" />
        <Input className="border-0 h-7 px-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-[13px]" placeholder="Search notes, PDFs, videos, flashcards…" />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {TYPES.map((t) => (
          <button key={t} onClick={() => setFilter(t)}
            className={cn("rounded-full px-3 py-1 text-[11px] border-[0.5px]",
              filter === t ? "bg-brand-soft border-brand text-brand-ink" : "surface-2 border-border text-muted-foreground hover:text-foreground")}>
            {t}
          </button>
        ))}
      </div>

      <div className="card-flat p-4 bg-brand-soft border-brand/40">
        <p className="text-[11px] font-semibold text-brand flex items-center gap-1 mb-2"><Star className="h-3 w-3" /> Trending this week</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <ResItem icon={FileText} bg="bg-brand-soft" color="text-brand" name="Integration formula sheet" sub="PDF · 2 pages · ⭐ 4.9" />
          <ResItem icon={Layout} bg="bg-teal-soft" color="text-teal-ink" name="Organic reactions deck" sub="120 flashcards · ⭐ 4.8" />
        </div>
      </div>

      <p className="text-[13px] font-medium pt-2">All resources</p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <ResItem icon={Video} bg="bg-blue-soft" color="text-blue-ink" name="Thermodynamics playlist" sub="Video series · 6 parts" />
        <ResItem icon={FileText} bg="bg-amber-soft" color="text-amber-ink" name="Newton's laws notes" sub="PDF · 8 pages · ⭐ 4.7" />
        <ResItem icon={ChartBar} bg="bg-teal-soft" color="text-teal-ink" name="Statistics practice set" sub="50 questions · 3 levels" />
        <ResItem icon={Layout} bg="bg-coral-soft" color="text-coral-ink" name="History timeline cards" sub="84 flashcards · shared" />
        <ResItem icon={FileText} bg="bg-coral-soft" color="text-coral-ink" name="English grammar guide" sub="PDF · 12 pages · editable" />
        <ResItem icon={FileText} bg="bg-brand-soft" color="text-brand" name="Python basics cheatsheet" sub="Interactive · updated 2d ago" />
      </div>

      <div className="surface-2 rounded-md p-3 flex gap-2.5 items-center border-soft">
        <Sparkles className="h-4 w-4 text-brand" />
        <p className="flex-1 text-[12px]">
          <span className="font-medium">AI recommendation · </span>
          <span className="text-muted-foreground">Based on your focus sessions, you might need </span>
          <span className="text-brand">Organic Chemistry reaction maps</span>
        </p>
        <Button variant="outline" size="sm" className="h-7 text-[11px]">Show me</Button>
      </div>
    </div>
  );
}

function ResItem({ icon: Icon, bg, color, name, sub }: { icon: typeof FileText; bg: string; color: string; name: string; sub: string }) {
  return (
    <button className="card-flat surface-2 p-2.5 flex items-center gap-2.5 hover:bg-accent/40 text-left transition-colors">
      <span className={cn("h-8 w-8 rounded-md flex items-center justify-center", bg)}>
        <Icon className={cn("h-4 w-4", color)} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[12px] font-medium truncate">{name}</span>
        <span className="block text-[10px] text-muted-foreground truncate">{sub}</span>
      </span>
    </button>
  );
}
