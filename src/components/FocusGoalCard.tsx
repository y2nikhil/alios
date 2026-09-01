import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, Pencil, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useDailyStats } from "@/lib/use-daily-stats";
import { formatShortDuration } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { HelpTip } from "@/components/HelpTip";

function labelFor(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

export function FocusGoalCard() {
  const { user } = useAuth();
  const stats = useDailyStats();
  const [goalMin, setGoalMin] = useState(480);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("8");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("daily_focus_goal_minutes")
        .eq("id", user.id)
        .maybeSingle();
      const v = (data as any)?.daily_focus_goal_minutes;
      if (typeof v === "number" && v > 0) {
        setGoalMin(v);
        setDraft(String(v / 60));
      }
    })();
  }, [user]);

  const save = async () => {
    const hours = Number(draft);
    if (!Number.isFinite(hours) || hours <= 0 || hours > 24) {
      return toast.error("Enter a goal between 0.5 and 24 hours");
    }
    const minutes = Math.round(hours * 60);
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ daily_focus_goal_minutes: minutes } as any)
      .eq("id", user!.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    setGoalMin(minutes);
    setEditing(false);
    toast.success(`Daily focus goal set to ${labelFor(minutes)}`);
  };

  const pct = Math.min(100, Math.round((stats.productiveSeconds / (goalMin * 60)) * 100));

  return (
    <div className="glass rounded-3xl p-5">
      <div className="flex items-start justify-between">
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">Today's Focus<HelpTip title="Today's Focus">Productive AUX time you have logged today against your daily goal. Click the pencil to change the goal.</HelpTip></p>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="text-muted-foreground hover:text-foreground transition"
            aria-label="Edit daily focus goal"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <p className="mt-1 text-3xl font-bold text-gradient">{pct}%</p>
      <div className="mt-3 h-1.5 rounded-full bg-white/5 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="h-full bg-gradient-to-r from-violet-500 to-cyan-400"
        />
      </div>

      {editing ? (
        <div className="mt-3 flex items-center gap-2">
          <Input
            type="number"
            min={0.5}
            max={24}
            step={0.5}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="h-8 w-20 text-xs"
            aria-label="Daily focus goal in hours"
          />
          <span className="text-[11px] text-muted-foreground">hours / day</span>
          <button
            onClick={save}
            disabled={saving}
            className="ml-auto rounded-md border border-white/10 p-1.5 hover:bg-white/5"
            aria-label="Save goal"
          >
            <Check className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => { setEditing(false); setDraft(String(goalMin / 60)); }}
            className="rounded-md border border-white/10 p-1.5 hover:bg-white/5"
            aria-label="Cancel"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <p className="mt-2 text-[11px] text-muted-foreground tabular-nums">
          {formatShortDuration(stats.productiveSeconds)} / {labelFor(goalMin)}
        </p>
      )}
    </div>
  );
}
