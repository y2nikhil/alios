import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Flag } from "lucide-react";

const REASONS: { value: string; label: string; hint: string }[] = [
  { value: "harassment", label: "Harassment or bullying", hint: "Targeted attacks, threats, insults" },
  { value: "nsfw", label: "NSFW / sexual content", hint: "Explicit imagery or text" },
  { value: "hate", label: "Hate speech", hint: "Based on identity, race, religion" },
  { value: "self_harm", label: "Self-harm", hint: "Encouraging or glorifying self-harm" },
  { value: "spam", label: "Spam", hint: "Repetitive, unwanted content" },
  { value: "other", label: "Something else", hint: "" },
];

export type ReportTargetType = "chat_message" | "dm_message" | "user" | "party_message" | "note";

export function ReportButton({
  targetType, targetId, targetUserId, size = "sm", label = "Report",
}: {
  targetType: ReportTargetType;
  targetId: string;
  targetUserId?: string | null;
  size?: "sm" | "xs";
  label?: string;
}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("harassment");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!user) { toast.error("Sign in to report"); return; }
    setBusy(true);
    const { error } = await (supabase.from("reports") as any).insert({
      reporter_id: user.id,
      target_type: targetType,
      target_id: targetId,
      target_user_id: targetUserId ?? null,
      reason, details: details.trim() || null,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Thanks — a moderator will review this");
    setOpen(false); setDetails(""); setReason("harassment");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className={`inline-flex items-center gap-1 rounded-md text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition ${
            size === "xs" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-xs"
          }`}
          title="Report"
        >
          <Flag className={size === "xs" ? "h-3 w-3" : "h-3.5 w-3.5"} />
          {label}
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report content</DialogTitle>
          <DialogDescription>
            Reports go to admins & super-admins. Abuse of the report system may result in a warning.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label className="mb-2 block">Reason</Label>
            <RadioGroup value={reason} onValueChange={setReason} className="space-y-1.5">
              {REASONS.map((r) => (
                <label key={r.value} className="flex items-start gap-2 rounded-lg border border-white/10 p-2.5 hover:bg-white/5 cursor-pointer">
                  <RadioGroupItem value={r.value} id={`r-${r.value}`} className="mt-0.5" />
                  <div>
                    <div className="text-sm font-medium">{r.label}</div>
                    {r.hint && <div className="text-xs text-muted-foreground">{r.hint}</div>}
                  </div>
                </label>
              ))}
            </RadioGroup>
          </div>
          <div>
            <Label htmlFor="details" className="mb-2 block">Details (optional)</Label>
            <Textarea
              id="details" value={details} onChange={(e) => setDetails(e.target.value)}
              placeholder="Anything a moderator should know…" maxLength={500}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>{busy ? "Sending…" : "Submit report"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
