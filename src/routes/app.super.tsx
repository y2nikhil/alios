import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { Crown, Check, X, Shield, Users, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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

function SuperAdminPanel() {
  const [requests, setRequests] = useState<AdminRequest[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [timeOff, setTimeOff] = useState<TimeOff[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState<AdminRequest | null>(null);
  const [reviewNote, setReviewNote] = useState("");

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [reqRes, roleRes, toRes] = await Promise.all([
      supabase.from("admin_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id,role"),
      supabase.from("time_off_requests").select("*").order("created_at", { ascending: false }),
    ]);

    const allUserIds = new Set<string>();
    (reqRes.data ?? []).forEach((r) => allUserIds.add(r.user_id));
    (roleRes.data ?? []).forEach((r) => allUserIds.add(r.user_id));
    (toRes.data ?? []).forEach((r) => allUserIds.add(r.user_id));

    const emails = new Map<string, string>();
    await Promise.all(
      Array.from(allUserIds).map(async (uid) => {
        const { data } = await supabase.rpc("get_user_email", { _user_id: uid });
        if (data) emails.set(uid, data as string);
      }),
    );

    setRequests((reqRes.data ?? []).map((r) => ({ ...r, email: emails.get(r.user_id) })));
    setRoles((roleRes.data ?? []).map((r) => ({ ...r, email: emails.get(r.user_id) })));
    setTimeOff((toRes.data ?? []).map((r) => ({ ...r, email: emails.get(r.user_id) })));
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAll();
    const ch = supabase
      .channel("super-admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "admin_requests" }, () => loadAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "user_roles" }, () => loadAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "time_off_requests" }, () => loadAll())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [loadAll]);

  async function approveRequest(req: AdminRequest) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    // Update request
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
    // Grant admin role
    const { error: e2 } = await supabase
      .from("user_roles")
      .insert({ user_id: req.user_id, role: "admin", granted_by: user.id });
    if (e2 && !e2.message.includes("duplicate")) return toast.error(e2.message);
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
    toast.success("Role revoked");
  }

  async function reviewTimeOff(id: string, status: "approved" | "rejected") {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from("time_off_requests")
      .update({ status, reviewed_by: user.id, reviewed_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Time off ${status}`);
  }

  const pendingReqs = requests.filter((r) => r.status === "pending");
  const adminUsers = roles.filter((r) => r.role === "admin" || r.role === "super_admin");
  const pendingTimeOff = timeOff.filter((r) => r.status === "pending");

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-rose-500 shadow-lg shadow-amber-500/30">
            <Crown className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Super Admin Panel</h1>
            <p className="text-sm text-muted-foreground">Master control — approvals, roles, and oversight</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link to="/app/admin">
            <Button variant="outline" size="sm">Admin Panel</Button>
          </Link>
          <Link to="/app">
            <Button variant="outline" size="sm">Dashboard</Button>
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-3 gap-4">
        <StatBox icon={Shield} label="Pending admin requests" value={pendingReqs.length} accent="from-amber-500 to-rose-500" />
        <StatBox icon={Users} label="Active admins" value={adminUsers.length} accent="from-violet-500 to-cyan-400" />
        <StatBox icon={Clock} label="Pending time off" value={pendingTimeOff.length} accent="from-emerald-500 to-teal-500" />
      </div>

      <Tabs defaultValue="requests">
        <TabsList>
          <TabsTrigger value="requests">Admin Requests {pendingReqs.length > 0 && <Badge className="ml-2">{pendingReqs.length}</Badge>}</TabsTrigger>
          <TabsTrigger value="admins">Admins & Roles</TabsTrigger>
          <TabsTrigger value="timeoff">Time Off {pendingTimeOff.length > 0 && <Badge className="ml-2">{pendingTimeOff.length}</Badge>}</TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="mt-4">
          <div className="glass rounded-2xl divide-y divide-white/5">
            {loading && <div className="p-6 text-sm text-muted-foreground">Loading…</div>}
            {!loading && requests.length === 0 && (
              <div className="p-6 text-sm text-muted-foreground">No admin requests yet.</div>
            )}
            {requests.map((r) => (
              <div key={r.id} className="p-4 flex flex-wrap items-start gap-3 justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{r.email ?? r.user_id.slice(0, 8)}</span>
                    <Badge
                      variant={r.status === "pending" ? "default" : r.status === "approved" ? "secondary" : "destructive"}
                    >
                      {r.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleString()}
                    </span>
                  </div>
                  {r.reason && <p className="mt-1 text-sm text-muted-foreground">{r.reason}</p>}
                </div>
                {r.status === "pending" && (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => { setReviewing(r); setReviewNote(""); }}>
                      Review
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="admins" className="mt-4">
          <div className="glass rounded-2xl divide-y divide-white/5">
            {adminUsers.length === 0 && (
              <div className="p-6 text-sm text-muted-foreground">Only you (Super Admin) have elevated access.</div>
            )}
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
          <div className="glass rounded-2xl divide-y divide-white/5">
            {timeOff.length === 0 && (
              <div className="p-6 text-sm text-muted-foreground">No time-off requests.</div>
            )}
            {timeOff.map((r) => (
              <div key={r.id} className="p-4 flex flex-wrap items-start gap-3 justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{r.email ?? r.user_id.slice(0, 8)}</span>
                    <Badge variant={r.status === "pending" ? "default" : r.status === "approved" ? "secondary" : "destructive"}>
                      {r.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {r.start_date} → {r.end_date}
                    </span>
                  </div>
                  {r.reason && <p className="mt-1 text-sm text-muted-foreground">{r.reason}</p>}
                </div>
                {r.status === "pending" && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => reviewTimeOff(r.id, "approved")}>
                      <Check className="h-4 w-4 mr-1" /> Approve
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => reviewTimeOff(r.id, "rejected")}>
                      <X className="h-4 w-4 mr-1" /> Reject
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Review dialog */}
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
              {reviewing.reason && (
                <div className="rounded-lg bg-white/5 p-3 text-sm">{reviewing.reason}</div>
              )}
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
