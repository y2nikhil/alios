import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAux, type AuxStatus } from "@/lib/aux-store";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Pencil, AtSign, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AppearancePanel } from "@/components/AppearancePanel";
import { AwardsShelf } from "@/components/AwardsShelf";

export const Route = createFileRoute("/app/settings")({
  head: () => ({
    meta: [
      { title: "Settings — ALIOS" },
      { name: "description", content: "Manage AUX statuses, goals, and preferences." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = useAuth();
  const { statuses, createStatus, updateStatus, deleteStatus } = useAux();
  const [editing, setEditing] = useState<AuxStatus | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-4xl mx-auto glide-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Tune your profile, statuses, and shortcuts.</p>
      </div>

      <ProfileBlock />
      <AppearancePanel />
      <AwardsShelf userId={user?.id} />
      <PrivacyBlock />




      <div className="glass rounded-2xl">
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <div>
            <h3 className="font-semibold">AUX Statuses</h3>
            <p className="text-xs text-muted-foreground">Customize names, colors, and shortcuts.</p>
          </div>
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" /> New
          </Button>
        </div>
        <div className="divide-y divide-white/5">
          {statuses.map((s) => (
            <div key={s.id} className="flex items-center gap-3 p-3">
              <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{s.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{s.category} · {s.is_paid ? "paid" : "unpaid"}</p>
              </div>
              {s.shortcut_key && (
                <kbd className="hidden sm:inline-flex h-6 min-w-6 items-center justify-center rounded border border-white/10 bg-white/5 px-1.5 text-xs font-mono">
                  {s.shortcut_key}
                </kbd>
              )}
              <Button size="icon" variant="ghost" onClick={() => setEditing(s)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => deleteStatus(s.id)} className="text-destructive hover:text-destructive">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {(editing || creating) && (
        <StatusEditor
          status={editing}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSave={async (data) => {
            if (editing) await updateStatus(editing.id, data);
            else await createStatus(data);
            setEditing(null); setCreating(false);
          }}
        />
      )}
    </div>
  );
}

function StatusEditor({ status, onSave, onClose }: { status: AuxStatus | null; onSave: (s: Partial<AuxStatus>) => Promise<void>; onClose: () => void }) {
  const [name, setName] = useState(status?.name ?? "");
  const [color, setColor] = useState(status?.color ?? "#10b981");
  const [category, setCategory] = useState(status?.category ?? "neutral");
  const [isPaid, setIsPaid] = useState(status?.is_paid ?? true);
  const [shortcut, setShortcut] = useState(status?.shortcut_key ?? "");

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="glass rounded-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold">{status ? "Edit status" : "New status"}</h3>
        <div className="mt-4 space-y-3">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Color</Label>
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-full h-10 rounded-md bg-white/5 border border-white/10 cursor-pointer" />
            </div>
            <div className="space-y-1.5">
              <Label>Shortcut (1-9)</Label>
              <Input value={shortcut} onChange={(e) => setShortcut(e.target.value.slice(0,1))} maxLength={1} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <div className="flex gap-2">
              {(["productive", "neutral", "unproductive"] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`flex-1 px-3 py-1.5 text-xs rounded-md border ${category === c ? "border-primary bg-primary/20" : "border-white/10 bg-white/5"}`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isPaid} onChange={(e) => setIsPaid(e.target.checked)} className="accent-primary" />
            Paid time
          </label>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={() => onSave({ name, color, category, is_paid: isPaid, shortcut_key: shortcut || null })}>
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

function ProfileBlock() {
  const { user } = useAuth();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("username, display_name").eq("id", user.id).maybeSingle().then(({ data }) => {
      const d = data as { username?: string; display_name?: string } | null;
      setUsername(d?.username ?? "");
      setDisplayName(d?.display_name ?? "");
      setLoading(false);
    });
  }, [user]);

  const save = async () => {
    if (!user) return;
    const u = username.trim().toLowerCase();
    if (u && !USERNAME_RE.test(u)) return toast.error("Username must be 3-20 chars: a-z, 0-9, _");
    setSaving(true);
    if (u) {
      const { data: ok } = await supabase.rpc("username_available", { _username: u });
      // allow keeping own username
      const { data: current } = await supabase.from("profiles").select("username").eq("id", user.id).maybeSingle();
      const isMine = (current as { username?: string } | null)?.username === u;
      if (!ok && !isMine) { setSaving(false); return toast.error("That username is taken."); }
    }
    const { error } = await supabase.from("profiles").update({
      username: u || null,
      display_name: displayName.trim() || null,
    }).eq("id", user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Profile updated");
  };

  if (loading) return null;

  return (
    <div className="glass rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <AtSign className="h-4 w-4 text-violet-400" />
        <h3 className="font-semibold">Your profile</h3>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Display name</Label>
          <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Alex" />
        </div>
        <div className="space-y-1.5">
          <Label>Username</Label>
          <Input value={username} onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase())} placeholder="alex_codes" />
          <p className="text-[11px] text-muted-foreground">Used to sign in. {user?.email}</p>
        </div>
      </div>
      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} size="sm" className="bg-gradient-to-r from-violet-500 to-cyan-400">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Check className="h-3.5 w-3.5 mr-1.5" /> Save</>}
        </Button>
      </div>
    </div>
  );
}

type Visibility = "public" | "friends" | "private";
function PrivacyBlock() {
  const { user } = useAuth();
  const [vis, setVis] = useState<Visibility>("public");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    (supabase.from("profiles") as any)
      .select("timeline_visibility")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }: any) => {
        setVis((data?.timeline_visibility as Visibility) ?? "public");
        setLoading(false);
      });
  }, [user]);

  const save = async (v: Visibility) => {
    if (!user) return;
    setVis(v);
    setSaving(true);
    const { error } = await (supabase.from("profiles") as any)
      .update({ timeline_visibility: v, timeline_public: v !== "private" })
      .eq("id", user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Privacy updated");
  };

  if (loading) return null;
  const opts: { v: Visibility; title: string; desc: string }[] = [
    { v: "public", title: "Public 🌍", desc: "Anyone with the link can see your timeline." },
    { v: "friends", title: "Friends only 👥", desc: "Only people you've accepted as friends." },
    { v: "private", title: "Private 🔒", desc: "Only you can view your timeline." },
  ];
  return (
    <div className="glass rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Timeline privacy</h3>
          <p className="text-xs text-muted-foreground">Who can see your activity & profile</p>
        </div>
        {saving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>
      <div className="grid sm:grid-cols-3 gap-2">
        {opts.map((o) => (
          <button
            key={o.v}
            onClick={() => save(o.v)}
            className={`text-left rounded-xl p-3 border transition ${vis === o.v ? "border-violet-400 bg-violet-500/10" : "border-white/10 bg-white/5 hover:bg-white/10"}`}
          >
            <p className="text-sm font-semibold">{o.title}</p>
            <p className="text-xs text-muted-foreground mt-1">{o.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}


