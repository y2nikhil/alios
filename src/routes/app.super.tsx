import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { Crown, Check, X, Shield, Users, Clock, UserX, History, Network, ListChecks } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/app/super")({
  beforeLoad: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw redirect({ to: "/login" });
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id);
    if (!roles?.some((r) => r.role === "super_admin")) {
      throw redirect({ to: "/app" });
    }
  },
  head: () => ({
    meta: [{ title: "Super Admin — ALIOS" }],
  }),
  component: SuperAdminPanel,
});

type AdminRequest = {
  id: string;
  user_id: string;
  reason: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  reviewed_at: string | null;
  email?: string;
};

type RoleRow = {
  user_id: string;
  role: "super_admin" | "admin" | "member";
  email?: string;
};

type TimeOff = {
  id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: "pending" | "approved" | "rejected";
  email?: string;
};

type AccountEvent = { id: string; user_id: string; email: string | null; event_type: string; created_at: string; username?: string | null; display_name?: string | null };
type AuditRow = { id: string; actor_id: string | null; action: string; target_user_id: string | null; created_at: string; metadata: Record<string, unknown>; actor_email?: string; target_email?: string };

function SuperAdminPanel() {
  const [requests, setRequests] = useState<AdminRequest[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [timeOff, setTimeOff] = useState<TimeOff[]>([]);
  const [accounts, setAccounts] = useState<AccountEvent[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState<AdminRequest | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [auditFilter, setAuditFilter] = useState("");
  const [accountFilter, setAccountFilter] = useState("");

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [reqRes, roleRes, toRes, acctRes, auditRes] = await Promise.all([
      supabase.from("admin_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id,role"),
      supabase.from("time_off_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("account_events").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(200),
    ]);

    const allUserIds = new Set<string>();
    (reqRes.data ?? []).forEach((r) => allUserIds.add(r.user_id));
    (roleRes.data ?? []).forEach((r) => allUserIds.add(r.user_id));
    (toRes.data ?? []).forEach((r) => allUserIds.add(r.user_id));
    (auditRes.data ?? []).forEach((r) => {
      if (r.actor_id) allUserIds.add(r.actor_id);
      if (r.target_user_id) allUserIds.add(r.target_user_id);
    });

    const emails = new Map<string, string>();
    await Promise.all(
      Array.from(allUserIds).map(async (uid) => {
        const { data } = await supabase.rpc("get_user_email", { _user_id: uid });
        if (data) emails.set(uid, data as string);
      }),
    );

    // Pull profile metadata (username/display_name) for everyone we know about
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, username, display_name")
      .in("id", Array.from(allUserIds.size ? allUserIds : new Set([""])));
    const profMap = new Map<string, { username: string | null; display_name: string | null }>();
    (profs ?? []).forEach((p) => {
      const row = p as { id: string; username: string | null; display_name: string | null };
      profMap.set(row.id, { username: row.username, display_name: row.display_name });
    });

    setRequests((reqRes.data ?? []).map((r) => ({ ...r, email: emails.get(r.user_id) })));
    setRoles((roleRes.data ?? []).map((r) => ({ ...r, email: emails.get(r.user_id) })));
    setTimeOff((toRes.data ?? []).map((r) => ({ ...r, email: emails.get(r.user_id) })));
    setAccounts(((acctRes.data ?? []) as AccountEvent[]).map((a) => ({
      ...a,
      username: profMap.get(a.user_id)?.username ?? null,
      display_name: profMap.get(a.user_id)?.display_name ?? null,
    })));

    setAudit(((auditRes.data ?? []) as AuditRow[]).map((r) => ({
      ...r,
      actor_email: r.actor_id ? emails.get(r.actor_id) : undefined,
      target_email: r.target_user_id ? emails.get(r.target_user_id) : undefined,
    })));
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAll();
    const ch = supabase
      .channel("super-admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "admin_requests" }, () => loadAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "user_roles" }, () => loadAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "time_off_requests" }, () => loadAll())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "account_events" }, () => loadAll())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "audit_log" }, () => loadAll())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [loadAll]);

  async function approveRequest(req: AdminRequest) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error: e1 } = await supabase
      .from("admin_requests")
      .update({
        status: "approved",
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        review_note: reviewNote || null,
      })
      .eq("id", req.id);
    if (e1) return toast.error(e1.message);
    const { error: e2 } = await supabase
      .from("user_roles")
      .insert({ user_id: req.user_id, role: "admin", granted_by: user.id });
    if (e2 && !e2.message.includes("duplicate")) return toast.error(e2.message);
    await supabase.rpc("write_audit", {
      _action: "admin_request_approved",
      _target_user: req.user_id,
      _target_id: req.id,
      _target_type: "admin_request",
      _metadata: { note: reviewNote || null },
    });
    await supabase.rpc("notify_user", {
      _user_id: req.user_id,
      _type: "request_approved",
      _title: "Admin request approved",
      _body: "You're now an Admin (Client).",
      _link: "/app/admin",
    });
    toast.success(`${req.email ?? "User"} is now an Admin (Client)`);
    setReviewing(null);
    setReviewNote("");
  }

  async function rejectRequest(req: AdminRequest) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from("admin_requests")
      .update({
        status: "rejected",
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        review_note: reviewNote || null,
      })
      .eq("id", req.id);
    if (error) return toast.error(error.message);
    await supabase.rpc("write_audit", {
      _action: "admin_request_rejected",
      _target_user: req.user_id,
      _target_id: req.id,
      _target_type: "admin_request",
      _metadata: { note: reviewNote || null },
    });
    await supabase.rpc("notify_user", {
      _user_id: req.user_id,
      _type: "request_rejected",
      _title: "Admin request rejected",
      _body: reviewNote || "Your request was rejected.",
      _link: "/app",
    });
    toast.success("Request rejected");
    setReviewing(null);
    setReviewNote("");
  }

  async function promoteToSuperAdmin(userId: string, email?: string) {
    if (!confirm(`Promote ${email ?? "this user"} to Super Admin? They will share full master control with you.`)) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from("user_roles")
      .insert({ user_id: userId, role: "super_admin", granted_by: user.id });
    if (error) return toast.error(error.message);
    await supabase.rpc("write_audit", {
      _action: "role_granted",
      _target_user: userId,
      _target_type: "role",
      _metadata: { role: "super_admin" },
    });
    toast.success("Super Admin granted");
  }

  async function revokeRole(userId: string, role: "admin" | "super_admin", email?: string) {
    if (!confirm(`Revoke ${role.replace("_", " ")} from ${email ?? "this user"}?`)) return;
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .eq("role", role);
    if (error) return toast.error(error.message);
    await supabase.rpc("write_audit", {
      _action: "role_revoked",
      _target_user: userId,
      _target_type: "role",
      _metadata: { role },
    });
    toast.success("Role revoked");
  }

  async function reviewTimeOff(id: string, status: "approved" | "rejected", userId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from("time_off_requests")
      .update({ status, reviewed_by: user.id, reviewed_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return toast.error(error.message);
    await supabase.rpc("write_audit", {
      _action: status === "approved" ? "time_off_approved" : "time_off_rejected",
      _target_user: userId,
      _target_id: id,
      _target_type: "time_off",
    });
    await supabase.rpc("notify_user", {
      _user_id: userId,
      _type: status === "approved" ? "request_approved" : "request_rejected",
      _title: `Time off ${status}`,
      _link: "/app",
    });
    toast.success(`Time off ${status}`);
  }

  async function revokeAccount(userId: string, email?: string) {
    if (!confirm(`Revoke ${email ?? "this account"}? They will lose all access immediately.`)) return;
    const { error } = await supabase.rpc("revoke_account", { _user_id: userId });
    if (error) return toast.error(error.message);
    toast.success("Account revoked");
    loadAll();
  }

  async function restoreAccount(userId: string, email?: string) {
    if (!confirm(`Restore ${email ?? "this account"}?`)) return;
    const { error } = await supabase.rpc("restore_account", { _user_id: userId });
    if (error) return toast.error(error.message);
    toast.success("Account restored");
    loadAll();
  }

  const pendingReqs = requests.filter((r) => r.status === "pending");
  const adminUsers = roles.filter((r) => r.role === "admin" || r.role === "super_admin");
  const pendingTimeOff = timeOff.filter((r) => r.status === "pending");

  const filteredAccounts = accountFilter
    ? accounts.filter((a) => {
        const q = accountFilter.toLowerCase();
        return (a.email ?? "").toLowerCase().includes(q)
          || (a.username ?? "").toLowerCase().includes(q)
          || (a.display_name ?? "").toLowerCase().includes(q);
      })
    : accounts;

  const filteredAudit = auditFilter
    ? audit.filter((a) =>
        a.action.toLowerCase().includes(auditFilter.toLowerCase()) ||
        (a.actor_email ?? "").toLowerCase().includes(auditFilter.toLowerCase()) ||
        (a.target_email ?? "").toLowerCase().includes(auditFilter.toLowerCase()),
      )
    : audit;

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-rose-500 shadow-lg shadow-amber-500/30">
            <Crown className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Super Admin Panel</h1>
            <p className="text-sm text-muted-foreground">Master control — approvals, accounts, oversight</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link to="/app/admin"><Button variant="outline" size="sm">Admin Panel</Button></Link>
          <Link to="/app"><Button variant="outline" size="sm">Dashboard</Button></Link>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatBox icon={Shield} label="Pending requests" value={pendingReqs.length} accent="from-amber-500 to-rose-500" />
        <StatBox icon={Users} label="Active admins" value={adminUsers.length} accent="from-violet-500 to-cyan-400" />
        <StatBox icon={Clock} label="Pending time off" value={pendingTimeOff.length} accent="from-emerald-500 to-teal-500" />
        <StatBox icon={Network} label="Total accounts" value={accounts.length} accent="from-blue-500 to-indigo-500" />
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-border bg-background/30 p-4">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Account tracking</p>
          <p className="mt-2 text-sm font-semibold">Live account creation visibility</p>
          <p className="mt-1 text-xs text-muted-foreground">Every signup and account creation event is listed in the Accounts tab below.</p>
        </div>
        <Link to="/app/collaborate" className="rounded-2xl border border-border bg-background/30 p-4 transition-colors hover:bg-accent/25">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Chat workspace</p>
          <p className="mt-2 text-sm font-semibold">Open Collaborate</p>
          <p className="mt-1 text-xs text-muted-foreground">Review the separate team chat section from the main app build.</p>
        </Link>
        <Link to="/app/playlists" className="rounded-2xl border border-border bg-background/30 p-4 transition-colors hover:bg-accent/25">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Training workspace</p>
          <p className="mt-2 text-sm font-semibold">Open Playlist Center</p>
          <p className="mt-1 text-xs text-muted-foreground">Jump into the dedicated playlist and YouTube checklist section.</p>
        </Link>
      </section>

      <Tabs defaultValue="accounts">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="accounts"><Users className="h-3.5 w-3.5 mr-1" />Accounts</TabsTrigger>
          <TabsTrigger value="requests">Requests {pendingReqs.length > 0 && <Badge className="ml-2">{pendingReqs.length}</Badge>}</TabsTrigger>
          <TabsTrigger value="admins">Roles</TabsTrigger>
          <TabsTrigger value="timeoff">Time Off {pendingTimeOff.length > 0 && <Badge className="ml-2">{pendingTimeOff.length}</Badge>}</TabsTrigger>
          <TabsTrigger value="audit"><History className="h-3.5 w-3.5 mr-1" />Activity Log</TabsTrigger>
          <TabsTrigger value="oversight"><ListChecks className="h-3.5 w-3.5 mr-1" />Oversight</TabsTrigger>
        </TabsList>

        <TabsContent value="accounts" className="mt-4">
          <div className="glass rounded-2xl p-4 space-y-3">
            <Input
              placeholder="Filter by email…"
              value={accountFilter}
              onChange={(e) => setAccountFilter(e.target.value)}
              className="max-w-sm"
            />
            <div className="divide-y divide-border">
              {loading && <div className="p-6 text-sm text-muted-foreground">Loading…</div>}
              {!loading && filteredAccounts.length === 0 && (
                <div className="p-6 text-sm text-muted-foreground">No accounts found.</div>
              )}
              {filteredAccounts.map((a) => {
                const role = roles.find((r) => r.user_id === a.user_id);
                const isRevoked = !role; // user_roles wiped on revoke
                return (
                  <div key={a.id} className="py-3 flex items-center gap-3 flex-wrap">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 text-xs font-bold text-white shrink-0">
                      {(a.email?.[0] ?? "?").toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {a.display_name ?? a.email ?? a.user_id.slice(0, 8)}
                        {a.username && <span className="ml-2 text-xs font-normal text-violet-300">@{a.username}</span>}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {a.email} · Joined {new Date(a.created_at).toLocaleString()}
                      </p>
                    </div>

                    {role && <Badge variant={role.role === "super_admin" ? "default" : "secondary"}>{role.role.replace("_", " ")}</Badge>}
                    {isRevoked && <Badge variant="destructive">revoked</Badge>}
                    {isRevoked ? (
                      <Button size="sm" variant="outline" onClick={() => restoreAccount(a.user_id, a.email ?? undefined)}>
                        Restore
                      </Button>
                    ) : (
                      <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => revokeAccount(a.user_id, a.email ?? undefined)}>
                        <UserX className="h-3.5 w-3.5 mr-1" /> Revoke
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="requests" className="mt-4">
          <div className="glass rounded-2xl divide-y divide-border">
            {loading && <div className="p-6 text-sm text-muted-foreground">Loading…</div>}
            {!loading && requests.length === 0 && (
              <div className="p-6 text-sm text-muted-foreground">No admin requests yet.</div>
            )}
            {requests.map((r) => (
              <div key={r.id} className="p-4 flex flex-wrap items-start gap-3 justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{r.email ?? r.user_id.slice(0, 8)}</span>
                    <Badge variant={r.status === "pending" ? "default" : r.status === "approved" ? "secondary" : "destructive"}>
                      {r.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span>
                  </div>
                  {r.reason && <p className="mt-1 text-sm text-muted-foreground">{r.reason}</p>}
                </div>
                {r.status === "pending" && (
                  <Button size="sm" onClick={() => { setReviewing(r); setReviewNote(""); }}>Review</Button>
                )}
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="admins" className="mt-4">
          <div className="glass rounded-2xl divide-y divide-border">
            {adminUsers.length === 0 && <div className="p-6 text-sm text-muted-foreground">Only you (Super Admin) have elevated access.</div>}
            {adminUsers.map((r) => (
              <div key={`${r.user_id}-${r.role}`} className="p-4 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 text-xs font-bold text-white">
                    {(r.email?.[0] ?? "?").toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{r.email ?? r.user_id.slice(0, 8)}</p>
                    <Badge variant={r.role === "super_admin" ? "default" : "secondary"}>
                      {r.role === "super_admin" && <Crown className="h-3 w-3 mr-1" />}
                      {r.role.replace("_", " ")}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  {r.role === "admin" && (
                    <Button size="sm" variant="outline" onClick={() => promoteToSuperAdmin(r.user_id, r.email)}>
                      <Crown className="h-3.5 w-3.5 mr-1" />
                      Make Super Admin
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => revokeRole(r.user_id, r.role as "admin" | "super_admin", r.email)}>
                    Revoke
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="timeoff" className="mt-4">
          <div className="glass rounded-2xl divide-y divide-border">
            {timeOff.length === 0 && <div className="p-6 text-sm text-muted-foreground">No time-off requests.</div>}
            {timeOff.map((r) => (
              <div key={r.id} className="p-4 flex flex-wrap items-start gap-3 justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{r.email ?? r.user_id.slice(0, 8)}</span>
                    <Badge variant={r.status === "pending" ? "default" : r.status === "approved" ? "secondary" : "destructive"}>{r.status}</Badge>
                    <span className="text-xs text-muted-foreground">{r.start_date} → {r.end_date}</span>
                  </div>
                  {r.reason && <p className="mt-1 text-sm text-muted-foreground">{r.reason}</p>}
                </div>
                {r.status === "pending" && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => reviewTimeOff(r.id, "approved", r.user_id)}>
                      <Check className="h-4 w-4 mr-1" /> Approve
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => reviewTimeOff(r.id, "rejected", r.user_id)}>
                      <X className="h-4 w-4 mr-1" /> Reject
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="audit" className="mt-4">
          <div className="glass rounded-2xl p-4 space-y-3">
            <Input
              placeholder="Filter by action or email…"
              value={auditFilter}
              onChange={(e) => setAuditFilter(e.target.value)}
              className="max-w-sm"
            />
            <div className="divide-y divide-border">
              {filteredAudit.length === 0 && <div className="p-6 text-sm text-muted-foreground">No activity logged.</div>}
              {filteredAudit.map((row) => (
                <div key={row.id} className="py-3 flex items-start gap-3 flex-wrap">
                  <span className="text-[10px] text-muted-foreground font-mono pt-1 shrink-0">
                    {new Date(row.created_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">
                      <span className="font-medium">{row.actor_email ?? "system"}</span>{" "}
                      <Badge variant="outline" className="mx-1 text-[10px]">{row.action}</Badge>
                      {row.target_email && <span className="text-muted-foreground">→ {row.target_email}</span>}
                    </p>
                    {Object.keys(row.metadata ?? {}).length > 0 && (
                      <p className="text-[11px] text-muted-foreground mt-0.5 font-mono truncate">
                        {JSON.stringify(row.metadata)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="oversight" className="mt-4">
          <Oversight />
        </TabsContent>
      </Tabs>

      <Dialog open={!!reviewing} onOpenChange={(o) => !o && setReviewing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review admin request</DialogTitle>
          </DialogHeader>
          {reviewing && (
            <div className="space-y-3">
              <p className="text-sm">
                <span className="text-muted-foreground">From:</span> <strong>{reviewing.email}</strong>
              </p>
              {reviewing.reason && <div className="rounded-lg bg-accent/40 p-3 text-sm">{reviewing.reason}</div>}
              <Textarea
                placeholder="Optional review note for the user…"
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                rows={3}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => reviewing && rejectRequest(reviewing)} className="text-destructive">
              Reject
            </Button>
            <Button onClick={() => reviewing && approveRequest(reviewing)}>
              <Check className="h-4 w-4 mr-1" /> Approve as Admin
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Oversight() {
  const [tab, setTab] = useState<"teams" | "tasks" | "boards" | "channels">("teams");
  type T = { id: string; name: string; owner_id: string; created_at: string };
  type K = { id: string; title: string; assigned_to: string | null; assigned_by: string; status: string; team_id: string | null };
  type B = { id: string; title: string; user_id: string; updated_at: string };
  type C = { id: string; team_id: string; name: string };
  const [teams, setTeams] = useState<T[]>([]);
  const [tasks, setTasks] = useState<K[]>([]);
  const [boards, setBoards] = useState<B[]>([]);
  const [channels, setChannels] = useState<C[]>([]);

  useEffect(() => {
    (async () => {
      const [tRes, kRes, bRes, cRes] = await Promise.all([
        supabase.from("teams").select("*").order("created_at", { ascending: false }),
        supabase.from("tasks").select("id,title,assigned_to,assigned_by,status,team_id").order("created_at", { ascending: false }).limit(100),
        supabase.from("mindmap_boards").select("id,title,user_id,updated_at").order("updated_at", { ascending: false }).limit(100),
        supabase.from("chat_channels").select("*").order("created_at", { ascending: false }),
      ]);
      setTeams((tRes.data ?? []) as T[]);
      setTasks((kRes.data ?? []) as K[]);
      setBoards((bRes.data ?? []) as B[]);
      setChannels((cRes.data ?? []) as C[]);
    })();
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        {(["teams", "tasks", "boards", "channels"] as const).map((t) => (
          <Button key={t} size="sm" variant={tab === t ? "default" : "outline"} onClick={() => setTab(t)}>
            {t === "teams" ? `Teams (${teams.length})` :
             t === "tasks" ? `Tasks (${tasks.length})` :
             t === "boards" ? `Mind Maps (${boards.length})` :
             `Channels (${channels.length})`}
          </Button>
        ))}
      </div>
      <div className="glass rounded-2xl divide-y divide-border max-h-[500px] overflow-y-auto scrollbar-thin">
        {tab === "teams" && teams.map((t) => (
          <div key={t.id} className="p-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{t.name}</p>
              <p className="text-[11px] text-muted-foreground">Created {new Date(t.created_at).toLocaleString()}</p>
            </div>
          </div>
        ))}
        {tab === "tasks" && tasks.map((k) => (
          <div key={k.id} className="p-3 flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{k.title}</p>
            </div>
            <Badge variant="outline" className="text-[10px]">{k.status.replace("_", " ")}</Badge>
          </div>
        ))}
        {tab === "boards" && boards.map((b) => (
          <Link key={b.id} to="/app/mindmap/$boardId" params={{ boardId: b.id }} className="p-3 flex items-center justify-between hover:bg-accent/30">
            <p className="text-sm font-medium truncate">{b.title}</p>
            <span className="text-[10px] text-muted-foreground">{new Date(b.updated_at).toLocaleDateString()}</span>
          </Link>
        ))}
        {tab === "channels" && channels.map((c) => (
          <div key={c.id} className="p-3 text-sm font-medium">#{c.name}</div>
        ))}
        {((tab === "teams" && teams.length === 0) ||
          (tab === "tasks" && tasks.length === 0) ||
          (tab === "boards" && boards.length === 0) ||
          (tab === "channels" && channels.length === 0)) && (
          <div className="p-6 text-sm text-muted-foreground">Nothing here yet.</div>
        )}
      </div>
    </div>
  );
}

function StatBox({ icon: Icon, label, value, accent }: { icon: typeof Shield; label: string; value: number; accent: string }) {
  return (
    <div className="glass rounded-2xl p-5 relative overflow-hidden">
      <div className={`absolute -top-8 -right-8 h-24 w-24 rounded-full opacity-20 blur-2xl bg-gradient-to-br ${accent}`} />
      <div className="relative">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />
          {label}
        </div>
        <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>
      </div>
    </div>
  );
}
