import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useRole } from "@/lib/use-role";
import { Loader2, Shield, Check, X, Clock, Ban, VolumeX, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/app/moderation")({
  component: ModerationPage,
});

type Report = {
  id: string; reporter_id: string;
  target_type: string; target_id: string; target_user_id: string | null;
  reason: string; details: string | null; status: string;
  created_at: string;
};

type Profile = { id: string; display_name: string | null; username: string | null };

function reasonLabel(r: string) {
  const map: Record<string, string> = {
    harassment: "Harassment", nsfw: "NSFW", hate: "Hate", spam: "Spam",
    self_harm: "Self-harm", other: "Other",
  };
  return map[r] ?? r;
}

function ModerationPage() {
  const { user, loading } = useAuth();
  const { isAdmin, isSuperAdmin, loading: rlLoading } = useRole();
  const nav = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [tab, setTab] = useState<"open" | "actioned" | "dismissed">("open");
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (loading || rlLoading) return;
    if (!user) nav({ to: "/login" });
    else if (!isAdmin) nav({ to: "/app" });
  }, [user, loading, isAdmin, rlLoading, nav]);

  const load = async () => {
    setFetching(true);
    const { data } = await (supabase.from("reports") as any)
      .select("*").eq("status", tab).order("created_at", { ascending: false }).limit(200);
    const rows = (data ?? []) as Report[];
    setReports(rows);
    const ids = Array.from(new Set(rows.flatMap((r) => [r.reporter_id, r.target_user_id]).filter(Boolean))) as string[];
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, display_name, username").in("id", ids);
      const map: Record<string, Profile> = {};
      (profs ?? []).forEach((p: any) => { map[p.id] = p; });
      setProfiles(map);
    }
    setFetching(false);
  };

  useEffect(() => { if (isAdmin) load(); /* eslint-disable-next-line */ }, [isAdmin, tab]);

  const dismiss = async (id: string) => {
    setBusy(id);
    await (supabase.from("reports") as any).update({
      status: "dismissed", handled_by: user?.id, handled_at: new Date().toISOString(),
    }).eq("id", id);
    setBusy(null); load();
  };

  const sanction = async (report: Report, kind: "warn" | "mute" | "temp_ban" | "perma_ban", hours?: number) => {
    if (!report.target_user_id) { toast.error("No target user"); return; }
    if (kind === "perma_ban" && !isSuperAdmin) { toast.error("Super-admin only"); return; }
    setBusy(report.id);
    const expires = hours ? new Date(Date.now() + hours * 3600_000).toISOString() : null;
    const { error: sErr } = await (supabase.from("user_sanctions") as any).insert({
      user_id: report.target_user_id, kind, reason: reasonLabel(report.reason),
      issued_by: user?.id, expires_at: expires, report_id: report.id,
    });
    if (sErr) { toast.error(sErr.message); setBusy(null); return; }
    await (supabase.from("reports") as any).update({
      status: "actioned", handled_by: user?.id, handled_at: new Date().toISOString(),
      handler_note: `${kind}${hours ? ` for ${hours}h` : ""}`,
    }).eq("id", report.id);
    toast.success(`${kind.replace("_", " ")} applied`);
    setBusy(null); load();
  };

  if (loading || rlLoading || !isAdmin) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 grid place-items-center">
          <Shield className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Moderation</h1>
          <p className="text-sm text-muted-foreground">Review reports and take action.</p>
        </div>
      </div>

      <div className="flex gap-1 mb-4 border-b border-white/10">
        {(["open", "actioned", "dismissed"] as const).map((t) => (
          <button key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition ${
              tab === t ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >{t}</button>
        ))}
      </div>

      {fetching ? (
        <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : reports.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 p-10 text-center text-sm text-muted-foreground">
          Nothing in this queue.
        </div>
      ) : (
        <ul className="space-y-3">
          {reports.map((r) => {
            const reporter = profiles[r.reporter_id];
            const target = r.target_user_id ? profiles[r.target_user_id] : null;
            return (
              <li key={r.id} className="rounded-xl border border-white/10 bg-card/40 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="rounded-md bg-red-500/15 text-red-300 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                        {reasonLabel(r.reason)}
                      </span>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{r.target_type.replace("_", " ")}</span>
                      <span className="text-xs text-muted-foreground">· {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</span>
                    </div>
                    <p className="text-sm">
                      <span className="text-muted-foreground">Reporter: </span>
                      {reporter?.display_name ?? reporter?.username ?? "Unknown"}
                      {target && (<>
                        <span className="text-muted-foreground"> · Target: </span>
                        {target.display_name ?? target.username}
                      </>)}
                    </p>
                    {r.details && <p className="mt-2 text-sm text-foreground/90 whitespace-pre-wrap">{r.details}</p>}
                  </div>
                  {tab === "open" && (
                    <div className="flex flex-wrap gap-1.5">
                      <Button size="sm" variant="ghost" disabled={busy === r.id} onClick={() => sanction(r, "warn")}>
                        <AlertTriangle className="h-3.5 w-3.5 mr-1" /> Warn
                      </Button>
                      <Button size="sm" variant="ghost" disabled={busy === r.id || !r.target_user_id} onClick={() => sanction(r, "mute", 24)}>
                        <VolumeX className="h-3.5 w-3.5 mr-1" /> Mute 24h
                      </Button>
                      <Button size="sm" variant="ghost" disabled={busy === r.id || !r.target_user_id} onClick={() => sanction(r, "temp_ban", 24)}>
                        <Clock className="h-3.5 w-3.5 mr-1" /> Ban 24h
                      </Button>
                      <Button size="sm" variant="ghost" disabled={busy === r.id || !r.target_user_id} onClick={() => sanction(r, "temp_ban", 24 * 7)}>
                        <Clock className="h-3.5 w-3.5 mr-1" /> Ban 7d
                      </Button>
                      {isSuperAdmin && (
                        <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300"
                          disabled={busy === r.id || !r.target_user_id} onClick={() => sanction(r, "perma_ban")}>
                          <Ban className="h-3.5 w-3.5 mr-1" /> Perma-ban
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" disabled={busy === r.id} onClick={() => dismiss(r.id)}>
                        <X className="h-3.5 w-3.5 mr-1" /> Dismiss
                      </Button>
                    </div>
                  )}
                  {tab !== "open" && (
                    <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                      <Check className="h-3.5 w-3.5" /> {r.status}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
