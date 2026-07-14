import { useEffect, useState } from "react";
import { Bell, BellOff, Volume2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  SOUND_OPTIONS,
  getStoredSound,
  setStoredSound,
  playNotificationSound,
  type SoundKey,
} from "@/lib/notification-sounds";
import {
  isPushSupported,
  enablePush,
  disablePush,
  getPushPermission,
} from "@/lib/push-client";
import { sendTestPush } from "@/lib/push.functions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

type Prefs = {
  push_enabled: boolean;
  focus_milestone: boolean;
  task_completed: boolean;
  moderation_alert: boolean;
  chat_mention: boolean;
  sound: SoundKey;
};

const DEFAULTS: Prefs = {
  push_enabled: true,
  focus_milestone: true,
  task_completed: true,
  moderation_alert: true,
  chat_mention: true,
  sound: "chime",
};

const CATEGORIES: { key: keyof Prefs; label: string; desc: string }[] = [
  { key: "focus_milestone", label: "Focus milestones", desc: "30 / 60 / 90 minute focus streaks" },
  { key: "task_completed", label: "Task completed", desc: "When a task you own is finished" },
  { key: "chat_mention", label: "Mentions & DMs", desc: "When someone @mentions or messages you" },
  { key: "moderation_alert", label: "Moderation alerts", desc: "New reports (admins & super admins)" },
];

export function NotificationSettings() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<Prefs>({ ...DEFAULTS, sound: getStoredSound() });
  const [pushOn, setPushOn] = useState(false);
  const [perm, setPerm] = useState<NotificationPermission>("default");
  const [busy, setBusy] = useState(false);
  const supported = isPushSupported();

  // Load prefs from profile
  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data } = await supabase.from("profiles").select("notification_prefs").eq("id", user.id).maybeSingle();
      const p = (data?.notification_prefs ?? {}) as Partial<Prefs>;
      setPrefs((prev) => ({ ...prev, ...DEFAULTS, ...p, sound: getStoredSound() }));
    })();
    (async () => {
      setPerm(await getPushPermission());
      if (!supported) return;
      const reg = await navigator.serviceWorker.getRegistration("/push-sw.js");
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      setPushOn(!!sub);
    })();
  }, [user, supported]);

  const savePrefs = async (next: Prefs) => {
    setPrefs(next);
    setStoredSound(next.sound);
    if (!user) return;
    const { push_enabled, focus_milestone, task_completed, moderation_alert, chat_mention } = next;
    await supabase.from("profiles").update({
      notification_prefs: { push_enabled, focus_milestone, task_completed, moderation_alert, chat_mention, sound: next.sound },
    }).eq("id", user.id);
  };

  const togglePush = async () => {
    setBusy(true);
    try {
      if (pushOn) {
        await disablePush();
        setPushOn(false);
        toast.success("Push notifications disabled");
      } else {
        const r = await enablePush();
        if (r.ok) {
          setPushOn(true);
          setPerm("granted");
          toast.success("Push notifications enabled");
        } else if (r.reason === "denied") {
          toast.error("Permission denied — enable notifications in browser settings");
        } else if (r.reason === "unsupported") {
          toast.error("This browser doesn't support Web Push");
        } else {
          toast.error("Couldn't enable push");
        }
      }
    } finally {
      setBusy(false);
    }
  };

  const testIt = async () => {
    playNotificationSound(prefs.sound);
    try {
      await sendTestPush();
      toast.success("Test notification sent");
    } catch {
      toast.error("Failed to send test notification");
    }
  };

  return (
    <div className="glass rounded-2xl p-4 space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400 shadow-lg shadow-violet-500/30 shrink-0">
          <Bell className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold">Notifications</h3>
          <p className="text-xs text-muted-foreground">
            Get pinged for focus milestones, task completions, mentions, and moderation events — on this device and anywhere you've enabled push.
          </p>
        </div>
      </div>

      {/* Push toggle */}
      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Browser push notifications</p>
            <p className="text-[11px] text-muted-foreground">
              {!supported
                ? "Not supported on this browser. iOS Safari requires 'Add to Home Screen' first."
                : perm === "denied"
                  ? "Blocked — allow notifications in your browser settings."
                  : pushOn
                    ? "Enabled — you'll get pushes even when this tab is closed."
                    : "Turn on to receive notifications even when the app is closed."}
            </p>
          </div>
          <Button size="sm" onClick={togglePush} disabled={busy || !supported || perm === "denied"}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : pushOn ? <><BellOff className="h-3.5 w-3.5 mr-1" />Disable</> : <><Bell className="h-3.5 w-3.5 mr-1" />Enable</>}
          </Button>
        </div>
      </div>

      {/* Sound picker */}
      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 space-y-2">
        <div className="flex items-center gap-2">
          <Volume2 className="h-3.5 w-3.5 text-muted-foreground" />
          <Label className="text-sm font-medium">Notification sound</Label>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
          {SOUND_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => { savePrefs({ ...prefs, sound: opt.key }); if (opt.key !== "none") playNotificationSound(opt.key); }}
              className={`text-xs rounded-lg px-2 py-2 border transition ${prefs.sound === opt.key ? "border-primary bg-primary/10 text-foreground" : "border-white/5 hover:border-white/20 text-muted-foreground"}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Per-category toggles */}
      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 space-y-3">
        <p className="text-sm font-medium">Notify me about</p>
        {CATEGORIES.map((c) => (
          <label key={c.key} className="flex items-start justify-between gap-3 cursor-pointer">
            <div>
              <p className="text-sm">{c.label}</p>
              <p className="text-[11px] text-muted-foreground">{c.desc}</p>
            </div>
            <Switch
              checked={Boolean(prefs[c.key])}
              onCheckedChange={(v) => savePrefs({ ...prefs, [c.key]: v } as Prefs)}
            />
          </label>
        ))}
      </div>

      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={testIt}>
          Send test notification
        </Button>
      </div>
    </div>
  );
}
