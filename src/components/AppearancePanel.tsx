import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { GRADIENTS, ACCENT_TOKENS, ICON_CHOICES, AvatarIconRender } from "@/components/AvatarIcon";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Palette, Sparkles } from "lucide-react";
import * as Icons from "lucide-react";

export function AppearancePanel() {
  const { user } = useAuth();
  const [icon, setIcon] = useState<string>("Sparkles");
  const [gradient, setGradient] = useState<string>("violet");
  const [accent, setAccent] = useState<string>("violet");
  const [saving, setSaving] = useState(false);
  const [initial, setInitial] = useState<string>("?");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("profiles")
        .select("display_name, username, avatar_icon, avatar_gradient, theme_accent")
        .eq("id", user.id).maybeSingle();
      const p = data as any;
      if (p) {
        setIcon(p.avatar_icon ?? "Sparkles");
        setGradient(p.avatar_gradient ?? "violet");
        setAccent(p.theme_accent ?? "violet");
        setInitial((p.display_name?.[0] ?? p.username?.[0] ?? user.email?.[0] ?? "?").toUpperCase());
      }
    })();
  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles")
      .update({ avatar_icon: icon, avatar_gradient: gradient, theme_accent: accent } as any)
      .eq("id", user.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Look updated");
  };

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Palette className="h-4 w-4 text-violet-400" />
        <h3 className="font-semibold text-sm">Appearance</h3>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <AvatarIconRender
          icon={icon} gradient={gradient} initial={initial}
          className="h-20 w-20 rounded-2xl grid place-items-center shadow-lg"
        />
        <div>
          <p className="text-sm font-medium">Live preview</p>
          <p className="text-xs text-muted-foreground">Shown everywhere your name appears.</p>
        </div>
      </div>

      <div className="space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Gradient</p>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {Object.entries(GRADIENTS).map(([key, val]) => (
              <button key={key} onClick={() => setGradient(key)}
                className={`h-10 rounded-lg border-2 transition ${gradient === key ? "border-white scale-110" : "border-white/10 hover:border-white/30"}`}
                style={{ background: val }} title={key}
              />
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Accent color</p>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {Object.entries(ACCENT_TOKENS).map(([key, color]) => (
              <button key={key} onClick={() => setAccent(key)}
                className={`h-8 rounded-lg border-2 transition ${accent === key ? "border-white scale-110" : "border-white/10 hover:border-white/30"}`}
                style={{ backgroundColor: color }} title={key}
              />
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Icon</p>
          <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5">
            <button onClick={() => setIcon("")}
              className={`h-10 grid place-items-center rounded-lg border transition text-xs font-bold ${icon === "" ? "border-primary bg-primary/10" : "border-white/10 hover:border-white/30"}`}>
              {initial}
            </button>
            {ICON_CHOICES.map((name) => {
              const Icon = (Icons as any)[name];
              if (!Icon) return null;
              return (
                <button key={name} onClick={() => setIcon(name)}
                  className={`h-10 grid place-items-center rounded-lg border transition ${icon === name ? "border-primary bg-primary/10" : "border-white/10 hover:border-white/30"}`}
                  title={name}
                >
                  <Icon className="h-4 w-4" />
                </button>
              );
            })}
          </div>
        </div>

        <Button onClick={save} disabled={saving} className="w-full sm:w-auto">
          <Sparkles className="h-4 w-4 mr-1.5" /> {saving ? "Saving…" : "Save look"}
        </Button>
      </div>
    </div>
  );
}
