import { createFileRoute, Link } from "@tanstack/react-router";
import { Users, Plus, Search, Radio, CalendarClock, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useState } from "react";

export const Route = createFileRoute("/app/rooms")({
  head: () => ({ meta: [{ title: "Study Rooms — ALIOS" }] }),
  component: StudyRooms,
});

const SUBJECTS = ["All", "Maths", "Physics", "Chemistry", "Biology", "Computer Sci", "History", "English", "Chill Zone 🎵"];

function StudyRooms() {
  const [tab, setTab] = useState("All rooms");
  const [filter, setFilter] = useState("All");

  return (
    <div className="mx-auto max-w-7xl p-4 lg:p-6 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[18px] font-semibold tracking-tight">Study Rooms</h1>
          <p className="text-xs text-muted-foreground mt-0.5">31 students studying right now</p>
        </div>
        <div className="flex items-center gap-2">
          <PillTabs value={tab} onChange={setTab} options={["All rooms", "My subjects", "Friends"]} />
          <Link to="/app/rooms/new">
            <Button size="sm" className="bg-brand text-primary-foreground hover:opacity-90 h-8">
              <Plus className="h-3.5 w-3.5 mr-1" />Create Room
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-2 surface-2 border-soft rounded-md px-3 h-9">
        <Search className="h-3.5 w-3.5 text-muted-foreground" />
        <Input className="border-0 h-7 px-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-[13px]" placeholder="Search rooms by subject, topic or name…" />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {SUBJECTS.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={cn(
              "rounded-full px-3 py-1 text-[11px] border-[0.5px] transition-colors",
              filter === s ? "bg-brand-soft border-brand text-brand-ink" : "surface-2 border-border text-muted-foreground hover:text-foreground",
            )}
          >{s}</button>
        ))}
      </div>

      <Section title="Live now" icon={<Radio className="h-3.5 w-3.5 text-[oklch(0.6_0.22_25)]" />}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Room live title="📐 JEE Maths" subtitle="Integration & Differentiation" people="8 students · Priya hosting" tag="Live" tone="tag-teal" />
          <Room title="💻 DSA Practice" subtitle="Trees, Graphs, DP" people="5 students · open room" tag="Active" tone="tag-amber" />
          <Room title="🎵 Chill & Study" subtitle="Lo-fi music · silent room" people="14 students · no mic" tag="Vibes" tone="tag-brand" />
        </div>
      </Section>

      <Section title="Scheduled today" icon={<CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Upcoming title="🧬 NEET Biology" time="Starts 6:00 PM" count="3 registered" />
          <Upcoming title="📖 English Essay" time="Starts 7:30 PM" count="6 registered" />
          <Upcoming title="⚗️ Chem Doubts" time="Starts 9:00 PM" count="2 registered" />
        </div>
      </Section>

      <Section title="Watch parties" icon={<Video className="h-3.5 w-3.5 text-muted-foreground" />}>
        <p className="text-xs text-muted-foreground mb-3">Watch a lecture together or jam on a mind map. Synced playback + live cursors.</p>
        <Link to="/app/collaborate">
          <Button variant="outline" size="sm">Open watch parties →</Button>
        </Link>
      </Section>
    </div>
  );
}

function PillTabs({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div className="flex gap-0.5 surface-2 border-soft rounded-md p-0.5">
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={cn("px-2.5 py-1 rounded text-[11px] transition-colors",
            value === o ? "bg-background text-foreground border-soft font-medium" : "text-muted-foreground hover:text-foreground")}
        >{o}</button>
      ))}
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-center gap-1.5 text-[13px] font-medium mb-2">{icon}{title}</div>
      {children}
    </section>
  );
}

function Room({ live, title, subtitle, people, tag, tone }: { live?: boolean; title: string; subtitle: string; people: string; tag: string; tone: string }) {
  return (
    <div className={cn("card-flat p-3", live && "border-[oklch(0.7_0.1_165)] bg-teal-soft/40")}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[13px] font-medium">{title}</p>
        <span className={cn("tag shrink-0", tone)}>{tag}</span>
      </div>
      <p className="text-[11px] text-muted-foreground mt-1">{subtitle}</p>
      <p className="text-[10px] text-muted-foreground mt-2">{people}</p>
      <Button size="sm" className={cn("w-full mt-2.5 h-7 text-[11px]", live ? "bg-brand text-primary-foreground hover:opacity-90" : "")}
        variant={live ? "default" : "outline"}>Join Room</Button>
    </div>
  );
}

function Upcoming({ title, time, count }: { title: string; time: string; count: string }) {
  return (
    <div className="card-flat p-3 opacity-90">
      <p className="text-[13px] font-medium">{title}</p>
      <p className="text-[11px] text-muted-foreground mt-1">{time}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5">{count}</p>
      <Button size="sm" variant="outline" className="mt-2 h-7 text-[11px]">Remind me</Button>
    </div>
  );
}
