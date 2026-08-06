import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

/**
 * First-run prompt: asks people (especially Google / Apple sign-ups, who never
 * typed a name) what display name + handle they want to use on ClassLab.
 */
export function DisplayNamePrompt() {
  const { user } = useAuth();
  const [show, setShow] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("username, display_name")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      const p = data as { username?: string | null; display_name?: string | null } | null;
      if (p?.username) return; // already chose a handle
      const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
      const suggested =
        p?.display_name ||
        (meta["full_name"] as string) ||
        (meta["name"] as string) ||
        (meta["display_name"] as string) ||
        user.email?.split("@")[0] ||
        "";
      setDisplayName(suggested);
      setUsername(
        (suggested as string).toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20),
      );
      setShow(true);
    })();
    return () => { cancelled = true; };
  }, [user]);

  if (!show || !user) return null;

  const save = async () => {
    const name = displayName.trim();
    const u = username.trim().toLowerCase();
    if (name.length < 2) return toast.error("Pick a display name (2+ characters).");
    if (u && !USERNAME_RE.test(u)) return toast.error("Username must be 3-20 chars: a-z, 0-9, _");
    setSaving(true);
    if (u) {
      const { data: ok } = await supabase.rpc("username_available", { _username: u });
      if (!ok) { setSaving(false); return toast.error("That username is taken — try another."); }
    }
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: name, username: u || null })
      .eq("id", user.id);
    if (!error) await supabase.auth.updateUser({ data: { display_name: name } });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(`Welcome, ${name}!`);
    setShow(false);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="glass rounded-2xl p-6 w-full max-w-md space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="text-lg font-semibold">What should we call you?</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          This is the name other students see on your posts, chats and leaderboards.
        </p>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Display name</Label>
            <Input
              value={displayName}
              autoFocus
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Alex Sharma"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Username (handle)</Label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase())}
              placeholder="alex_cat26"
            />
            <p className="text-[11px] text-muted-foreground">People can @mention you with this.</p>
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={save} disabled={saving} className="w-full sm:w-auto">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continue"}
          </Button>
        </div>
      </div>
    </div>
  );
}
