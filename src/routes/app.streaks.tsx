import { createFileRoute } from "@tanstack/react-router";
import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/streaks")({
  head: () => ({ meta: [{ title: "Streaks — ALIOS" }] }),
  component: StreaksPage,
});

function getDays(): string[] {
  try { return JSON.parse(localStorage.getItem("alios-streak-days") || "[]"); } catch { return []; }
}

function StreaksPage() {
  const days = new Set(getDays());
  const cells: { date: string; level: number }[] = [];
  const today = new Date();
  for (let i = 90; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    cells.push({ date: iso, level: days.has(iso) ? 4 : 0 });
  }

  return (
    <div className="mx-auto max-w-4xl p-4 lg:p-6 space-y-4">
      <div>
        <h1 className="text-[18px] font-semibold tracking-tight flex items-center gap-2">
          <Flame className="h-4 w-4 text-[oklch(0.6_0.22_25)]" />Streaks
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">{days.size} day streak — keep it going.</p>
      </div>

      <div className="card-flat p-5">
        <p className="text-[12px] text-muted-foreground mb-3">Last 90 days</p>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(14px,1fr))] gap-1">
          {cells.map((c) => (
            <div key={c.date} title={c.date}
              className={cn("aspect-square rounded-[3px]",
                c.level === 0 && "surface-3",
                c.level > 0 && "bg-brand")}
              style={c.level > 0 ? { opacity: 0.4 + c.level * 0.15 } : undefined}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
