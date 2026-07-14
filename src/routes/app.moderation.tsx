import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useRole } from "@/lib/use-role";
import { Loader2, Shield, Check, X, Clock, Ban, VolumeX, AlertTriangle, Flag, Inbox } from "lucide-react";
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
  created_at: string; handler_note?: string | null;
};

type Profile = { id: string; display_name: string | null; username: string | null };

function reasonLabel(r: string) {
  const map: Record<string, string> = {
    harassment: "Harassment", nsfw: "NSFW", hate: "Hate", spam: "Spam",
    self_harm: "Self-harm", other: "Other",
  };
  return map[r] ?? r;
}

// Fetch the actual reported content for context in the moderation card.
async function fetchTargetPreviews(reports: Report[]): Promise<Record<string, string>> {
  const grouped: Record<string, string[]> = {};
  for (const r of reports) {
    if (!grouped[r.target_type]) grouped[r.target_type] = [];
    grouped[r.target_type].push(r.target_id);
  }
  const out: Record<string, string> = {};
  await Promise.all(Object.entries(grouped).map(async ([type, ids]) => {
    const uniq = Array.from(new Set(ids));
    if (type === "chat_message") {
      const { data } = await supabase.from("chat_messages").select("id, body, kind").in("id", uniq);
      (data ?? []).forEach((m: any) => { out[m.id] = m.body ?? `[${m.kind}]`; });
    } else if (type === "dm_message") {
      const { data } = await supabase.from("dm_messages").select("id, body, kind").in("id", uniq);
      (data ?? []).forEach((m: any) => { out[m.id] = m.body ?? `[${m.kind}]`; });
    } else if (type === "party_message") {
      const { data } = await supabase.from("watch_party_messages").select("id, body").in("id", uniq);
      (data ?? []).forEach((m: any) => { out[m.id] = m.body ?? ""; });
    } else if (type === "note") {
      const { data } = await supabase.from("manager_notes").select("id, body").in("id", uniq);
      (data ?? []).forEach((m: any) => { out[m.id] = m.body ?? ""; });
    }
  }));
  return out;
}

function ModerationPage() {
  const { user, loading } = useAuth();
  const { isAdmin, isSuperAdmin, loading: rlLoading } = useRole();
  const nav = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [tab, setTab] = useState<"open" | "actioned" | "dismissed" | "mine">("open");
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) nav({ to: "/login" });
  }, [user, loading, nav]);

  // Force non-admins onto the "mine" tab automatically (no silent redirect).
  useEffect(() => {
    if (!rlLoading && !isAdmin && tab !== "mine") setTab("mine");
  }, [isAdmin, rlLoading, tab]);

  const load = useCallback(async () => {
    if (!user) return;
    setFetching(true);
    let q = (supabase.from("reports") as any).select("*").order("created_at", { ascending: false }).limit(200);
    if (tab === "mine") q = q.eq("reporter_id", user.id);
    else q = q.eq("status", tab);
    const { data } = await q;
    const rows = (data ?? []) as Report[];
    setReports(rows);
    const ids = Array.from(new Set(rows.flatMap((r) => [r.reporter_id, r.target_user_id]).filter(Boolean))) as string[];
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, display_name, username").in("id", ids);
      const map: Record<string, Profile> = {};
      (profs ?? []).forEach((p: any) => { map[p.id] = p; });
      setProfiles(map);
    } else {
      setProfiles({});
    }
    setPreviews(await fetchTargetPreviews(rows));
    setFetching(false);
  }, [tab, user]);

  useEffect(() => { if (user && !rlLoading) load(); }, [user, rlLoading, load]);

  const dismiss = async (id: string) => {
    setBusy(id);
    const { error } = await (supabase.from("reports") as any).update({
      status: "dismissed", handled_by: user?.id, handled_at: new Date().toISOString(),
    }).eq("id", id);
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    load();
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

  if (loading || rlLoading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  const tabs: { key: typeof tab; label: string; adminOnly?: boolean }[] = [
    { key: "open", label: "Open", adminOnly: true },
    { key: "actioned", label: "Actioned", adminOnly: true },
    { key: "dismissed", label: "Dismissed", adminOnly: true },
    { key: "mine", label: "My reports" },
  ];

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 grid place-items-center">
          <Shield className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Moderation</h1>
          <p className="text-sm text-muted-foreground">
            {isAdmin
              ? "Review reports and take action."
              : "Track reports you've submitted. A moderator will review each one."}
          </p>
        </div>
      </div>

      <div className="flex gap-1 mb-4 border-b border-white/10 flex-wrap">
        {tabs.filter((t) => !t.adminOnly || isAdmin).map((t) => (
          <button key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition ${
              tab === t.key ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >{t.label}</button>
        ))}
      </div>

      {fetching ? (
        <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : reports.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 p-10 text-center text-sm text-muted-foreground">
          <Inbox className="h-8 w-8 mx-auto mb-2 opacity-60" />
          {tab === "mine" ? "You haven't filed any reports yet." : "Nothing in this queue."}
        </div>
      ) : (
        <ul className="space-y-3">
          {reports.map((r) => {
            const reporter = profiles[r.reporter_id];
            const target = r.target_user_id ? profiles[r.target_user_id] : null;
            const preview = previews[r.target_id];
            return (
              <li key={r.id} className="rounded-xl border border-white/10 bg-card/40 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="rounded-md bg-red-500/15 text-red-300 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider inline-flex items-center gap-1">
                        <Flag className="h-3 w-3" /> {reasonLabel(r.reason)}
                      </span>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{r.target_type.replace("_", " ")}</span>
                      <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/5 text-muted-foreground">{r.status}</span>
                      <span className="text-xs text-muted-foreground">· {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</span>
                    </div>
                    <p className="text-sm">
                      <span className="text-muted-foreground">Reporter: </span>
                      {reporter?.display_name ?? reporter?.username ?? "Unknown"}
                      {target && (<>
                        <span className="text-muted-foreground"> · Target: </span>
                        {target.display_name ?? target.username ?? "Unknown"}
                      </>)}
                    </p>
                    {preview !== undefined && (
                      <div className="mt-2 rounded-lg border border-white/10 bg-black/20 p-2.5">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Reported content</p>
                        <p className="text-sm whitespace-pre-wrap line-clamp-4">
                          {preview || <span className="italic text-muted-foreground">[empty / attachment]</span>}
                        </p>
                      </div>
                    )}
                    {r.details && <p className="mt-2 text-sm text-foreground/90 whitespace-pre-wrap"><span className="text-muted-foreground">Reporter note: </span>{r.details}</p>}
                    {r.handler_note && <p className="mt-1 text-xs text-muted-foreground">Handler note: {r.handler_note}</p>}
                  </div>
                  {isAdmin && tab === "open" && (
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
                  {(!isAdmin || tab !== "open") && (
                    <span className="text-xs text-muted-foreground inline-flex items-center gap-1 shrink-0">
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
